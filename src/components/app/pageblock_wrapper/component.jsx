import { useRef, useState } from "react";
import { renderBlock } from "../../../foundation/blockRenderer.jsx";
import { createDragHandler } from "./drag.jsx";
import "./style.css";
import { createDeleteBlockHandler } from "./delete.jsx";
import { createAddBlockHandler } from "./add.jsx";
import { BLOCK_TYPE_REGISTRY } from "../../../foundation/page/typeRegistry.mjs";
import { BsThreeDotsVertical } from "react-icons/bs";
import { createCloneBlockHandler } from "./clone.jsx";
import { FaPlus } from "react-icons/fa";
import { createPortal } from "react-dom";

//Page block wrapper is a component that wraps each block in the page editor, provides drag and drop functionality
export function PageBlockWrapperComponent({
    blockId,
    pageRef,
    children,
    wrapperRef,
}) {
    const blockRef = useRef(null);
    const draggerRef = useRef(null);
    const controlsRef = useRef(null);

    const [data, setData] = useState(pageRef.current.content[blockId]);
    pageRef.current.content[blockId].setData = setData;

    const [optionsOpen, setOptionsOpen] = useState(false);

    const [deletePromptOpen, setDeletePromptOpen] = useState(false);

    const hidesAddButton =
        BLOCK_TYPE_REGISTRY[data.type]?.hidesAddButton || false;
    const hidesDragButton =
        BLOCK_TYPE_REGISTRY[data.type]?.hidesDragButton || false;

    function handleOpenOptionsClick(e) {
        e.preventDefault();

        //If right click, open options menu, listen for click outside to close
        setOptionsOpen(true);
        function handleClickOutside(event) {
            if (
                controlsRef.current &&
                !controlsRef.current.contains(event.target)
            ) {
                setOptionsOpen(false);
                document.removeEventListener("mousedown", handleClickOutside);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
    }

    const startDragging = createDragHandler(blockId, pageRef, wrapperRef);

    function onDraggerMouseDown(e) {
        //Bind mousemove, and mouse up, if the user releases before moving at least 5 px (either axis), treat as long press for options
        const startPos = {
            x: e.clientX,
            y: e.clientY,
        };
        let isDragging = false; //Ensure that even if event listenrs are unbound too slow they dont desync

        function onMouseMove(moveEvent) {
            const deltaX = moveEvent.clientX - startPos.x;
            const deltaY = moveEvent.clientY - startPos.y;

            if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) >= 5) {
                isDragging = true;
                //Unbind mousemove and mouseup
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                //Start dragging
                startDragging(e);
            }
        }

        function onMouseUp() {
            if (!isDragging) {
                //Treat as long press for options
                handleOpenOptionsClick(e);
            }

            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    const deleteBlockHandler = createDeleteBlockHandler(
        blockId,
        pageRef,
        wrapperRef,
        null,
        setDeletePromptOpen
    );

    return (
        <>
            {deletePromptOpen &&
                createPortal(
                    <div className="delete_prompt_overlay">
                        <div className="delete_prompt_container">
                            <h3>Warning!</h3>
                            <p>Are you sure you want to delete this block? (and all sub-blocks)</p>
                            <div className="delete_prompt_buttons">
                                <button
                                    onClick={() => setDeletePromptOpen(false)}
                                >
                                    Do not delete
                                </button>
                                <button
                                className="confirm_delete_button"
                                    onClick={() => {
                                        deleteBlockHandler(null, true);
                                        setDeletePromptOpen(false);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
            <div
                ref={wrapperRef}
                className="page_block_wrapper"
                data-blockid={blockId}
            >
                <div
                    className={
                        "page_block_controls_container " +
                        (optionsOpen
                            ? "page_block_controls_open_container"
                            : "")
                    }
                    onContextMenu={handleOpenOptionsClick}
                    ref={controlsRef}
                >
                    {optionsOpen && (
                        <div className="page_block_options">
                            <div className="page_block_options_container">
                                <button
                                    onMouseDown={createCloneBlockHandler(
                                        blockId,
                                        pageRef,
                                        wrapperRef,
                                    )}
                                    className="page_block_cloner"
                                >
                                    Clone
                                </button>
                                <button
                                    onMouseDown={deleteBlockHandler}
                                    className="page_block_binner"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                    {!hidesDragButton ? (
                        <button
                            ref={draggerRef}
                            onMouseDown={onDraggerMouseDown}
                            className={
                                "page_block_dragger " +
                                (optionsOpen ? "expanded_dragger" : "")
                            }
                        >
                            <BsThreeDotsVertical />
                        </button>
                    ) : null}
                    {!hidesAddButton ? (
                        <button
                            onMouseDown={createAddBlockHandler(
                                blockId,
                                pageRef,
                                wrapperRef,
                            )}
                            className="page_block_adder"
                        >
                            <FaPlus />
                        </button>
                    ) : null}
                </div>
                <div className="page_block_container">
                    {renderBlock(blockId, data, children, pageRef, blockRef)}
                </div>
            </div>
        </>
    );
}
