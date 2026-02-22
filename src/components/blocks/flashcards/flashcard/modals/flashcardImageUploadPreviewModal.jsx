import { useState, useEffect } from "react";
import { GenericModal } from "../../../../../foundation/modals/genericModal.jsx";
import { ImageCropper } from "../image_processing/ImageCropper.jsx";
import { useOpenCv } from "opencv-react";

function updateImagePreview(cv, corners, modal, setCroppedUrl) {
    return () => {
        if (!cv || !corners || corners.length !== 4) return;
        
        //Handling for live updating of the cropping (most of this code was from the guide i found)
        const img = new Image();
        img.onload = () => {
            const sourceCanvas = document.createElement("canvas");
            sourceCanvas.width = img.naturalWidth;
            sourceCanvas.height = img.naturalHeight;
            const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            
            const source = cv.imread(sourceCanvas);
            
            // Calculate size
            const widthTop = Math.hypot(corners[0].x - corners[1].x, corners[0].y - corners[1].y);
            const widthBottom = Math.hypot(corners[3].x - corners[2].x, corners[3].y - corners[2].y);
            const maxWidth = Math.max(1, Math.round(Math.max(widthTop, widthBottom)));

            const heightRight = Math.hypot(corners[1].x - corners[2].x, corners[1].y - corners[2].y);
            const heightLeft = Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y);
            const maxHeight = Math.max(1, Math.round(Math.max(heightRight, heightLeft)));

            //Turn our corners ({x, y} objects) into array format opencv can understand
            const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
                corners[0].x, corners[0].y,
                corners[1].x, corners[1].y,
                corners[2].x, corners[2].y,
                corners[3].x, corners[3].y,
            ]);
            const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                maxWidth - 1, 0,
                maxWidth - 1, maxHeight - 1,
                0, maxHeight - 1,
            ]);

            //Get the transform
            const perspective = cv.getPerspectiveTransform(srcPts, dstPts);
            const cropped = new cv.Mat();
            //Apply the transformation
            cv.warpPerspective(source, cropped, perspective, new cv.Size(maxWidth, maxHeight));
            
            //Get the place to put the actual output
            const outCanvas = document.createElement("canvas");
            cv.imshow(outCanvas, cropped);
            const newUrl = outCanvas.toDataURL("image/jpeg", 0.9);
            
            //Display the image (using "image as a base64 url" system)
            setCroppedUrl(newUrl);
            modal.currentCorners = corners; // Sync back to modal class
            
            //Clear the necessary stuff, this is unlike normal js where stuff is automatically garbage collected
            source.delete();
            srcPts.delete();
            dstPts.delete();
            perspective.delete();
            cropped.delete();
        };
        img.src = modal.originalImageUrl;
    }
}

function FlashcardImageUploadPreviewModalInner({ modal }) {
    const [isUploading, setIsUploading] = useState(false);
    const [corners, setCorners] = useState(modal.initialCorners);
    const [croppedUrl, setCroppedUrl] = useState(modal.croppedPreviewUrl);
    const { cv } = useOpenCv();

    //This had a very long content so the logic is put into the function above
    useEffect(updateImagePreview(cv, corners, modal, setCroppedUrl), [cv, corners]);

    async function onClickAccept() {
        setIsUploading(true);
        try {
            await modal.onAccept(corners);
            modal.closeModal();
        } finally {
            setIsUploading(false);
        }
    }

    //Go back to the previous modal, in a method provided by flashcard.jsx (now actually from flashcardAddImageModalHelper.jsx)
    function onClickRetry(e) {
        modal.closeModal();
        modal.onRetry(e);
    }

    return (
        <div className="flashcard_image_modal_content flashcard_image_preview_modal_content">
            <h3>Preview and Adjust Crop</h3>
            <div className="flashcard_image_modal_body flashcard_image_preview_body">
                <div className="flashcard_image_preview_cropper_container">
                    <p className="flashcard_image_preview_instruction">
                        Drag corners or click to move nearest corner:
                    </p>
                    <div className="flashcard_image_preview_cropper_wrapper">
                        <ImageCropper 
                            imageUrl={modal.originalImageUrl} 
                            initialCorners={corners} 
                            onCornersChange={setCorners}
                        />
                    </div>
                </div>
                <div className="flashcard_image_preview_result_wrapper">
                    <img
                        src={croppedUrl}
                        alt="Cropped result"
                        className="flashcard_image_preview_result"
                    />
                </div>
            </div>
            <div className="flashcard_image_modal_actions">
                <button disabled={isUploading} onClick={onClickRetry}>
                    Try again
                </button>
                <button disabled={isUploading} onClick={onClickAccept}>
                    {isUploading ? "Uploading..." : "Upload"}
                </button>
            </div>
        </div>
    );
}

export class FlashcardImageUploadPreviewModal extends GenericModal {
    constructor(
        modalHook,
        originalImageUrl,
        initialCorners,
        croppedPreviewUrl,
        onAccept,
        onRetry,
        onCleanup,
    ) {
        super(FlashcardImageUploadPreviewModalInner, modalHook);
        this.originalImageUrl = originalImageUrl;
        this.initialCorners = initialCorners;
        this.croppedPreviewUrl = croppedPreviewUrl;
        this.currentCorners = initialCorners;
        this.onAccept = (corners) => onAccept(corners || this.currentCorners);
        this.onRetry = onRetry;
        this.onCleanup = onCleanup;
    }

    closeModal() {
        this.onCleanup();
        super.closeModal();
    }
}
