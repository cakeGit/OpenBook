import xxhash from "xxhash-wasm";
import { BLOCK_TYPE_REGISTRY } from "./typeRegistry.mjs";
import { getCleanNetworkBlockData } from "./localPageNetHandler.js";
import { MutablePage } from "../../../backend/web/foundation_safe/page/mutablePage.js";

const hash = await xxhash();

export class LocalPage extends MutablePage {
    constructor(structureJSON, contentJSON) {
        super(structureJSON, contentJSON);
        this.primaryContainerRef = null;
        this.subcontainers = [];
        this.triggerStructureRerender = null;
        this.linkedNetHandler = null;
    }

    performAndSendOperation(operation) {
        this.performOperation(operation);
        this.checkForNetAndRun(() =>
            this.linkedNetHandler.sendOperation(operation)
        );
    }

    requestHistoryAction(action) {
        this.checkForNetAndRun(() =>
            this.linkedNetHandler.sendHistoryRequest(action)
        );
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

    checkForParentChildSortingUpdate(blockId) {
        //Find the parent (if exists), to avoid using the protected (_) findAndPerform, mutable page has a new method
        const parentBlockId = this.getParentBlockIdOfBlock(blockId);

        //Get the type of the block changed, and look for if a childSorting
        const blockType = BLOCK_TYPE_REGISTRY[this.content[parentBlockId]?.type];
        const childSorting = blockType?.childSorting;
        if (childSorting) {
            //Can now just call triggerRerenderChildren (maintaining the same ?)
            this.content[parentBlockId]?.triggerRerenderChildren();
        }
    }

    onChange(blockId) {
        this.checkForParentChildSortingUpdate(blockId);
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
        const newBlockId = globalThis.crypto.randomUUID();
        this._addBlock(parentBlockId, newBlockId, { type: blockType, ...initialData }, "inside");
        this.sendNewBlock(parentBlockId, newBlockId, "inside");
        this.triggerStructureRerender();
        return newBlockId;
    }   

    createNewBlock(blockType, blockIdBelow, initialData = {}) {
        const newBlockId = globalThis.crypto.randomUUID();
        this._addBlock(blockIdBelow, newBlockId, { type: blockType, ...initialData });

        this.sendNewBlock(blockIdBelow, newBlockId);
        this.triggerStructureRerender();
        return newBlockId;
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
