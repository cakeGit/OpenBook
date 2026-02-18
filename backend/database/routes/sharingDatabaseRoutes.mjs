import { RequestError } from "../../web/foundation_safe/requestError.js";
import {
    adaptJsObjectToSql,
    adaptSqlRowsContentToJs,
} from "../foundation/adapter.mjs";
import { getUUIDBlob } from "../uuidBlober.mjs";

//Existing owner specific access check.
async function expectOwnerAccess(db, userId, notebookId) {
    const name = await db.get(
        db.getQueryOrThrow("notebook.get_owner_accessible_notebook_name"),
        [getUUIDBlob(notebookId), getUUIDBlob(userId)],
    );
    if (!name) {
        throw new RequestError(
            "User does not have permission to perform this action, or the notebook does not exist.",
        );
    }
}

//New method for checking if the user has either owner or shared access
async function expectOwnerOrSharedAccess(db, userId, notebookId) {
    const name = await db.get(
        db.getQueryOrThrow("notebook.get_accessible_notebook_name"),
        adaptJsObjectToSql({
            notebookId,
            userId,
        }),
    );
    if (!name) {
        throw new RequestError(
            "User does not have access to this notebook, or it does not exist.",
        );
    }
}

export default function sharingDatabaseRoutes(addEndpoint) {
    //Create or update the latest share invite, if the user is not already invited,
    //Throw an error if the user already has the notebook shared with them
    addEndpoint(
        "share/share_notebook_with_user",
        async (db, message, response) => {
            let { notebookId, inviteUserLabelName, userId } = message;

            await expectOwnerAccess(db, userId, notebookId);

            const name = await db.get(
                db.getQueryOrThrow(
                    "notebook.get_owner_accessible_notebook_name",
                ),
                [getUUIDBlob(notebookId), getUUIDBlob(userId)],
            );
            if (!name) {
                throw new RequestError(
                    "User does not have permission to invite users to this notebook, or it does not exist.",
                );
            }

            let user = await db.get(
                db.getQueryOrThrow("user.get_user_by_tag_name"),
                [inviteUserLabelName],
            );
            if (!user) {
                throw new RequestError("No user found with that tag name");
            }

            let existingShare = await db.get(
                db.getQueryOrThrow("share.get_user_notebook_share"),
                [getUUIDBlob(notebookId), user.UserID], //Use the raw blob straight from user
            );
            if (existingShare) {
                throw new RequestError(
                    "User already has access to this notebook",
                );
            }

            await db.run(db.getQueryOrThrow("share.send_notebook_access_invite"), [
                getUUIDBlob(notebookId),
                user.UserID, //Use the raw blob straight from user
                Date.now().valueOf(),
            ]);
        },
    );

    addEndpoint(
        "share/get_all_owned_notebook_shares",
        async (db, message, response) => {
            function createMapByKey(array, provider) {
                const map = {};
                for (let item of array) {
                    const key = provider(item);
                    if (!map[key]) {
                        map[key] = [];
                    }
                    map[key].push(item);
                }
                return map;
            }

            let shares = await db.all(
                db.getQueryOrThrow("share.get_all_owned_notebook_shares"),
                [getUUIDBlob(message.userId)],
            );
            adaptSqlRowsContentToJs(shares);
            shares = createMapByKey(shares, (share) => share.notebookId);

            let pendingShares = await db.all(
                db.getQueryOrThrow(
                    "share.get_all_owned_notebook_pending_shares",
                ),
                [getUUIDBlob(message.userId)],
            );
            adaptSqlRowsContentToJs(pendingShares);
            pendingShares = createMapByKey(
                pendingShares,
                (share) => share.notebookId,
            );

            return {
                shares,
                pendingShares,
            };
        },
    );

    addEndpoint(
        "share/get_all_notebook_invites_for_user",
        async (db, message, response) => {
            let shares = await db.all(
                db.getQueryOrThrow("share.get_all_notebook_invites_for_user"),
                adaptJsObjectToSql({ userId: message.userId }),
            );
            adaptSqlRowsContentToJs(shares);
            return {
                incomingShares: shares,
            };
        },
    );

    addEndpoint(
        "share/revoke_notebook_share",
        async (db, message, response) => {
            if (message.userId === message.revokeUserId) {
                await expectOwnerOrSharedAccess(
                    db,
                    message.userId,
                    message.notebookId,
                );
            } else {
                await expectOwnerAccess(
                    db,
                    message.userId,
                    message.notebookId,
                );
            }

            //Look for an invite OR a share to ensure that it is fully revoked,
            // even if the user accepted the invite while the user clicked revoke invitation,
            // this will still mean the user has no more access
            await db.runMultiple(
                db.getQueryOrThrow("share.revoke_notebook_share"),
                adaptJsObjectToSql({
                    notebookId: message.notebookId,
                    userId: message.revokeUserId,
                }),
            );
        },
    );

    addEndpoint(
        "share/accept_notebook_invite",
        async (db, message, response) => {
            let { notebookId, userId } = message;
            let share = await db.get(
                db.getQueryOrThrow("share.get_user_notebook_invite"),
                [getUUIDBlob(notebookId), getUUIDBlob(userId)],
            );
            if (!share) {
                throw new RequestError(
                    "No pending share invite found for this notebook",
                );
            }
            await db.runMultiple(
                db.getQueryOrThrow("share.accept_notebook_invite"),
                adaptJsObjectToSql({ notebookId, userId }),
            );
        },
    );

    
    addEndpoint(
        "share/ignore_notebook_invite",
        async (db, message, response) => {
            let { notebookId, userId } = message;
            let share = await db.get(
                db.getQueryOrThrow("share.get_user_notebook_invite"),
                [getUUIDBlob(notebookId), getUUIDBlob(userId)],
            );
            if (!share) {
                throw new RequestError(
                    "No pending share invite found for this notebook",
                );
            }
            await db.runMultiple(
                db.getQueryOrThrow("share.ignore_notebook_invite"),
                adaptJsObjectToSql({ notebookId, userId }),
            );
        },
    );
}
