import { useRef, useState, useEffect } from "react";
import { GenericModal } from "../../../../../foundation/modals/genericModal.jsx";
import { useOpenCv } from "opencv-react";
import {
    capturePhotoFromVideo,
    startPreviewLoop,
    openCamera,
} from "../image_processing/cameraUtils.js";

function FlashcardImageAddModalInner({ modal }) {
    const uploadInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const documentCropCheckboxRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [stream, setStream] = useState(null);
    const { cv } = useOpenCv();

    //Ensure the video element is updated with the stream when it changes
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isCameraOpen]);

    //If the camera is open (and cv is available), start the preview loop that handles the document cropping preview
    useEffect(() => {
        let stopPreview;
        if (isCameraOpen) {
            stopPreview = startPreviewLoop(
                videoRef,
                canvasRef,
                documentCropCheckboxRef,
                cv,
            );
        }
        return () => {
            if (stopPreview) stopPreview();
        };
    }, [isCameraOpen, cv]);

    //Cleanup the stream when the component is unmounted, to avoid camera staying on if user navigates away while it's open
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

    function closeCamera() {
        setStream(null);
        setIsCameraOpen(false);
    }

    //Handles a file upload, (This may be an internal upload from camera capture)
    //Predominantly there to ensure that streams /camera are closed and cleaned up before passing the file to the hanlder
    // (from flashcard add image modal helper)
    async function handleSelectedFile(file) {
        if (!file) {
            return;
        }
        
        closeCamera()

        await modal.handleChosenFile(
            file,
            documentCropCheckboxRef.current.checked,
        );
    }

    return (
        <div className="flashcard_image_modal_content">
            <h3>Add image to flashcard</h3>
            <div className="flashcard_image_modal_body">
                <label className="flashcard_image_modal_checkbox_row">
                    <input type="checkbox" ref={documentCropCheckboxRef} />
                    Crop the image before upload
                </label>

                {isCameraOpen ? (
                    <div className="flashcard_image_modal_camera_container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{
                                width: "100%",
                                maxHeight: "300px",
                                objectFit: "contain",
                                backgroundColor: "#000",
                            }}
                        />
                        {/* The canvas is used to display the document crop preview, ontop of the video */}
                        <canvas
                            ref={canvasRef}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                ) : null}

                <input
                    type="file"
                    accept="image/*"
                    ref={uploadInputRef}
                    className="flashcard_image_modal_hidden_input"
                    onChange={(e) => handleSelectedFile(e.target.files?.[0])}
                />
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    className="flashcard_image_modal_hidden_input"
                    onChange={(e) => handleSelectedFile(e.target.files?.[0])}
                />
            </div>
            <div className="flashcard_image_modal_actions">
                {isCameraOpen ? (
                    <>
                        <button
                            onClick={() => {
                                closeCamera();
                            }}
                        >
                            Back
                        </button>
                        <button
                            onClick={() =>
                                capturePhotoFromVideo(
                                    videoRef,
                                    handleSelectedFile,
                                )
                            }
                        >
                            Capture
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => modal.closeModal()}>
                            Cancel
                        </button>
                        <button onClick={() => uploadInputRef.current.click()}>
                            Upload image
                        </button>
                        <button
                            onClick={() =>
                                openCamera(
                                    setStream,
                                    setIsCameraOpen,
                                    cameraInputRef,
                                )
                            }
                        >
                            Take Photo
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export class FlashcardImageAddModal extends GenericModal {
    constructor(modalHook, handleChosenFile) {
        super(FlashcardImageAddModalInner, modalHook);
        this.handleChosenFile = handleChosenFile;
    }
}
