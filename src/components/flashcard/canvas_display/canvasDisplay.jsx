import { useEffect, useState } from "react";
import { MdOutlineDraw } from "react-icons/md";
import { uncompress } from "../../../foundation/jsonCompression.js";
import { TldrawImage } from "tldraw";

export function isBlankSnapshot(canvasData) {
    if (!canvasData || !canvasData.store) {
        return true;
    }
    //For some reason, the tldraw image will completley fail if the canvas is empty,
    //To fix this, we check if the canvas data is blank (Missing any shape properties)
    const expectedKeys = ["document:document", "page:page"];
    for (const key in canvasData.store) {
        if (!expectedKeys.includes(key)) {
            return false; //Found a key that is not expected in a blank canvas
        }
    }
    return true;
}

export function CanvasDisplay({ canvasDocumentData }) {
    const hasCanvasData = canvasDocumentData && canvasDocumentData.length > 0;
    const [canvasSnapshotData, setCanvasSnapshotData] = useState(null);

    //Loading is asynchronous because of the uncompress function, so we have to update the display once its done
    useEffect(() => {
        (async () => {
            if (!hasCanvasData) return;
            setCanvasSnapshotData(await uncompress(canvasDocumentData));
        })();
    }, [canvasDocumentData]);

    //Displaying a cavnas snapshot that is empty results in errors, so we use a placeholder instead
    return (!hasCanvasData || isBlankSnapshot(canvasSnapshotData)) ? (
        <div>
            <MdOutlineDraw />
        </div>
    ) : (
        <TldrawImage snapshot={{ document: canvasSnapshotData }} />
    );
}
