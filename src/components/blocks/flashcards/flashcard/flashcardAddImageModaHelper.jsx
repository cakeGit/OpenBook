import { uploadImageToServer } from "../../foundation/imageUpload";
import { FlashcardImageUploadPreviewModal } from "./modals/flashcardImageUploadPreviewModal.jsx";
import {
    createDocumentCropPreview,
    warpPerspective,
    canvasToBlob,
} from "./image_processing/imageProcessing.js";
import { FlashcardImageAddModal } from "./modals/flashcardImageAddModal";

//Method to create the handler to open the add image modal (and if the user selects. to open the image crop modal)
export function createOpenImageAddModal(
    modalHook,
    pageRef,
    blockId,
    imageDataKey,
    setCurrentImageResourceId,
    setIsImage,
    setIsImageUploading,
    isOpenCvLoaded,
    cv,
) {
    //Helper to take in the image resource id, and pply it to the flashcard side, updating the page and udpating the render states
    function applyImageResourceId(imageResourceId) {
        pageRef.current.content[blockId][imageDataKey] = imageResourceId;
        setCurrentImageResourceId(imageResourceId);
        setIsImage(true);
        pageRef.current.onChange(blockId);
    }

    //Helper to upload the image, using the image upload module (same code as image block but now accessible)
    async function uploadSideImage(fileOrBlob, fileName) {
        setIsImageUploading(true);
        try {
            const imageResourceId = await uploadImageToServer(fileOrBlob, {
                filename: fileName,
            });
            applyImageResourceId(imageResourceId);
        } catch (error) {
            //if something failed in the upload, alert user, log error, but let them retry if it was a temporary error
            alert("Error in uploading image:", error);
            console.error(error);
        }
        setIsImageUploading(false);
    }

    //When the user submits an image, this will either open cropping or upload immediatley
    async function uploadOrPreviewNewImage(
        selectedFile,
        includeDocumentCropDetection,
    ) {
        //If the user didnt select crop detection skip straight to uploading
        if (!includeDocumentCropDetection) {
            modalHook.closeModal();
            await uploadSideImage(selectedFile, selectedFile.name);
            return;
        }

        try {
            //Create the initial crop preview to display before anything, to give the initial corners
            const preview = await createDocumentCropPreview(selectedFile, cv);
            modalHook.openModal(
                new FlashcardImageUploadPreviewModal(
                    modalHook,
                    //Give the uploaded image as a uniform format (url data of jpeg)
                    preview.sourceCanvas.toDataURL("image/jpeg", 0.9),
                    preview.initialCorners,
                    preview.croppedPreviewUrl,
                    async (finalCorners) => {
                        //Submit method
                        if (!finalCorners) {
                            throw new Error("No corners provided for cropping");
                        }
                        const finalCanvas = warpPerspective(
                            cv,
                            preview.sourceCanvas,
                            finalCorners,
                        );
                        const finalBlob = await canvasToBlob(finalCanvas);
                        //Finally, upload to server
                        await uploadSideImage(finalBlob, selectedFile.name);
                    },
                    (e) => {
                        openImageAddModal(e);
                    },
                    preview.cleanup,
                ),
            );
        } catch (error) {
            //If something failed, alert user, log error, and exit
            alert("Document crop detection failed");
            console.error(error);
            modalHook.closeModal();
        }
    }

    //Entrypoint to the image add process, opens the modal for getting the image to use
    function openImageAddModal(e) {
        e?.preventDefault();
        e?.stopPropagation();
        if (!isOpenCvLoaded || !cv) {
            alert("OpenCV is still loading. Please try again in a moment.");
            return;
        }
        //Open the initial image add modal
        modalHook.openModal(
            new FlashcardImageAddModal(modalHook, uploadOrPreviewNewImage),
        );
    }

    return openImageAddModal;
}
