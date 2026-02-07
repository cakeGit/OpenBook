import { generateRandomUUID } from "../../../database/uuidBlober.mjs";
import { EditBlockOperation } from "./pageOperations.js";

//Ensure that we do not clone over refs or setData functions
// gives back a clean object of the actual content data
export function cloneContentSafe(content) {
    //Get the content without the refs or setData functions
    const safeContent = {};
    for (const key in content) {
        if (key == "ref" || key == "setData") {
            continue;
        }
        safeContent[key] = structuredClone(content[key]);
    }
    return safeContent;
}

//Ensure that we preserve refs and setData functions when merging content, for the client
// for the client, newContent is clean and just content data and oldContent has the refs/setData we need
export function mergeContentSafe(oldContent, newContent) {
    newContent = structuredClone(newContent); //Prevent modifying input object
    if (oldContent && (oldContent.ref || oldContent.setData)) {
        newContent.ref = oldContent.ref;
        newContent.setData = oldContent.setData;
        newContent.setData(newContent); //Update setData with new content
    }
    return newContent;
}

export class MutablePage {
    constructor(
        structure,
        content,
        trackHistory = false,
        logger = console.log,
    ) {
        this.structure = structure;
        this.content = content;
        this.trackHistory = trackHistory;
        this.historyStack = [];
        this.redoStack = [];
        this.logger = logger;
    }

    applyFullSync(newStructure, newContent) {
        if (this.trackHistory) {
            this.logger("Warning: Full sync is incompatible with history tracking!");
            this.historyStack = [];
        }

        this.structure = newStructure;
        this.content = newContent;
    }

    //Perform an operation from the pageOperations.js module
    performOperation(operation) {
        operation.apply(this);
        if (this.trackHistory) {
            //We can combine edit operations of the same block, we set a maximum merge time of 1 second
            //Edit block operations now have a timestamp property for this purpose
            if (operation instanceof EditBlockOperation) {
                if (this.historyStack[this.historyStack.length - 1] instanceof EditBlockOperation &&
                    this.historyStack[this.historyStack.length - 1].blockId === operation.blockId &&
                    (operation.timestamp - this.historyStack[this.historyStack.length - 1].timestamp) < 1000) {
                    //Merge with last operation
                    this.historyStack[this.historyStack.length - 1].newData = operation.newData;
                    return;
                }
            }

            this.historyStack.push(operation);
            //if there is more than 50 operations in history, remove the oldest
            if (this.historyStack.length > 50) {
                this.historyStack.shift();
            }
            this.redoStack = []; //Clear redo stack on new a new operation being performed
        }
    }

    undoLastOperation() {
        if (this.trackHistory && this.historyStack.length > 0) {
            const lastOperation = this.historyStack.pop();
            lastOperation.revert(this);
            this.redoStack.push(lastOperation); //Allow the user to redo this operation
            return lastOperation;
        }
        return null;
    }

    redoLastOperation() {
        if (this.trackHistory && this.redoStack.length > 0) {
            const lastUndoneOperation = this.redoStack.pop();
            lastUndoneOperation.apply(this);
            this.historyStack.push(lastUndoneOperation);
            return lastUndoneOperation;
        }
        this.logger("No operation to redo");
        return null;
    }

    //Get a copy of a block and its children from the structure and content
    _getSegment(blockId, shuffleIds = false) {
        //Find the structure node
        let { node, parent, index } = this._findInStructure(blockId) || {};

        if (!node || !parent || index === undefined) {
            this.logger(
                "Warning: Block ID not found in structure for getSegment:",
                blockId,
            );
            return null;
        }

        // Build the segment object
        const buildSegment = (structureNode) => {
            const segment = {
                blockId: shuffleIds
                    ? globalThis.crypto.randomUUID()
                    : structureNode.blockId,
                content: cloneContentSafe(this.content[structureNode.blockId]),
                children: [],
            };

            if (structureNode.children) {
                for (const child of structureNode.children) {
                    segment.children.push(buildSegment(child));
                }
            }

            return segment;
        };

        return {
            segment: buildSegment(node),
            parentBlockId: parent.blockId,
            index,
        };
    }

    _placeSegment(segment, parentBlockId, index) {
        segment = structuredClone(segment); //Prevent modifying input object

        //Place content
        const placeContentRecursively = (segmentNode) => {
            this.content[segmentNode.blockId] = mergeContentSafe(
                this.content[segmentNode.blockId],
                segmentNode.content,
            );
            if (segmentNode.children) {
                for (const child of segmentNode.children) {
                    placeContentRecursively(child);
                }
            }
            delete segmentNode.content; //Remove content since it doesent go in structure
        };

        placeContentRecursively(segment);

        //Place structure
        let { node } = this._findInStructure(parentBlockId) || {};
        if (!node) {
            //Parent is root
            node = this.structure;
        }
        if (!node.children) {
            node.children = [];
        }
        node.children.splice(index, 0, structuredClone(segment));
    }

