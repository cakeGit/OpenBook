import { logEditor, logWeb } from "../../logger.mjs";
import {
    ALL_FIELDS_PRESENT,
    VALID_PAGE_NAME,
    VALID_RECENT_LAST_EDITED_TIMESTAMP,
} from "../foundation_safe/validations.js";
import { ACTIVE_NOTEBOOK_STRUCTURE_MANAGER } from "../structure_editor/notebookStructureEditorSocket.mjs";

export function handleRequest(activePage, ws, msg) {
    if (msg.type === "block_change") {
        const { blockId, content } = msg;
        const existingBlock = activePage.content[blockId];
        ALL_FIELDS_PRESENT.test({
            blockId,
            content,
            existingBlock,
        }).throwErrorIfInvalid();

        //Update the active page data
        // activePage.content[blockId] = {
        //     ...existingBlock, //Apply existing data
        //     ...content, //And then new data on top
        // };
        activePage.content[blockId] = content;
        activePage.isDirty = true;
        activePage.sendToOtherClientsWithHash(ws, msg);
    } else if (msg.type === "structure_change") {
        const { structure } = msg;
        ALL_FIELDS_PRESENT.test({ structure }).throwErrorIfInvalid();

        activePage.structure = structure;
        activePage.isDirty = true;
        activePage.sendToOtherClientsWithHash(ws, msg);
    } else if (msg.type === "block_deletion") {
        const { blockId } = msg;
        const existingBlock = activePage.content[blockId];
        ALL_FIELDS_PRESENT.test({
            blockId,
            existingBlock,
        }).throwErrorIfInvalid();
        activePage.deleteBlock(blockId);
        activePage.isDirty = true;
        activePage.sendToOtherClientsWithHash(ws, msg);
    } else if (msg.type === "block_addition") {
        const { adjacentBlockId, newBlockId, content, direction } = msg;
        ALL_FIELDS_PRESENT.test({
            // adjacentBlockId, //Can be null for adding at start
            newBlockId,
            content,
        }).throwErrorIfInvalid();
        activePage.content[newBlockId] = content;
        activePage.insertBlock(adjacentBlockId, newBlockId, direction);
        activePage.isDirty = true;
        activePage.sendToOtherClientsWithHash(ws, msg);
    } else if (msg.type === "needs_sync") {
        //Send full structure and content back to editor
        const message = {
            type: "full_sync",
            structure: activePage.structure,
            content: activePage.content,
        };
        activePage.sendWithHash(ws, message);
    } else if (msg.type === "metadata_change") {
        const { metadata } = msg;
        ALL_FIELDS_PRESENT.test({ metadata }).throwErrorIfInvalid();
        const safeProperties = ["name", "lastModifiedTimestamp"];
        const propertyValidators = {
            name: VALID_PAGE_NAME,
            lastModifiedTimestamp: VALID_RECENT_LAST_EDITED_TIMESTAMP,
        };

        const prevName = activePage.metadata.name;

        for (const prop of safeProperties) {
            if (metadata[prop] !== undefined) {
                if (propertyValidators[prop]) {
                    let validation = propertyValidators[prop].test(metadata[prop]);
                    validation.throwRequestErrorIfInvalid();
                }

                activePage.metadata[prop] = metadata[prop];
            }
        }
        activePage.isDirty = true;
        activePage.sendToOtherClientsWithHash(ws, {
            type: "metadata_change",
            metadata: activePage.metadata,
        });

        //If the page name changed, we will need to find active notebook structures and update them
        if (metadata.name && metadata.name !== prevName) {
            ACTIVE_NOTEBOOK_STRUCTURE_MANAGER.forAllActiveElements(
                (activeNotebook, notebookId) => {
                    if (notebookId === activePage.metadata.notebookId) {
                        activeNotebook.updatePageNameInStructure(
                            activePage.metadata.pageId,
                            metadata.name,
                        );
                    }
                },
            );
        }
    } else {
        logEditor("Unknown page server editor message type:", msg.type);
    }
}
