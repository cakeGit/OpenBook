import { logWeb } from "../logger.mjs";
import { RequestError } from "./foundation_safe/requestError.js";
import multer from "multer";

//We want to hold the file in memory for processing before saving
//So we use memory storage to tell multer not to save the image itself
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); //We then have to call multer itself to create the middleware

const SEND_INTERNAL_ERRORS_TO_CLIENT = true; //Should be false in production

//Common fail function for api-like routes, taken out of api router because images use this as well
export function apiLikeRouteFail(req, res, error) {
    if (error instanceof RequestError) {
        res.status(200).json({
            success: false,
            error: error.message,
            effect: error.effect,
        });
    } else {
        //Unexpected internal error, which should be logged
        //And hide the error if we are not in a sort of debug mode
        logWeb("Internal server error in api:", error);
        console.trace(error);
        res.status(500).json({
            success: false,
            error: SEND_INTERNAL_ERRORS_TO_CLIENT
                ? "Internal server error: " + error.message
                : "Internal server error",
        });
    }
}

//A wrapper for express's router to simplify the error handling process.
//It's a bit non-standard to send 200 responses with an error attached,
// but it makes it clearer whats expected behaviour that needs more formal client handling.
export class ApiRouter {
    constructor(expressRouter) {
        this.expressRouter = expressRouter;
    }

    //New endpoint type in api router for handling image uploads
    multer(path, handler) {
        this.expressRouter.post(
            path,
            upload.single("image"),
            async (req, res) => {
                try {
                    res.json(await handler(req, req.file));
                } catch (error) {
                    //If the handler fails call the common fail function
                    apiLikeRouteFail(req, res, error);
                }
            },
            (error, req, res, next) => {
                //In the event that multer fails
                res.status(400).send({
                    //Use default code from multer documentation
                    error: error.message,
                });
            },
        );
    }

    //Existing generic api request endpoint
    for(path, handler) {
        this.expressRouter.all(path, async (req, res) => {
            try {
                const result = await handler(req);

                //Linked auth key responses mean that we need to set or clear cookies
                if (result && result.linked_auth_key) {
                    //Remove the sensitive info, and set the user's cookie appropriately
                    if (
                        result.linked_auth_key !== "" &&
                        result.linked_auth_key !== "clear"
                    ) {
                        res.cookie("auth_key", result.linked_auth_key, {
                            maxAge: 1000 * 60 * 60 * 24 * 100,
                            httpOnly: true,
                            secure: true,
                            sameSite: "strict",
                        });
                        res.cookie("auth_present", "1", {
                            maxAge: 1000 * 60 * 60 * 24 * 100,
                            httpOnly: false,
                            secure: true,
                            sameSite: "strict",
                        });
                    } else {
                        //Clear the auth key since we got a clear command
                        res.clearCookie("auth_key");
                        res.clearCookie("auth_present");
                    }
                    delete result.linked_auth_key;
                }

                res.json(
                    result ? { success: true, ...result } : { success: true },
                );
            } catch (error) {
                apiLikeRouteFail(req, res, error);
            }
        });
    }
}
