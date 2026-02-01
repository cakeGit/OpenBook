import { dbInterface } from '../webDbInterface.mjs';
import { getAuthKeyFromRequest } from "../../web/foundation/webAuth.mjs";

export default function authRouter(apiRouter) {
    apiRouter.for("/sign_out", async (req) => {
        let authKey = getAuthKeyFromRequest(req);
        await dbInterface.sendRequest("invalidate_auth_key", { authKey });
        return {
            linked_auth_key: "clear",
        }
    });
}