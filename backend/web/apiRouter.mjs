import { logWeb } from "../logger.mjs";
import { RequestError } from "./foundation_safe/requestError.js";

//A wrapper for express's router to simplify the error handling process.
//It's a bit non-standard to send 200 responses with an error attached,
// but it makes it clearer whats expected behaviour that needs more formal client handling.
export class ApiRouter {
    constructor(expressRouter) {
        this.expressRouter = expressRouter;
    }

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
                if (error instanceof RequestError) {
                    res.status(200).json({
                        success: false,
                        error: error.message,
                        effect: error.effect,
                    });
                } else {
                    logWeb("Internal server error in api:", error);
                    console.trace(error);
                    res.status(500).json({
                        success: false,
                        error: "Internal server error: " + error.message,
                    });
                }
            }
        });
    }
}
