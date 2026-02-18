import { getOrThrowAuthorizedUserUUIDOfRequest } from "../foundation/webAuth.mjs";
import { ALL_FIELDS_PRESENT } from "../foundation_safe/validations.js";
import { dbInterface } from "../webDbInterface.mjs";

export default function sharingWebRoutes(apiRouter) {
    //Create or update the latest share invite, if the user is not already invited,
    //The database will handle the error if the user already has the invite
    apiRouter.for("/share/share_notebook_with_user", async (req) => {
        let { notebookId, inviteUserLabelName } = req.body;
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        ALL_FIELDS_PRESENT.test({
            notebookId,
            inviteUserLabelName,
            userId,
        }).throwErrorIfInvalid();
        await dbInterface.sendRequest("share/share_notebook_with_user", {
            notebookId,
            inviteUserLabelName,
            userId,
        });
    });

    apiRouter.for("/share/revoke_notebook_share", async (req) => {
        let { notebookId, revokeUserId } = req.body;
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        ALL_FIELDS_PRESENT.test({
            notebookId,
            revokeUserId,
            userId,
        }).throwErrorIfInvalid();
        await dbInterface.sendRequest("share/revoke_notebook_share", {
            notebookId,
            revokeUserId,
            userId,
        });
    });

    apiRouter.for("/share/accept_notebook_invite", async (req) => {
        let { notebookId } = req.body;
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        ALL_FIELDS_PRESENT.test({
            notebookId,
            userId,
        }).throwErrorIfInvalid();
        await dbInterface.sendRequest("share/accept_notebook_invite", {
            notebookId,
            userId,
        });
    });

    apiRouter.for("/share/ignore_notebook_invite", async (req) => {
        let { notebookId } = req.body;
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        ALL_FIELDS_PRESENT.test({
            notebookId,
            userId,
        }).throwErrorIfInvalid();
        await dbInterface.sendRequest("share/ignore_notebook_invite", {
            notebookId,
            userId,
        });
    });

    apiRouter.for("/share/get_all_owned_notebook_shares", async (req) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        ALL_FIELDS_PRESENT.test({
            userId,
        }).throwErrorIfInvalid();
        return await dbInterface.sendRequest(
            "share/get_all_owned_notebook_shares",
            {
                userId,
            },
        );
    });

    apiRouter.for("/share/get_all_notebook_invites_for_user", async (req) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);
        ALL_FIELDS_PRESENT.test({
            userId,
        }).throwErrorIfInvalid();
        return await dbInterface.sendRequest(
            "share/get_all_notebook_invites_for_user",
            {
                userId,
            },
        );
    });
}
