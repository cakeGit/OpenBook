import { alertStyle, logDb, logDbWithWarningBlinker } from "../../logger.mjs";
import {
    generateRandomUUID,
    getUUIDBlob,
    parseUUIDBlob,
} from "../uuidBlober.mjs";

function logForOvertimeSeverity(durationMs, ...messageParts) {
    const OVERTIME_THRESHOLD_MS = 300; //If it takes longer than 300ms, log with awesome warning blinker
    if (durationMs > OVERTIME_THRESHOLD_MS) {
        logDbWithWarningBlinker(alertStyle("Overtime alert!"), ...messageParts);
    } else {
        logDb(...messageParts);
    }
}

function jsToSqlName(str) {
    if (str === "order") {
        return "OrderIndex";
    }
    if (str.endsWith("Id")) {
        str = str.slice(0, -2) + "ID";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function replaceIdsInStructureRecursive(idConversionMap, children) {
    for (const index in children) {
        const child = children[index];
        const oldBlockId = child.blockId;
        const newBlockId = idConversionMap[oldBlockId];
        if (!newBlockId) {
            delete children[index];
            logDb("Removed child with missing block ID:", oldBlockId);
            continue;
        }
        if (child.children) {
            replaceIdsInStructureRecursive(idConversionMap, child.children);
        }
        child.blockId = newBlockId;
    }
}

function shuffleBlockIds(
    sourceStructure,
    sourceContent,
    sourceFlashcardLinkIds,
) {
    const oldToNewIdMap = {};

    const newStructure = structuredClone(sourceStructure);
    const newBlocks = {};

    for (const oldBlockId in sourceContent) {
        const newBlockId = generateRandomUUID();
        oldToNewIdMap[oldBlockId] = newBlockId;
        newBlocks[newBlockId] = structuredClone(sourceContent[oldBlockId]);
    }

    replaceIdsInStructureRecursive(oldToNewIdMap, newStructure.children);

    const flashcardLinkIds = {};
    for (const oldBlockId in sourceFlashcardLinkIds) {
        const newBlockId = oldToNewIdMap[oldBlockId];
        if (newBlockId) {
            flashcardLinkIds[newBlockId] =
                sourceFlashcardLinkIds[oldBlockId] || generateRandomUUID();
        }
    }

    return {
        structure: newStructure,
        content: newBlocks,
        flashcardLinkIds: flashcardLinkIds,
    };
}

function walkStructureForParentsAndOrder(
    structureNode,
    blockParentIdMap,
    blockOrderMap,
) {
    if (structureNode.blockId) {
        for (const child of structureNode.children || []) {
            blockParentIdMap[child.blockId] = structureNode.blockId;
        }
    }

    let orderIndex = 0;
    for (const child of structureNode.children || []) {
        blockOrderMap[child.blockId] = orderIndex++;
        walkStructureForParentsAndOrder(child, blockParentIdMap, blockOrderMap);
    }
}

//The content's block flashcardLinkId property must be ignored
//Only known safe flashcard link ids can be used,
//New flashcards need ids created
function enforceFlashcardLinkIds(content, flashcardLinkIds) {
    for (const blockId in content) {
        const block = content[blockId];
        if (block.type === "flashcard") {
            const knownLinkId = flashcardLinkIds[blockId];
            if (knownLinkId != null) {
                //Ensure it cant be reused to try duplicate the link ID
                delete flashcardLinkIds[blockId];
                block.flashcardLinkId = knownLinkId;
            } else {
                const newLinkId = generateRandomUUID();
                block.flashcardLinkId = newLinkId;
            }
        }
    }
}

export async function writePageToDatabase(
    db,
    pageMeta,
    sourceStructure,
    sourceContent,
) {
    const startTime = performance.now();
    logDb("Writing page", pageMeta.pageId, "to database");

    //This is somewhat odd, but to avoid the client sending specific block IDs that collide in the database,
    //We can shuffle the block IDs here to new ones, that we know are valid and wont corrupt the database
    //However, we need to keep track of flashcard link IDs, so we fetch existing ones here, and adapt them to the new block IDs
    let sourceFlashcardLinkIds = await getExistingFlashcardLinkIdMapOfPage(
        db,
        pageMeta.pageId,
    );
    let { structure, content, flashcardLinkIds } = shuffleBlockIds(
        sourceStructure,
        sourceContent,
        sourceFlashcardLinkIds,
    );

    enforceFlashcardLinkIds(content, flashcardLinkIds);

    const blockParentIdMap = {};
    const blockOrderMap = {};

    walkStructureForParentsAndOrder(structure, blockParentIdMap, blockOrderMap);

    // Start a transaction, this prevents constant writes with every incremental change,
    // This also allows rollbacks when neccassary
    const transactionStartTime = performance.now();
    await db.asTransaction(async () => {
        //Delete all existing blocks in this page
        await performDatabaseWrite(
            db,
            pageMeta,
            content,
            blockParentIdMap,
            blockOrderMap,
        );
        const commitStartTime = performance.now();
        const now = performance.now();
        logForOvertimeSeverity(
            now - startTime,
            "Finished writing page",
            pageMeta.pageId,
            "in",
            now - startTime,
            "ms",
            "(DB write time",
            now - transactionStartTime,
            "ms of which",
            now - commitStartTime,
            "ms was commit)",
        );
    });
}

function convertToSQLParams(inputData) {
    const taggedResult = {};

    for (const key in inputData) {
        taggedResult["$" + jsToSqlName(key)] = inputData[key];
    }

    return taggedResult;
}

function getParametersOfBlockForWrite(
    blockData,
    blockId,
    parentBlockId,
    pageMeta,
    blockOrderMap,
) {
    return convertToSQLParams({
        ...blockData,
        //Conversion for documentData field in DrawingCanvasBlocks so it can be stored as a BLOB
        documentData:
            blockData.type === "drawing_canvas"
                ? blockData.documentData
                    ? Buffer.from(blockData.documentData, 'base64')
                    : null
                : undefined,
        //Flashcard link info
        flashcardLinkId: blockData.flashcardLinkId
            ? getUUIDBlob(blockData.flashcardLinkId)
            : null,
        blockId: getUUIDBlob(blockId),
        parentBlockId: parentBlockId ? getUUIDBlob(parentBlockId) : null,
        pageId: getUUIDBlob(pageMeta.pageId),
        order: blockOrderMap[blockId] || 0,
        type: blockData.type,
    });
}

async function getExistingFlashcardLinkIdMapOfPage(db, pageId) {
    //A static way is needed to link flashcards to blocks, (since block IDs change on every write)
    //Here we fetch all existing flashcard link IDs in the page, so we can reuse them
    const rows = await db.all(
        db.getQueryOrThrow("flashcards.get_flashcard_link_ids_in_page"),
        [getUUIDBlob(pageId)],
    );
    const idMap = {};
    for (const row of rows) {
        idMap[parseUUIDBlob(row.BlockID)] = parseUUIDBlob(row.FlashcardLinkID);
    }

    return idMap;
}

async function performDatabaseWrite(
    db,
    pageMeta,
    content,
    blockParentIdMap,
    blockOrderMap,
) {
    await db.runMultiple(db.getQueryOrThrow("page.delete_blocks_in_page"), {
        $pageId: getUUIDBlob(pageMeta.pageId),
    });

    //Insert page root data
    await writePageMetadata(db, pageMeta);

    //Insert each block
    for (const blockId in content) {
        const blockData = content[blockId];

        const parentBlockId = blockParentIdMap[blockId] || null;

        const inputParams = getParametersOfBlockForWrite(
            blockData,
            blockId,
            parentBlockId,
            pageMeta,
            blockOrderMap,
        );

        await db.runMultiple(
            db.getQueryOrThrow("page.insert_block"),
            inputParams,
        );
    }
}

async function writePageMetadata(db, pageMeta) {
    await db.run(db.getQueryOrThrow("page.insert_page"), [
        getUUIDBlob(pageMeta.pageId),
        pageMeta.name,
        // getUUIDBlob(pageMeta.ownerUserId),
        getUUIDBlob(pageMeta.notebookId),
    ]);
}
