//Takes in a request to "/image/<resourceId>", finds the related image file location, and serves it
import express from "express";
import path from "path";
import fs from "fs";
import { dbInterface } from "./webDbInterface.mjs";
import { ALL_FIELDS_PRESENT } from "./foundation_safe/validations.js";
import { RequestError } from "./foundation_safe/requestError.js";
import { apiLikeRouteFail } from "./apiRouter.mjs";
import { DATA_FOLDER_PATH } from "./dataPath.mjs";

export function imageRoute() {
    const router = express.Router();

    //Can use :param in the url to get info of the request to simulate fetching the resource directly
    router.get("/:resourceId", async (req, res) => {
        try {
            const resourceId = req.params.resourceId;

            ALL_FIELDS_PRESENT.test({
                resourceId,
            }).throwRequestErrorIfInvalid();

            //Get the image path from the database
            const dbResponse = await dbInterface.sendRequest(
                "images/get_image_path_by_resource_id",
                {
                    imageResourceId: resourceId,
                },
            );

            const relativeDirInData = dbResponse.relativeDirInData;

            const absoluteImagePath = path.join(
                DATA_FOLDER_PATH,
                relativeDirInData,
            );

            //Check if file exists
            if (!fs.existsSync(absoluteImagePath)) {
                throw new RequestError("Image file not found on server");
                return;
            }
            
            //Serve the file
            res.sendFile(absoluteImagePath);
        } catch (error) {
            apiLikeRouteFail(req, res, error);
        }
    });
    
    return router;
}