    _findAndPerform(targetBlockId, callback, currentNode = this.structure) {
        if (!currentNode.children) {
            return false;
        }
        for (let i = 0; i < currentNode.children.length; i++) {
            const child = currentNode.children[i];
            if (child.blockId === targetBlockId) {
                callback(currentNode.children, i, currentNode.blockId);
                return true;
            }
            if (this._findAndPerform(targetBlockId, callback, child)) {
                return true;
            }
        }
        return false;
    }

    _findInStructure(targetBlockId, currentNode = this.structure) {
        if (!currentNode.children) {
            return null;
        }

        for (let i = 0; i < currentNode.children.length; i++) {
            const child = currentNode.children[i];
            if (child.blockId === targetBlockId) {
                return { node: child, parent: currentNode, index: i };
            }
            const result = this._findInStructure(targetBlockId, child);
            if (result) {
                return result;
            }
        }
        return null;
    }

    _addBlock(adjacentBlockId, newBlockId, blockData, direction = "after") {
        this.content[newBlockId] = blockData;
        this._insertBlock(adjacentBlockId, newBlockId, direction);
    }

    _insertBlock(adjacentBlockId, newBlockId, direction = "after") {
        if (!adjacentBlockId) {
            //Insert at start
            if (!this.structure.children) {
                this.structure.children = [];
            }
            this.structure.children.unshift({ blockId: newBlockId });
            return;
        }

        this._findAndPerform(
            adjacentBlockId,
            (children, index, parentBlockId) => {
                if (direction === "after") {
                    children.splice(index + 1, 0, { blockId: newBlockId });
                } else if (direction === "inside") {
                    if (!children[index].children) {
                        children[index].children = [];
                    }
                    children[index].children.push({ blockId: newBlockId });
                }
            },
        );
    }

    _insertBlockAfter(adjacentBlockId, newBlockId) {
        this._insertBlock(adjacentBlockId, newBlockId, "after");
    }

    _deleteBlock(blockId) {
        const blockIdsToRemove = [];

        const scrapeChildIdsRecursive = (node) => {
            blockIdsToRemove.push(node.blockId);
            if (node.children) {
                for (const child of node.children) {
                    scrapeChildIdsRecursive(child);
                }
            }
        }

        this._findAndPerform(blockId, (children, index, parentBlockId) => {
            scrapeChildIdsRecursive(children[index]);
            children.splice(index, 1);
        });

        for (const id of blockIdsToRemove) {
            delete this.content[id];
        }
    }

    _moveBlock(blockId, targetBlockId, direction = "after") {
        let blockNode = null;
        this._findAndPerform(blockId, (children, index, parentBlockId) => {
            blockNode = children.splice(index, 1)[0];
        });

        if (!blockNode) {
            this.logger("Warning: Block ID not found for moveBlock:", blockId);
            return;
        }

        if (!targetBlockId) {
            if (!this.structure.children) {
                this.structure.children = [];
            }
            this.structure.children.unshift(blockNode);
            return;
        }

        this._findAndPerform(
            targetBlockId,
            (children, index, parentBlockId) => {
                if (direction === "after") {
                    children.splice(index + 1, 0, blockNode);
                } else if (direction === "inside") {
                    if (!children[index].children) {
                        children[index].children = [];
                    }
                    children[index].children.push(blockNode);
                }
            },
        );
    }

    getAllBlockIds() {
        const blockIds = new Set();

        const walkStructure = (node) => {
            if (node.blockId) {
                blockIds.add(node.blockId);
            }
            if (node.children) {
                node.children.forEach(walkStructure);
            }
        };

        walkStructure(this.structure);
        return blockIds;
    }

    getStructureChildren(blockId) {
        let result = null;
        const walkTreeForBlockId = (node, blockId) => {
            if (node.blockId === blockId) {
                result = node.children || [];
                return true;
            }
            if (node.children) {
                for (const child of node.children) {
                    if (walkTreeForBlockId(child, blockId)) return true;
                }
            }
            return false;
        };
        walkTreeForBlockId(this.structure, blockId);
        return result || [];
    }

    doesBlockHaveChildren(blockId) {
        const children = this.getStructureChildren(blockId);
        return children.length > 0;
    }
}
