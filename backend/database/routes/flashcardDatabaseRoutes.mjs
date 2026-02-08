import { ALL_FIELDS_PRESENT } from "../../web/foundation_safe/validations.js";
import { adaptJsObjectToSql, adaptSqlRowsContentToJs } from "../foundation/adapter.mjs";
import { getUUIDBlob } from "../uuidBlober.mjs";

export default function flashcardDatabaseRoutes(addEndpoint) {
    //The user needs a way to get all the pages they can use for their flashcards
    //This returns a flat list, but the web server will turn it into a tree structure
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

    //When we are loading a session, we want to get all the information of flashcards in a specific page
    //This may get called many time by the web server if multiple pages are selected
    //This requires the targeted page (to get flashcards) and the user (to get learning history)
    addEndpoint(
        "flashcards/get_flashcards_information_of_page", async (db, message, response) => {
            let pageId = message.pageId;
            let userId = message.userId;
            ALL_FIELDS_PRESENT.test({
                pageId,
                userId
            }).throwErrorIfInvalid();
            const getContent = {pageId, userId};
            const flashcards = await db.all(
                db.getQueryOrThrow("flashcards.get_flashcards_information_of_page"),
                adaptJsObjectToSql(getContent),
            );
            adaptSqlRowsContentToJs(flashcards);
            return flashcards;
        }
    );

    //This is the handling for the flashcard learning data updates, this is pretty much straight from the web server
    //This is because the database worker can handle this in a batch, rather than many separate small writes
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

            //Each update is an array of learning results, each result is a 2 bit value
            //We pack this array into each 2 bit segment of the learning history byte in reverse order,
            //so that the most recent result (the end of the array) is in the lowest 2 bits.
            let learningHistory = 0;
            for (let i = 0; i < update.length; i++) {
                learningHistory = (learningHistory << 2) | (update[i] || 0);
            }

            updates.push(adaptJsObjectToSql({
                learningHistoryShift: update.length * 2, //Number of bits to shift existing history by, 2 bits per entry
                lastLearnedTime: now,
                ownerUserId: userId,
                learningHistory: learningHistory,
                flashcardLinkId,
            }));
        }

        //Once weve prepared all the updates, perform them in a single transaction
        db.asTransaction(async () => {
            for (const update of updates) {
                await db.run(db.getQueryOrThrow("flashcards.update_flashcard_learning_history"), update);
            }
        });
    });
        
}
