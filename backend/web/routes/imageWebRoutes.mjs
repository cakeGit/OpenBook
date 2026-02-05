import { logWeb } from "../../logger.mjs";
import { getOrThrowAuthorizedUserUUIDOfRequest } from "../foundation/webAuth.mjs";
import { dbInterface } from "../webDbInterface.mjs";
import fs from "node:fs";
import sharp from "sharp";
import path from "path";
import { DATA_FOLDER_PATH } from "../dataPath.mjs";

function getRandomTag() {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let tag = "";
    for (let i = 0; i < 16; i++) {
        tag += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return tag;
}

export default function imageWebRoutes(apiRouter) {
    apiRouter.multer("/upload_image", async (req, file) => {
        let userId = await getOrThrowAuthorizedUserUUIDOfRequest(req);

        //Process the image with sharp to ensure we get a PNG with reasonable compression
        const image = sharp(file.buffer)
            .png({
                quality: 80, // Reduces palette for smaller size
                compressionLevel: 9, // Max lossless compression
                adaptiveFiltering: true, // Better for photographic content
            })
            .toBuffer();

        const userUploadPath = path.join(DATA_FOLDER_PATH, "uploads", userId);

        //If the dir does not exist, make it
        fs.mkdirSync(userUploadPath, { recursive: true });

        //Define the final file path based on a timestamp and a random component
        const randomComponent = getRandomTag();
        const timestamp = Date.now();
        const fileName = `image-${timestamp}-${randomComponent}.png`;
        const finalFilePath = path.join(userUploadPath, fileName);
        const relativeDirInData = path.relative(
            DATA_FOLDER_PATH,
            finalFilePath,
        ); //For reporting to database
        const imageResourceId = (await dbInterface.sendRequest(
            "images/record_user_image_upload",
            {
                userId,
                relativeDirInData,
            },
        ))?.imageResourceId;

        //Save the processed image to disk
        await fs.promises.writeFile(finalFilePath, await image);
        logWeb(
            "An image has been uploaded by user:",
            userId,
            finalFilePath,
            imageResourceId,
        );

        return { imageResourceId };
    });
}