import { ALL_FIELDS_PRESENT } from "../../../backend/web/foundation_safe/validations.js";
import {
    NewBlockOperation,
    EditBlockOperation,
    DeleteBlockOperation,
    StructureChangeOperation,
    deserializeOperation,
} from "../../../backend/web/foundation_safe/page/pageOperations.js";
import { mergeContentSafe } from "../../../backend/web/foundation_safe/page/mutablePage.js";

export function handleLocalRequest(page, ws, msg, pageNetHandler) {
    if (msg.type === "block_change") {
        const { blockId, content } = msg;
        const existingBlock = page.content[blockId];
        ALL_FIELDS_PRESENT.test({
            blockId,
            content,
            existingBlock,
        }).throwErrorIfInvalid();

        const newData = mergeContentSafe(existingBlock, content);
        page.performOperation(new EditBlockOperation(blockId, newData));
        page.content[blockId].setData(newData);
    } else if (msg.type === "structure_change") {
        const { structure } = msg;
        ALL_FIELDS_PRESENT.test({ structure }).throwErrorIfInvalid();

        page.performOperation(new StructureChangeOperation(structure));
        page.triggerStructureRerender();
    } else if (msg.type === "block_deletion") {
        const { blockId } = msg;
        const existingBlock = page.content[blockId];
        ALL_FIELDS_PRESENT.test({
            blockId,
            existingBlock,
        }).throwErrorIfInvalid();
        page.performOperation(new DeleteBlockOperation(blockId));
        page.triggerStructureRerender();
    } else if (msg.type === "block_addition") {
        const { adjacentBlockId, newBlockId, content, direction } = msg;
        ALL_FIELDS_PRESENT.test({
            adjacentBlockId, //Can be null for adding at start
            newBlockId,
            content,
        }).throwErrorIfInvalid();
        page.performOperation(
            new NewBlockOperation(
                adjacentBlockId,
                newBlockId,
                content,
                direction,
            ),
        );
        page.triggerStructureRerender();
    } else if (msg.type === "full_sync") {
        const { structure, content } = msg;
        ALL_FIELDS_PRESENT.test({
            structure,
            content,
        }).throwErrorIfInvalid();
        page.applyFullSync(structure, content);
        console.log("Received full sync to local editor");
        page.triggerStructureRerender();
    } else if (msg.type === "initial_page_data") {
        const { metadata, structure, content } = msg;
        ALL_FIELDS_PRESENT.test({
            metadata,
            structure,
            content,
        }).throwErrorIfInvalid();

        pageNetHandler.updateMetadata(metadata);

        page.metadata = metadata;
        page.applyFullSync(structure, content);
        page.triggerStructureRerender();
    } else if (msg.type === "metadata_change") {
        const { metadata } = msg;
        ALL_FIELDS_PRESENT.test({ metadata }).throwErrorIfInvalid();

        pageNetHandler.updateMetadata(metadata);

        page.metadata = {
            ...page.metadata,
            ...metadata,
        };
    } else if (msg.type === "history_action") {
        const { action, operationData } = msg;
        ALL_FIELDS_PRESENT.test({ action }).throwErrorIfInvalid();
        const operation = deserializeOperation(operationData);
        if (action === "undo") {
            operation.revert(page);
        } else if (action === "redo") {
            operation.apply(page);
        } else {
            console.warn("Unknown history action:", action, msg);
            return;
        }
        page.triggerStructureRerender();
    } else if (msg.type === "operation") {
        const { operationData } = msg;
        ALL_FIELDS_PRESENT.test({ operationData }).throwErrorIfInvalid();
        const operation = deserializeOperation(operationData);
        operation.apply(page);
    } else {
        console.warn("Unknown local editor message type:", msg.type, msg);
    }
}
