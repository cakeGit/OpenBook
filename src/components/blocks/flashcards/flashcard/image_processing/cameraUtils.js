import { processImageForCorners } from "./imageProcessing.js";

export async function openCamera(setStream, setIsCameraOpen, cameraInputRef) {
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
        });
        setStream(mediaStream);
        setIsCameraOpen(true);
    } catch (err) {
        console.error("Error accessing camera:", err);
        if (cameraInputRef && cameraInputRef.current) {
            cameraInputRef.current.click();
        }
    }
}

export function capturePhotoFromVideo(videoRef, handleSelectedFile) {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        if (blob) {
            const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
            handleSelectedFile(file);
        }
    }, "image/jpeg", 0.92);
}

export function startPreviewLoop(videoRef, canvasRef, documentCropCheckboxRef, cv) {
    let animationFrameId;

    const drawPreview = () => {
        if (!videoRef.current || !canvasRef.current || !cv || !documentCropCheckboxRef.current?.checked) {
            animationFrameId = requestAnimationFrame(drawPreview);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
                const corners = processImageForCorners(cv, canvas);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (corners) {
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(corners[0].x, corners[0].y);
                    ctx.lineTo(corners[1].x, corners[1].y);
                    ctx.lineTo(corners[2].x, corners[2].y);
                    ctx.lineTo(corners[3].x, corners[3].y);
                    ctx.closePath();
                    ctx.stroke();
                }
            } catch (e) {
                // ignore
            }
        }

        animationFrameId = requestAnimationFrame(drawPreview);
    };

    // start loop
    drawPreview();

    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };
}

export function attachStreamToVideo(videoRef, stream) {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
    }
}
