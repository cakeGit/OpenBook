import { compress, uncompress } from "../../../foundation/jsonCompression";
import { Debouncer } from "../../../foundation/debounce";
import { useEffect, useRef, useState } from "react";

export function useCanvasEditorHelper(blockId, canvasDataKey, data, pageRef, active = true) {
    const [editor, setEditor] = useState(null);
    const lastSnapshot = useRef(null);
    const lastCompressedSnapshot = useRef(null);
    const suppressNextUpdate = useRef(false);

    useEffect(() => {
        if (!editor || !active) return;
        //JS asynchronous shenanagains, useEffect cant be async, however,
        // this script needs to be, so we create a new function and run it in the background
        (async () => {
            if (data[canvasDataKey]) {
                //Check the data because if we compress it takes too long and it may have changed
                if (lastCompressedSnapshot.current === data[canvasDataKey]) {
                    return; //Already loaded this one (we triggered our own change)
                }
                const document = await uncompress(data[canvasDataKey]);
                lastSnapshot.current = document;
                
                //Load snapshot triggers a store update, so we use this marker to denote we drop the next update
                suppressNextUpdate.current = true;
                editor.loadSnapshot({ document });
            }
        })();
    }, [data[canvasDataKey], editor]);

    useEffect(() => {
        if (!editor || !active) return;

        const debouncedSave = new Debouncer(async (entry) => {
            const snapshot = editor.getSnapshot();

            lastSnapshot.current = snapshot.document;
            const compressed = await compress(snapshot.document);
            if (lastCompressedSnapshot.current === compressed) {
                return; //No changes since last save, so we drop
            }
            lastCompressedSnapshot.current = compressed;

            //Pack because we're storing a fairly large JSON 'dump'
            pageRef.current.content[blockId][canvasDataKey] = compressed;
            pageRef.current.onChange(blockId);
        }, 100);

        const cleanup = editor.store.listen(
            (entry) => {
                if (!suppressNextUpdate.current) {
                    debouncedSave.invoke(entry);
                } else {
                    suppressNextUpdate.current = false;
                }
            },
            {
                scope: "document",
            },
        );

        return () => {
            cleanup();
            debouncedSave.cancel();
        };
    }, [editor, active]);
    return {setEditor};
}