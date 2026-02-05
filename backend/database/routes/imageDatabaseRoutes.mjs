import {
    generateRandomUUID,
    getUUIDBlob,
} from "../uuidBlober.mjs";
import { ALL_FIELDS_PRESENT } from "../../web/foundation_safe/validations.js";
import { RequestError } from "../../web/foundation_safe/requestError.js";

export default function imageDatabaseRoutes(addEndpoint) {
    //Called to add an image into the image resources table,
    //Returns the new resource's id for reference elsewhere in the database
    addEndpoint("images/record_user_image_upload", async (db, message, response) => {
        ALL_FIELDS_PRESENT.test({
            userId: message.userId,
            relativeDirInData: message.relativeDirInData,
        }).throwErrorIfInvalid();
        
        const newImageResourceId = generateRandomUUID();

        await db.run(
            db.getQueryOrThrow("images.record_user_image_upload"),
            [
                getUUIDBlob(newImageResourceId),
                getUUIDBlob(message.userId),
                message.relativeDirInData,
            ],
        );
        return {
            imageResourceId: newImageResourceId,
        };
    });

    //Existing image database route code...

    //Called to get the filepath (relative to data) of an image based on the resource id
    addEndpoint("images/get_image_path_by_resource_id", async (db, message, response) => {
        ALL_FIELDS_PRESENT.test({
            imageResourceId: message.imageResourceId,
        }).throwErrorIfInvalid();

        const row = await db.get(
            db.getQueryOrThrow("images.get_image_path_by_resource_id"),
            [getUUIDBlob(message.imageResourceId)],
        );
        
        if (!row) throw new RequestError("Image resource not found");

        return {
            relativeDirInData: row.ImagePath,
        };
    });
}
