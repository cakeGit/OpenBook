import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import "./drawingCanvas.css";
import { useCanvasEditorHelper } from "../foundation/useCanvasEditorHelper";

export function PageDrawingCanvasBlock({
    blockId,
    data,
    pageRef,
    children,
    ref,
}) {
    let { setEditor } = useCanvasEditorHelper(blockId, "documentData", data, pageRef);

    return (
        <div style={{ width: "100%", height: "500px" }}>
            <Tldraw
                //Because we are simply networking the whole canvas, images would require full tldraw networking integration.
                // this means we disable image and video assets for now, they are allowed in the rest of the page anyways.
                acceptedImageMimeTypes={[]}
                acceptedVideoMimeTypes={[]}
                maxAssetSize={0}
                options={{
                    maxPages: 1,
                }}
                onMount={setEditor}
            />
        </div>
    );
}
