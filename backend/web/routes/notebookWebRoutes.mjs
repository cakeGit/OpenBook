import { getOrThrowAuthorizedUserUUIDOfRequest } from "../foundation/webAuth.mjs";
import { ALL_FIELDS_PRESENT } from "../foundation_safe/validations.js";
import { dbInterface } from "../webDbInterface.mjs";

export default function notebookWebRoutes(apiRouter) {
    apiRouter.for("/notebook/get_default_notebook", async (req) => {
        //Get the default notebook for this user
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        return await dbInterface.sendRequest("get_default_user_notebook", {
            userId: userId,
        });
    });

    apiRouter.for("/notebook/get_default_page", async (req) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        //Get the default page for a given notebook
        let notebookId = req.body?.notebook_id;
        ALL_FIELDS_PRESENT.test({ notebookId }).throwRequestErrorIfInvalid();

        return await dbInterface.sendRequest("get_default_page", {
            notebookId,
            userId,
        });
    });

    apiRouter.for("/notebook/get_accessible_notebook_name", async (req) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        let notebookId = req.body?.notebook_id;
        ALL_FIELDS_PRESENT.test({ notebookId }).throwRequestErrorIfInvalid();
        return await dbInterface.sendRequest(
            "notebook/get_accessible_notebook_name",
            { notebookId, userId },
        );
    });

    apiRouter.for("/notebook/get_user_notebooks", async (req) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        return {
            notebooks: await dbInterface.sendRequest(
                "notebook/get_user_notebooks",
                { userId },
            ),
        };
    });
}
