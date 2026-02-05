import { cloneContentSafe, mergeContentSafe } from "./mutablePage.js";

//Base class of the various page operations
export class PageOperation {
    constructor() {}

    //Dummy methods to be overridden by subclasses
    //It is expected that: apply is called first,
    // and that revert and apply can be called unlimited times after that
    apply(page) {}
    revert(page) {}
}

export class NewBlockOperation extends PageOperation {
    constructor(adjacentBlockId, newBlockId, blockData, direction = "after") {
        super();
        this.adjacentBlockId = adjacentBlockId;
        this.newBlockId = newBlockId;
        this.blockData = blockData;
        this.direction = direction;
    }

    apply(page) {
        page._addBlock(
            this.adjacentBlockId,
            this.newBlockId,
            this.blockData,
            this.direction,
        );
        page.triggerStructureRerender?.();
    }

    revert(page) {
        page._deleteBlock(this.newBlockId);
        page.triggerStructureRerender?.();
    }
}

export class EditBlockOperation extends PageOperation {
    constructor(blockId, newData) {
        super();
        this.timestamp = Date.now();
        this.blockId = blockId;
        this.newData = newData;
        this.oldData = null;
    }

    apply(page) {
        this.oldData = cloneContentSafe(page.content[this.blockId]);
        page.content[this.blockId] = mergeContentSafe(
            page.content[this.blockId],
            this.newData,
        );
    }

    revert(page) {
        page.content[this.blockId] = mergeContentSafe(
            page.content[this.blockId],
            this.oldData,
        );
    }
}

export class DeleteBlockOperation extends PageOperation {
    constructor(blockId) {
        super();
        this.blockId = blockId;
        this.deletedSegmentData = null;
    }

    apply(page) {
        this.deletedSegmentData = page._getSegment(this.blockId);
        page._deleteBlock(this.blockId);
        page.triggerStructureRerender?.();
    }

    revert(page) {
        if (this.deletedSegmentData) {
            const { segment, parentBlockId, index } = this.deletedSegmentData;
            page._placeSegment(segment, parentBlockId, index);
        }
        page.triggerStructureRerender?.();
    }
}

export class CloneBlockOperation extends PageOperation {
    constructor(sourceBlockId) {
        super();
        this.sourceBlockId = sourceBlockId;
        this.segmentData = null;
    }

    apply(page) {
        this.segmentData = page._getSegment(this.sourceBlockId, true);
        if (this.segmentData) {
            const { segment, parentBlockId, index } = this.segmentData;
            page._placeSegment(segment, parentBlockId, index);
        }
        page.triggerStructureRerender?.();
    }

    revert(page) {
        if (this.segmentData) {
            page._deleteBlock(this.segmentData.segment.blockId);
        }
        page.triggerStructureRerender?.();
    }
}

export class StructureChangeOperation extends PageOperation {
    constructor(newStructure) {
        super();
        this.newStructure = newStructure;
        this.oldStructure = null;
    }

    apply(page) {
        this.oldStructure = page.structure;
        page.structure = this.newStructure;
        page.triggerStructureRerender?.();
    }

    revert(page) {
        page.structure = this.oldStructure;
        page.triggerStructureRerender?.();
    }
}

const operationTypes = {
    NewBlockOperation: NewBlockOperation,
    EditBlockOperation: EditBlockOperation,
    DeleteBlockOperation: DeleteBlockOperation,
    CloneBlockOperation: CloneBlockOperation,
    StructureChangeOperation: StructureChangeOperation,
};

export function serializeOperation(operation) {
    return {
        type: operation.constructor.name,
        data: { ...operation },
    };
}

export function deserializeOperation(serialized) {
    const OperationClass = operationTypes[serialized.type];
    if (!OperationClass) {
        throw new Error(`Unknown operation type: ${serialized.type}`);
    }
    let operation = new OperationClass();
    //Manually copy fields, rather than using constructor since constructor varies
    Object.assign(operation, serialized.data);
    return operation;
}
