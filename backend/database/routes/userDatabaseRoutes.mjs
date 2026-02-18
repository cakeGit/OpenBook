import { logDb } from "../../logger.mjs";
import { ALL_FIELDS_PRESENT } from "../../web/foundation_safe/validations.js";
import {
    generateRandomUUID,
    generateRandomUUIDBlob,
    getUUIDBlob,
    parseUUIDBlob,
} from "../uuidBlober.mjs";
import { issueNewAuthKeyForUserUUID } from "./authDatabaseRoutes.mjs";

//Tag name handling here
//A tag name is a short string derived from the user's display name, used in mentions and other places
//It isnt necassarily unique, but is intended to identify the user in a short form such as for a git diff display
const FALLBACK_TAG_NAME_CHARS = "abcdefghijklmnopqrstuvwxyz";

//If we cant get a good tag name from the display name, generate a random one,
//This shouldnt really happen, but just in case
function randomChars(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += FALLBACK_TAG_NAME_CHARS.charAt(
            Math.floor(Math.random() * FALLBACK_TAG_NAME_CHARS.length),
        );
    }
    return result;
}

//Get a tag name from the display name, generally the first word, e.g. "Luca Maxim" -> "luca"
function getTagName(displayName) {
    let name =
        displayName.split(" ").filter((part) => part.length > 0)[0] ||
        randomChars(5);

    if (name.length > 10) {
        name = name.substring(0, 10);
    }

    return name.toLowerCase();
}

export default function userDatabaseRoutes(addEndpoint) {
    addEndpoint(
        "login_to_google_user_if_exists",
        async (db, message, response) => {
            let googleUserId = message.googleUserId;
            let deviceInfo = message.deviceInfo;

            ALL_FIELDS_PRESENT.test({
                googleUserId,
                deviceInfo,
            }).throwErrorIfInvalid();

            const query = db.getQueryOrThrow("get_user_by_google_uid");

            let row = await db.get(query, [googleUserId]);

            if (row) {
                let userUUID = parseUUIDBlob(row.UserID);

                response.success({
                    exists: true,
                    user_id: userUUID,
                    //Use the auth route's provided method to insert a new auth key into the logins table
                    linked_auth_key: await issueNewAuthKeyForUserUUID(
                        db,
                        userUUID,
                        deviceInfo,
                    ),
                });
            } else {
                response.success({
                    exists: false,
                    //link_action is an explicit response field to tell the client what to do next
                    link_action: "go_to_signup",
                });
            }
        },
    );

    addEndpoint("create_account", async (db, message, response) => {
        let userData = {
            googleUserId: message.googleUserId,
            displayName: message.displayName,
            email: message.email,
            profilePictureUrl: message.profilePictureUrl,
            deviceInfo: message.deviceInfo,
        };
        ALL_FIELDS_PRESENT.test(userData).throwErrorIfInvalid();

        const tagName = getTagName(userData.displayName);

        let uniqueTagName = tagName;
        let tagSuffix = 1;
        while (true) {
            let existingUser = await db.get(
                db.getQueryOrThrow("user.get_user_by_tag_name"),
                [uniqueTagName],
            );
            if (!existingUser) {
                break;
            }
            uniqueTagName = `${tagName}${tagSuffix}`;
            tagSuffix++;
        }

        const userUUID = generateRandomUUID();
        const userUUIDBlob = getUUIDBlob(userUUID);

        logDb(
            `Creating new user account ${userData.displayName} (${userUUID}): ${uniqueTagName}~${userData.email}`,
        );

        await db.run(db.getQueryOrThrow("create_user"), [
            userUUIDBlob,
            userData.googleUserId,
            uniqueTagName,
            userData.displayName,
            userData.email,
            userData.profilePictureUrl,
        ]);

        logDb(
            `Creating default notebook for user ${userData.displayName} (${userUUID})`,
        );

        await db.run(db.getQueryOrThrow("notebook.create_notebook"), [
            generateRandomUUIDBlob(),
            "Your notes",
            userUUIDBlob,
        ]);

        return {
            user_id: userUUID,
            //Since linked_auth_key is abstracted by api handling, we can return it here with no extra work
            linked_auth_key: await issueNewAuthKeyForUserUUID(
                db,
                userUUID,
                userData.deviceInfo,
            ),
        };
    });

    addEndpoint("get_user_info", async (db, message, response) => {
        let userInfo = await db.get(db.getQueryOrThrow("get_user_info"), [
            getUUIDBlob(message.userId),
        ]);
        return {
            user_id: parseUUIDBlob(userInfo.UserID),
            label_name: userInfo.LabelName,
            display_name: userInfo.DisplayName,
            email: userInfo.Email,
            profile_picture_url: userInfo.ProfilePictureURL,
        };
    });
    
    addEndpoint("check_user_exists", async (db, message, response) => {
        let row = await db.get(db.getQueryOrThrow("check_user_exists"), [
            getUUIDBlob(message.userId),
        ]);
        return { exists: row != undefined };
    });
}
