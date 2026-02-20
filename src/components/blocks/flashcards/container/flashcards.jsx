import { useState } from "react";
import { useTargetableSubcomponentContainer } from "../../foundation/useTargetableSubcomponentContainer.jsx";
import "./flashcards.css";
import { FlexCenter } from "../../../app/flex_center/component.jsx";
import { AppLineBreak } from "../../../app/line_break/component.jsx";

export function PageFlashcardsBlock({ blockId, data, pageRef, children, blockRef }) {
    const { subcontainerElement } = useTargetableSubcomponentContainer(
        pageRef,
        blockId,
        children,
        "flashcard",
    );

    const [collapsed, setCollapsed] = useState(false); //Local state, doesent sync to page data, determines if flashcards are shown

    function addNewFlashcard() {//Called on click of the + button
        pageRef.current.createNewBlockInside("flashcard", blockId);
    }

    return (
        <div ref={blockRef} className="flashcards_block_container">
            <h2>
                Flashcards&nbsp;
                {/* Collapse/Expand button */}
                <button onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? "Expand" : "Collapse"}
                </button>
            </h2>
            {!collapsed ? (
                <>
                    <AppLineBreak />
                    <div className="flashcards_content">
                        {subcontainerElement}{/*Flashcards get rendered into here*/}
                        <FlexCenter>
                            <button
                                onClick={addNewFlashcard}
                                className="flashcard_add_button"
                            >
                                +
                            </button>
                        </FlexCenter>
                    </div>
                </>
            ) : null}
        </div>
    );
}
