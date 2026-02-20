import { useEffect, useRef, useState } from "react";
import "./image.css";
import { LuMousePointerClick } from "react-icons/lu";

//The method called with the upload
async function tryUploadImage(
    event,
    pageRef,
    blockId,
    setCurrentImageResourceId,
    setIsUploading,
) {
    setIsUploading(true);

    //Create form data to submit
    const formData = new FormData();
    const fileField = event.target;

    //Add the first file submitted (we only accept 1 anyways)
    formData.append("image", fileField.files[0]);

    //Call upload api
    fetch("http://localhost:3000/api/upload_image", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((result) => {
            //Apply the new image resource as the source of this image in the page
            pageRef.current.content[blockId].resourceId =
                result.imageResourceId;
            pageRef.current.onChange(blockId);

            //Update the image resource id we are rendering ourselves
            setCurrentImageResourceId(result.imageResourceId);
            //Clear the uploading state
            setIsUploading(false);
        })
        .catch((error) => {
            alert("Error in uploading image:", error);
            console.error(error);
            //Clear the uploading state, which will mean the user can try again
            setIsUploading(false);
        });
}

export function PageImageBlock({ blockId, data, pageRef, children, blockRef }) {
    const imageUploadRef = useRef(null);

    const [currentImageResourceId, setCurrentImageResourceId] = useState(
        data.resourceId,
    );
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (data.resourceId !== currentImageResourceId) {
            //Netowrking, look for changes in current url target and update as appropriate
            setCurrentImageResourceId(data.resourceId);
        }
    }, [data]);

    return (
        <div ref={blockRef} className="page_image_block_container">
            {currentImageResourceId ? ( //Display the image (if present)
                <img
                    src={`/image/${currentImageResourceId}`}
                    alt="image"
                    className="image_block_image"
                />
            ) : isUploading ? ( //If we are currently uploading, dont net the user interrupt, and display an uploading hint
                <div className="image_block_placeholder">Uploading...</div>
            ) : (
                <div
                    className="image_block_placeholder"
                    //Any click on the whole image block will result in opening the upload
                    onClick={() => imageUploadRef.current.click()}
                >
                    <span>
                        Click to upload image <LuMousePointerClick />
                    </span>
                    <input //This input is hidden by the stylesheet
                        type="file"
                        ref={imageUploadRef}
                        accept="image/*"
                        onChange={async (e) => {
                            tryUploadImage(
                                e,
                                pageRef,
                                blockId,
                                setCurrentImageResourceId,
                                setIsUploading,
                            );
                        }}
                        className="image_block_file_input"
                    />
                </div>
            )}
        </div>
    );
}
