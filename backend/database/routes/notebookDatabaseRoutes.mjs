import { getWelcomePage } from "../page/welcomePage.mjs";
import { writePageToDatabase } from "../page/serializer.mjs";
import { getUUIDBlob, parseUUIDBlob } from "../uuidBlober.mjs";
import { RequestError } from "../../web/foundation_safe/requestError.js";
import { logDb } from "../../logger.mjs";
import { adaptSqlRowsContentToJs } from "../foundation/adapter.mjs";
import { ALL_FIELDS_PRESENT } from "../../web/foundation_safe/validations.js";

const notebookWelcomePageInsertionsByUser = {};

async function createWelcomePageThreadSafe(db, notebookId, userId) {
    const key = `${userId}-${notebookId}`;
    if (notebookWelcomePageInsertionsByUser[key]) {
        return await notebookWelcomePageInsertionsByUser[key];
    }

    const insertionPromise = new Promise(async (resolve, reject) => {
        try {
            const { metadata, structure, content } = getWelcomePage(
                userId,
                notebookId,
            );
            logDb("Inserting welcome page into database");
            await writePageToDatabase(db, metadata, structure, content);
            let newWelcomePageResult = await db.get(
                db.getQueryOrThrow("notebook.get_default_page"),
                [getUUIDBlob(notebookId)],
            );
            logDb("Inserted welcome page", newWelcomePageResult);

            delete notebookWelcomePageInsertionsByUser[key];
            resolve(newWelcomePageResult);
        } catch (error) {
            delete notebookWelcomePageInsertionsByUser[key];
            reject(error);
        }
    });
    notebookWelcomePageInsertionsByUser[key] = insertionPromise;
    return await insertionPromise;
}
export default function notebookDatabaseRoutes(addEndpoint) {
    addEndpoint("get_default_user_notebook", async (db, message, response) => {
        let result = await db.get(
            db.getQueryOrThrow("notebook.get_default_notebook"),
            [getUUIDBlob(message.userId)],
        );
        return {
            notebook_id: parseUUIDBlob(result.NotebookID),
            name: result.Name,
            // owner_user_id: parseUUIDBlob(result.OwnerUserID),
        };
    });

    addEndpoint("get_default_page", async (db, message, response) => {
        //Check the player has access to the notebook
        await db.get(
            db.getQueryOrThrow("notebook.get_accessible_notebook_name"),
            [getUUIDBlob(message.notebookId), getUUIDBlob(message.userId)],
        );

        let result = await db.get(
            db.getQueryOrThrow("notebook.get_default_page"),
            [getUUIDBlob(message.notebookId)],
        );

        //If result is undefined, we need to insert the welcome page
        if (!result) {
            result = await createWelcomePageThreadSafe(
                db,
                message.notebookId,
                message.userId,
            );
            if (!result) {
                throw new Error(
                    "Failed to create default welcome page after a default page could not be located",
                );
            }
        }

        return {
            page_id: parseUUIDBlob(result.PageID),
            notebook_id: parseUUIDBlob(result.NotebookID),
            title: result.Title,
            content: result.Content,
        };
    });

    addEndpoint(
        "notebook/get_accessible_notebook_name",
        async (db, message, response) => {
            let result = await db.get(
                db.getQueryOrThrow("notebook.get_accessible_notebook_name"),
                [getUUIDBlob(message.notebookId), getUUIDBlob(message.userId)],
            );
            if (!result) {
                throw new RequestError(
                    "User does not have access to the notebook, or it does not exist.",
                );
            }
            return {
                name: result.Name,
            };
        },
    );

    //This must be called after verifying user access to the notebook,
    //Since this is expected to return a value always (by the active element system)
    addEndpoint(
        "notebook/get_notebook_pages",
        async (db, message, response) => {
            const pages = await db.all(
                db.getQueryOrThrow("notebook.get_all_pages_in_notebook"),
                [getUUIDBlob(message.notebookId)],
            );

            adaptSqlRowsContentToJs(pages);

            return pages;
        },
    );

    addEndpoint(
        "notebook/update_page_structure",
        async (db, message, response) => {
            const pageStructure = message.pageStructure;

            db.asTransaction(async () => {
                for (const pageId in pageStructure) {
                    const pageData = pageStructure[pageId];
                    ALL_FIELDS_PRESENT.test({
                        pageId: pageData.pageId,
                        order: pageData.order,
                    }).throwRequestErrorIfInvalid();
                    await db.run(
                        db.getQueryOrThrow(
                            "notebook.update_page_file_tree_position",
                        ),
                        [
                            pageData.parent
                                ? getUUIDBlob(pageData.parent)
                                : null,
                            pageData.order,
                            getUUIDBlob(pageData.pageId),
                        ],
                    );
                }
            });
        },
    );

    addEndpoint(
        "notebook/get_user_notebooks",
        async (db, message, response) => {
            const notebooks = await db.all(
                db.getQueryOrThrow("notebook.get_user_notebooks"),
                [getUUIDBlob(message.userId)],
            );

            adaptSqlRowsContentToJs(notebooks);

            return notebooks;
        },
    );
}
