import { logDb } from "../../logger.mjs";
import { ALL_FIELDS_PRESENT } from "../../web/foundation_safe/validations.js";
import { adaptJsObjectToSql, adaptSqlRowsContentToJs } from "../foundation/adapter.mjs";
import { getUUIDBlob } from "../uuidBlober.mjs";

export default function notebookDatabaseRoutes(addEndpoint) {
    addEndpoint(
        "flashcards/get_selectable_pages",
        async (db, message, response) => {
            let notebookId = message.notebookId;
            ALL_FIELDS_PRESENT.test({
                notebookId,
            }).throwErrorIfInvalid();
            const pages = await db.all(
                db.getQueryOrThrow("flashcards.get_selectable_pages"),
                [getUUIDBlob(notebookId)],
            );
            adaptSqlRowsContentToJs(pages);
            return pages;
        },
    );

    addEndpoint(
        "flashcards/get_flashcards_information_of_page", async (db, message, response) => {
            let pageId = message.pageId;
            ALL_FIELDS_PRESENT.test({
                pageId,
            }).throwErrorIfInvalid();
            const flashcards = await db.all(
                db.getQueryOrThrow("flashcards.get_flashcards_information_of_page"),
                [getUUIDBlob(pageId)],
            );
            adaptSqlRowsContentToJs(flashcards);
            return flashcards;
        }
    );

    addEndpoint("flashcards/update_flashcard_learning_data", async (db, message, response) => {
        let flashcardLearningUpdates = message.flashcardLearningUpdates;
        let userId = message.userId;
        ALL_FIELDS_PRESENT.test({
            flashcardLearningUpdates,
            userId,
        }).throwErrorIfInvalid();
        //Create a byte for each update, and determine the number of bits to shift existing history by
        const updates = [];
        const now = Date.now();

        for (const flashcardLinkId in flashcardLearningUpdates) {
            let update = flashcardLearningUpdates[flashcardLinkId];
            let learningHistory1 = update[0] || 0;
            let learningHistory2 = update[1] || 0;
            let learningHistory3 = update[2] || 0;
            let learningHistory4 = update[3] || 0;
            updates.push(adaptJsObjectToSql({
                learningHistoryShift: update.length * 2,
                LastLearnedTime: now,
                ownerUserId: userId,
                learningHistory:
                    (learningHistory4 << 6) |
                    (learningHistory3 << 4) |
                    (learningHistory2 << 2) |
                    learningHistory1,
                flashcardLinkId,
            }));
        }

        db.asTransaction(async () => {
            for (const update of updates) {
                // logDb("Updating flashcard learning data:", update);
                await db.run(db.getQueryOrThrow("flashcards.update_flashcard_learning_history"), update);
            }
        });
        return {success: true}
    });
        
}
