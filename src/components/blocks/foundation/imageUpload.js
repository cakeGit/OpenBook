const UPLOAD_IMAGE_ENDPOINT = "http://localhost:3000/api/upload_image";

//Helper to get the body of a post request needed to upload an image to the server
function createUploadFormData(imageFileOrBlob, filename) {
    const formData = new FormData();
    const isFile = imageFileOrBlob instanceof File;
    formData.append(
        "image",
        imageFileOrBlob,
        isFile ? imageFileOrBlob.name : filename || "upload.jpg",
    );
    return formData;
}

//Uploads the image, and will return the new imageResourceId (or throw error)
export async function uploadImageToServer(imageFileOrBlob, options = {}) {
    const response = await fetch(options.endpoint || UPLOAD_IMAGE_ENDPOINT, {
        method: "POST",
        body: createUploadFormData(imageFileOrBlob, options.filename),
    });

    if (!response.ok) {
        throw new Error(`Image upload failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result?.imageResourceId) {
        throw new Error("Image upload did not return imageResourceId");
    }

    return result.imageResourceId;
}
