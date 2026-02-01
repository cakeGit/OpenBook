import {
    generateRandomUUID,
    getUUIDBlob,
    parseUUIDBlob,
} from "../uuidBlober.mjs";
import { ALL_FIELDS_PRESENT } from "../../web/foundation_safe/validations.js";

//Called by the user database routes when the user provides a google account,
// there isnt a direct sign-in route in the auth routes, because google is required to login, and we dont handle that here
export async function issueNewAuthKeyForUserUUID(db, userUUID, deviceInfo) {
    let authKey = generateRandomUUID();
    let userUUIDBlob = getUUIDBlob(userUUID);
    let authKeyBlob = getUUIDBlob(authKey);

    await db.run(db.getQueryOrThrow("logins.issue_new_login"), [
        userUUIDBlob,
        authKeyBlob,
        deviceInfo,
    ]);

    return authKey.toString();
}

export default function authDatabaseRoutes(addEndpoint) {
    //Called to validate if an auth key is valid, returns the user id if so
    //Called via the web server's auth helper
    addEndpoint("validate_user_auth", async (db, message, response) => {
        ALL_FIELDS_PRESENT.test({
            authKey: message.authKey,
        }).throwErrorIfInvalid();
        let result = await db.get(
            db.getQueryOrThrow("logins.get_user_of_auth"),
            [getUUIDBlob(message.authKey)],
        );
        return {
            user_id: result?.UserID ? parseUUIDBlob(result?.UserID) : null,
        };
    });

    //Called when the user signs out, invalidates the auth key
    //There is nothing related to google here, so its just a pure auth route
    addEndpoint("invalidate_auth_key", async (db, message, response) => {
        ALL_FIELDS_PRESENT.test({
            authKey: message.authKey,
        }).throwErrorIfInvalid();
        await db.run(db.getQueryOrThrow("logins.invalidate_auth_key"), [
            getUUIDBlob(message.authKey),
        ]);
    });
}
