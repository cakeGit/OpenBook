import xxhash from "xxhash-wasm";
import { BLOCK_TYPE_REGISTRY } from "./typeRegistry.mjs";
import { getCleanNetworkBlockData } from "./localActivePage";

function generateRandomUUID() {
    return crypto.randomUUID();
}

const hash = await xxhash();

export class Page {
    constructor(structureJSON, contentJSON) {
        this.structure = structureJSON;
        this.content = contentJSON;
        this.primaryContainerRef = null;
        this.subcontainers = [];
        this.triggerStructureRerender = null;
        this.linkedNetHandler = null;
    }

    removeSubcontainer(refToRemove) {
        this.subcontainers = this.subcontainers.filter(
            (container) => container.ref !== refToRemove
        );
    }

    checkForNetAndRun(runnable) {
        if (!this.linkedNetHandler) {
            //Warning to alert if the handler failed to load or is still loading while the user was able to make changes.
            //Has not occured in normal development, but remains as a safeguard.
            console.warn("No linkedNetHandler to send changes, dropping");
            return;
        }
        runnable();
    }

    sendChange(blockId) {
        this.checkForNetAndRun(() =>
            this.linkedNetHandler.sendBlockChange(
                blockId,
                this.content[blockId]
            )
        );
    }

    sendStructureChange(newStructure) {
        this.checkForNetAndRun(() =>
            this.linkedNetHandler.sendStructureChange(newStructure)
        );
    }

    sendDeleted(blockId) {
        this.checkForNetAndRun(() =>
            this.linkedNetHandler.sendBlockDeletion(blockId)
        );
    }

    sendNewBlock(adjacentBlockId, newBlockId, direction = "after") {
        this.checkForNetAndRun(() =>
            this.linkedNetHandler.sendNewBlock(
                adjacentBlockId,
                newBlockId,
                this.content[newBlockId],
                direction
            )
        );
    }

    createNewBlockInside(blockType, parentBlockId, initialData = {}) {
        const newBlockId = generateRandomUUID();
        this.content[newBlockId] = { type: blockType, ...initialData };
        this.insertBlock(parentBlockId, newBlockId, "inside");
        this.sendNewBlock(parentBlockId, newBlockId, "inside");
        this.triggerStructureRerender();
        return newBlockId;
    }   

    createNewBlock(blockType, blockIdBelow, initialData = {}) {
        const newBlockId = generateRandomUUID();
        this.content[newBlockId] = { type: blockType, ...initialData };

        this.insertBlock(blockIdBelow, newBlockId);
        this.sendNewBlock(blockIdBelow, newBlockId);
        this.triggerStructureRerender();
        return newBlockId;
    }

    insertBlock(adjacentBlockId, newBlockId, direction = "after") {
        if (!adjacentBlockId) {
            //Insert at start
            this.structure.children.unshift({ blockId: newBlockId });
            return;
        }
        this.findAndPerform(adjacentBlockId, (children, index) => {
            if (direction === "after") {
                children.splice(index + 1, 0, { blockId: newBlockId });
            } else if (direction === "inside") {
                if (!children[index].children) {
                    children[index].children = [];
                }
                children[index].children.push({ blockId: newBlockId });
            }
        });
    }

    addTargetableSubcomponentContainer(subcontainer) {
        // Avoid duplicates by checking if this ref is already registered
        const existingIndex = this.subcontainers.findIndex(
            (container) => container.ref === subcontainer.ref
        );

        if (existingIndex === -1) {
            this.subcontainers.push(subcontainer);
        } else {
            // Update existing entry
            this.subcontainers[existingIndex] = subcontainer;
        }
    }

    revalidateSubcontainers() {
        const validContainers = [];
        const seenRefs = new Set();

        // Get all valid blockIds from the current structure
        const validBlockIds = this.getAllBlockIds();

        this.subcontainers.forEach((container) => {
            // Keep only containers with valid refs, no duplicates, and valid blockIds
            if (
                container.ref &&
                container.ref.current &&
                !seenRefs.has(container.ref.current) &&
                validBlockIds.has(container.blockId)
            ) {
                validContainers.push(container);
                seenRefs.add(container.ref.current);
            }
        });

        this.subcontainers = validContainers;
    }

    getAllBlockIds() {
        const blockIds = new Set();

        function walkStructure(node) {
            if (node.blockId) {
                blockIds.add(node.blockId);
            }
            if (node.children) {
                node.children.forEach(walkStructure);
            }
        }

        walkStructure(this.structure);
        return blockIds;
    }

    //Performs a tree walk to find the children of a blockId.
    getStructureChildren(blockId) {
        function walkTreeForBlockId(node, blockId) {
            if (node.blockId === blockId) return node.children || [];
            if (node.children) {
                for (const child of node.children) {
                    const result = walkTreeForBlockId(child, blockId);
                    if (result) return result;
                }
            }
            return null;
        }
        return walkTreeForBlockId(this.structure, blockId) || [];
    }

    deleteBlock(blockId) {
        delete this.content[blockId];
        function walkAndDelete(node, blockId) {
            if (!node.children) return;

            const index = node.children.findIndex(
                (child) => child.blockId === blockId
            );

            if (index !== -1) {
                node.children.splice(index, 1);
                return;
            }

            for (const child of node.children) {
                if (walkAndDelete(child, blockId)) {
                    return;
                }
            }
            return;
        }

        walkAndDelete(this.structure, blockId);
    }

    /**
     * The primary container is always included, where the containing blockId is undefined.
     * @returns List in the form {element: HTMLElement, blockId: string (undefined for primary container)}
     */
    getTargetableContainers(blockId) {
        this.revalidateSubcontainers();

        //Get current block container type
        const currentBlockContainerType = blockId ? BLOCK_TYPE_REGISTRY[this.content[blockId]?.type]?.containerType : undefined;

        const containers = [
            ...this.subcontainers
                .filter((c) => c.canTarget())
                .filter((c) => currentBlockContainerType === undefined || c.containerType === currentBlockContainerType)
                .map((c) => ({ element: c.ref.current, blockId: c.blockId })),
        ];

        //Add the root ONLY if it matches the container type
        if (currentBlockContainerType === undefined) {
            containers.push({ element: this.primaryContainerRef.current, blockId: undefined });
        }

        return containers;
    }

    findAndPerform(targetBlockId, performer, currentNode = this.structure) {
        if (!currentNode.children) {
            return;
        }
        for (let i = 0; i < currentNode.children.length; i++) {
            const child = currentNode.children[i];
            if (child.blockId === targetBlockId) {
                performer(currentNode.children, i);
                return;
            }
            this.findAndPerform(targetBlockId, performer, child);
        }
    }

    getLocalHash() {
        const contentForHash = {};
        for (const blockId in this.content) {
            contentForHash[blockId] = getCleanNetworkBlockData(this.content[blockId])
        }
        const contentString = JSON.stringify(contentForHash);
        const structureString = JSON.stringify(this.structure);
        const hashValue = hash.h32(contentString + structureString);
        return hashValue;
    }

}
