import { useEffect, useRef, useState } from "react";
import "./flashcard.css";
import { Tldraw } from "tldraw";
import { createPortal } from "react-dom";
import { useCanvasEditorHelper } from "../../foundation/useCanvasEditorHelper";
import { MdDraw, MdTextFields } from "react-icons/md";
import { CanvasDisplay } from "../../../flashcard/canvas_display/canvasDisplay.jsx";
import Select from "react-select";
import { IoMdCloseCircle } from "react-icons/io";

function FlashcardSide({ side, data, pageRef, blockId }) {
    const textInputRef = useRef(null);
    //These data keys are constructed based on the side (front/back)
    //Since the logic is the same but the fields are different, we can access the fields like data["frontText"] instead of data.frontText
    const textDataKey = side + "Text";
    const canvasDataKey = side + "CanvasDocumentData";

    //State for if this side is a canvas or text flashcard, needed to re-render
    // since the structure of the flashcard itself changes, not just the flashcard content
    const [isCanvas, setIsCanvas] = useState(data[canvasDataKey] != undefined);
    const [editModalOpen, setEditModalOpen] = useState(false);

    //Keep the state of isCanvas in sync with data changes from the server
    useEffect(() => {
        setIsCanvas(data[canvasDataKey] != undefined);
    }, [data[canvasDataKey]]);

    //Use the editor helper module to get the editor logic
    const { setEditor } = useCanvasEditorHelper(
        blockId,
        canvasDataKey,
        data,
        pageRef,
        isCanvas && editModalOpen, //Added an additional optional argument to only enable edit handling when this is a canvas block
    );

    async function handleTextChanged(e) {
        //Internal function for handling text changes
        //This logic is generally quite common between other text editable blocks
        //It may be better to take this out into a more common module at a later date
        if (textInputRef.current) {
            //Send this to the server
            pageRef.current.content[blockId][textDataKey] =
                textInputRef.current.innerText;
            pageRef.current.sendChange(blockId);

            //Update the placeholder visibility
            if (data[textDataKey]?.trim() === "") {
                textInputRef.current.classList.add("showplaceholder");
            } else {
                textInputRef.current.classList.remove("showplaceholder");
            }
        }
    }

    //Update the placeholder visibility when data changes from the server
    useEffect(() => {
        if (textInputRef.current) {
            textInputRef.current.innerText = data[textDataKey] || "";
            if (!data[textDataKey] || data[textDataKey].trim() === "") {
                textInputRef.current.classList.add("showplaceholder");
            } else {
                textInputRef.current.classList.remove("showplaceholder");
            }
        }
    }, [data[textDataKey]]);

    async function enforceFlashcardStyle(e) {
        //Internal function for handling flashcard style changes
        const value = e.value;
        if (value === "canvas") {
            //"Switch" to canvas (define it as an empty canvas)
            pageRef.current.content[blockId][canvasDataKey] = "";
            setIsCanvas(true);
        } else {
            //"Switch" to text (clear non text data)
            delete pageRef.current.content[blockId][canvasDataKey];
            setIsCanvas(false);
        }
        pageRef.current.sendChange(blockId);
    }

    //Options for the select dropdown to choose flashcard type
    const selectOptions = [
        { value: "text", label: <MdTextFields /> }, //The label is a react-icons icon
        { value: "canvas", label: <MdDraw /> },
    ];

    return (
        <div className={"flashcard_side flashcard_side_" + side}>
            {isCanvas ? ( //If this is a canvas flashcard, show the canvas display
                <>
                    <div
                        className="flashcard_canvas"
                        onClick={() => setEditModalOpen(true)}
                    >
                        <CanvasDisplay
                            canvasDocumentData={data[canvasDataKey]}
                        />
                    </div>
                    {editModalOpen
                        ? //If the edit modal is open, a "portal" is made
                          //The purpose of the portal is to take the content which would be inside the flashcard
                          //And take it to the top of the page, so it can display over everything else free of the block
                          createPortal(
                              <div className="flashcard_canvas_modal_blur">
                                  <div className="flashcard_canvas_modal_overlay">
                                      <div className="flashcard_canvas_modal_content">
                                          <button
                                              className="flashcard_canvas_modal_close_button"
                                              onClick={() =>
                                                  setEditModalOpen(false)
                                              }
                                          >
                                              X Exit Drawing
                                          </button>
                                          <div className="flashcard_canvas_modal_canvas">
                                              {/*Tldraw whiteboard using the same setup as the diagramming block
                                                This means: no images, only one page, and connect to the editor handling module*/}
                                              <Tldraw
                                                  className="force_open_tlui"
                                                  acceptedImageMimeTypes={[]}
                                                  acceptedVideoMimeTypes={[]}
                                                  maxAssetSize={0}
                                                  options={{
                                                      maxPages: 1,
                                                  }}
                                                  onMount={setEditor}
                                              ></Tldraw>
                                          </div>
                                      </div>
                                  </div>
                              </div>,
                              document.body,
                          )
                        : null}
                </>
            ) : null}

            <div
                className="flashcard_text_box"
                contentEditable
                onInput={handleTextChanged}
                ref={textInputRef}
                placeholder={
                    side === "front"
                        ? "Front side text..."
                        : "Back side text..."
                }
            ></div>

            <div className="flashcard_type_select_container">
                <Select
                    className="flashcard_type_select"
                    unstyled={true}
                    defaultValue={selectOptions[isCanvas ? 1 : 0]}
                    options={selectOptions}
                    isSearchable={false}
                    classNamePrefix={"select"}
                    onChange={enforceFlashcardStyle}
                />
            </div>
        </div>
    );
}

export function PageTextFlashcardBlock({
    blockId,
    data,
    pageRef,
    children,
    ref,
}) {
    return (
        <div ref={ref} className="flashcard_text">
            <FlashcardSide
                side="front"
                data={data}
                pageRef={pageRef}
                blockId={blockId}
            />
            <FlashcardSide
                side="back"
                data={data}
                pageRef={pageRef}
                blockId={blockId}
            />
        </div>
    );
}
