import { useRef, useState, useEffect } from "react";
import { orderCorners } from "./imageProcessing";

export function ImageCropper({
    imageUrl,
    initialCorners,
    onCornersChange,
    onCrop,
    overlay,
    style = {},
}) {
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const [corners, setCorners] = useState(initialCorners);
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setCorners(initialCorners);
    }, [initialCorners]);

    useEffect(() => {
        if (!canvasRef.current || !imgRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const img = imgRef.current;

        const updateCanvas = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if (corners && corners.length === 4) {
                // Draw path
                ctx.strokeStyle = "#eeeeee";
                ctx.lineWidth = Math.max(3, canvas.width / 300);
                ctx.beginPath();
                ctx.moveTo(corners[0].x, corners[0].y);
                for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
                ctx.closePath();
                ctx.stroke();

                // Draw corners
                const radius = Math.max(8, canvas.width / 100);
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(corners[i].x, corners[i].y, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = "#eeeeee";
                    ctx.fill();
                    ctx.strokeStyle = "#222222";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        };

        if (img.complete) {
            updateCanvas();
        } else {
            img.onload = updateCanvas;
        }
    }, [imageUrl, corners]);

    function getMousePos(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) * canvasRef.current.width) / rect.width,
            y: ((e.clientY - rect.top) * canvasRef.current.height) / rect.height,
        };
    }

    function onMouseDown(e) {
        const pos = getMousePos(e);
        const radius = Math.max(15, canvasRef.current.width / 50); // Larger hit area
        for (let i = 0; i < 4; i++) {
            const d = Math.hypot(pos.x - corners[i].x, pos.y - corners[i].y);
            if (d < radius) {
                setDragIndex(i);
                setDragOffset({ x: pos.x - corners[i].x, y: pos.y - corners[i].y });
                return;
            }
        }
    }
    function onMouseMove(e) {
        if (dragIndex === null) return;
        const pos = getMousePos(e);
        const newCorners = corners.slice();
        newCorners[dragIndex] = {
            x: pos.x - dragOffset.x,
            y: pos.y - dragOffset.y,
        };
        setCorners(orderCorners(newCorners));
        if (onCornersChange) onCornersChange(orderCorners(newCorners));
    }
    function onMouseUp() {
        setDragIndex(null);
    }
    function onClick(e) {
        if (dragIndex !== null) return;
        const pos = getMousePos(e);
        // Move nearest corner to click
        let minDist = Infinity;
        let minIdx = 0;
        for (let i = 0; i < 4; i++) {
            const d = Math.hypot(pos.x - corners[i].x, pos.y - corners[i].y);
            if (d < minDist) {
                minDist = d;
                minIdx = i;
            }
        }
        const newCorners = corners.slice();
        newCorners[minIdx] = pos;
        setCorners(orderCorners(newCorners));
        if (onCornersChange) onCornersChange(orderCorners(newCorners));
    }

    return (
        <div style={{ position: "relative", ...style }}>
            <img
                ref={imgRef}
                src={imageUrl}
                alt="preview"
                style={{ display: "none" }}
                onLoad={() => {
                    if (canvasRef.current) canvasRef.current.dispatchEvent(new Event("resize"));
                }}
            />
            <canvas
                ref={canvasRef}
                style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", display: "block", cursor: dragIndex !== null ? "grabbing" : "pointer", zIndex: 2 }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onClick={onClick}
            />
        </div>
    );
}
