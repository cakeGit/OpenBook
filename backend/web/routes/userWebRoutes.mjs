import { OAuth2Client } from 'google-auth-library';
import { logWeb } from '../../logger.mjs';
import { Validator } from '../foundation_safe/validator.js';
import { RequestError } from '../foundation_safe/requestError.js';
import { UAParser } from 'ua-parser-js';
import { getOrThrowAuthorizedUserUUIDOfRequest } from "../foundation/webAuth.mjs";
import { dbInterface } from "../webDbInterface.mjs";

//This here is how we access the google oauth api for the server, in order to verify id tokens
//This uses public private key encryption with JWT tokens, so we can garuantee that the user is giving us a valid login
const clientId = '72817083579-kd1gu053ehj8os6snedmut08i4dgl6md.apps.googleusercontent.com';
const googleOAuthClient = new OAuth2Client(clientId);

//Create a validator for when the user is making an account
const VALID_DISPLAY_NAME_VALIDATOR = new Validator("Display name")
  .notNull()
  .lengthBetween(1, 30)
  .hasNameLikeCharsOnly();

//Get all the user data from the payload string, as well as verify its authenticicity
async function tryGetCredentialPayload(credential) {
    //Verify the credential with google - generic code here
    let ticket;
    try {
        ticket = await googleOAuthClient.verifyIdToken({
            idToken: credential,
            audience: clientId,
        });
    } catch (error) {
        logWeb("Error verifying Google ID token:", error);
        return new RequestError("Invalid Google credential " + error.message);
    }
    return ticket.getPayload();
}

//Get a string representing the device info from the request headers,
//Useful for if we want to make a list of devices the user is logged in on, where the user can manage active logins
function getDeviceInfoForRequest(req) {
    //Use the ua parser linrary cause its much easier than trying to make the raw header look readable

    let userAgent = req.headers['user-agent'];
    if (!userAgent) {
        return "Unknown Device";
    }

    let parser = new UAParser(userAgent);

    let deviceInfo = `${parser.getOS().name || "Unknown OS"} ${parser.getOS().version || ""} - ` +
        `${parser.getBrowser().name || "Unknown Browser"} ${parser.getBrowser().version || ""}`.trim();
    return deviceInfo;
}

export default function userRouter(apiRouter) {
    //This is to check if a google account exists, and log in if so
    //If not, they are directed to create an account for the provided info
    apiRouter.for("/google_check_account", async (req) => {
        let credential = req.body?.credential;

        if (!credential) {
            throw new RequestError("Missing credential");
        }

        let credentialPayload = await tryGetCredentialPayload(credential);
        let deviceLoginInfo = getDeviceInfoForRequest(req);
        const userId = credentialPayload['sub'];//"Sub" is the unique user id field in google's jwt payload
        
        //Now go ask the database worker to see if this user exists, send it straight back, which will include an auth key if so
        return await dbInterface.sendRequest("login_to_google_user_if_exists", { googleUserId: userId, deviceInfo: deviceLoginInfo});
    });

    apiRouter.for("/create_account", async (req) => {
        let displayName = req.body?.display_name;
        
        VALID_DISPLAY_NAME_VALIDATOR.test(displayName).throwRequestErrorIfInvalid();
        
        let credential = req.body?.credential;

        if (!credential) {
            throw new RequestError("Missing credential");
        }

        let credentialPayload = await tryGetCredentialPayload(credential);
        //Since the user will sign-in once the account is made, we also need to get device info here
        let deviceLoginInfo = getDeviceInfoForRequest(req);

        //Now go ask the database worker to create the account
        return await dbInterface.sendRequest("create_account", {
            //Unpack everything into named fields
            googleUserId: credentialPayload['sub'],
            displayName: displayName,
            email: credentialPayload['email'],
            profilePictureUrl: credentialPayload['picture'],
            deviceInfo: deviceLoginInfo,
        });
    });

    //Actual user access not related to google
    apiRouter.for("/get_current_user_info", async (req) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);

        return await dbInterface.sendRequest("get_user_info", { userId });
    });
}