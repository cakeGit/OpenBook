import { useEffect, useRef } from "react";
import "./text.css";
import { useTargetableSubcomponentContainer } from "../foundation/useTargetableSubcomponentContainer.jsx";
import { AppLineBreak } from "../../app/line_break/component.jsx";
import { DeleteBlockOperation } from "../../../../backend/web/foundation_safe/page/pageOperations.js";

let textRenderAutofocusId = null; //Used to make the next time a text block renders of this id to focus the box

export function PageTextBlock({ blockId, data, pageRef, children, ref }) {
    const { subcontainerElement } = useTargetableSubcomponentContainer(
        pageRef,
        blockId,
        children,
    );
    const textInputRef = useRef(null);
    const currentTextContent = useRef(null);

    function handlePlusShortcut(newTextContent) {
        let removedPlus = newTextContent.slice(0, -1);
        textInputRef.current.innerText = removedPlus;
        pageRef.current.openAddBlockPopover(blockId, ref, () => {
            //On blur / they exit from the add block popover, put the text (with +) back
            if (textInputRef.current) {
                textInputRef.current.innerText = newTextContent;
                pageRef.current.content[blockId].textContent = newTextContent;
                pageRef.current.sendChange(blockId);
            }
        });
        return;
    }

    function handleNewlineSplit(newTextContent) {
        const lines = newTextContent.split(/\n+/g);

        //If there is nothing to split, just clear the newlines from the text
        if (lines.filter((line) => line.trim() !== "").length === 0) {
            textInputRef.current.innerText = "";
            pageRef.current.content[blockId].textContent = "";
            pageRef.current.sendChange(blockId);
            return;
        }

        //Update the current block to be the first line
        textInputRef.current.innerText = lines[0];
        pageRef.current.content[blockId].textContent = lines[0];
        pageRef.current.sendChange(blockId);

        //For each additional line, add a new text block with that line as the content
        let previousBlockId = blockId;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            previousBlockId = pageRef.current.createNewBlock(
                "text", //Convert the registry id, i.e "textHeader", to the actual block type, i.e. "text"
                previousBlockId,
                {
                    textContent: line,
                    subtype: data.subtype, //Keep the same subtype as the original block
                },
            );
        }
        textRenderAutofocusId = previousBlockId; //Focus the last of the new blocks that were just created
    }

    function handleTextChanged(e) {
        if (textInputRef.current) {
            let newTextContent = textInputRef.current.innerText;

            //If they type a +, trigger the add block popover
            if (newTextContent.endsWith("+")) {
                handlePlusShortcut(newTextContent);
                return;
            }

            //If there is a new line, split the block
            if (newTextContent.includes("\n")) {
                handleNewlineSplit(newTextContent);
                return;
            }

            pageRef.current.content[blockId].textContent =
                newTextContent;
            pageRef.current.sendChange(blockId);
            currentTextContent.current = data.textContent || "";
            if (data.textContent.trim() === "") {
                textInputRef.current.classList.add("showplaceholder");
            } else {
                textInputRef.current.classList.remove("showplaceholder");
            }
        }
    };

    function putSelectionAtEnd(element) {
        //Code from artificialworlds.net
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse();
        const sel = document.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // - Puts a selection at the end of the line
    }

    function handlePotentialDelete(e) {
        if (e.key === "Backspace" && textInputRef.current.innerText === "") {
            e.preventDefault();

            //try find if there is a text block before this one, if so, focus now
            let previousBlock = pageRef.current.getPreviousBlock(blockId);
            if (previousBlock && previousBlock.type === "text") {
                //If we have a valid previous text block, try focus it
                if (previousBlock.ref.current) {
                    //Find the text box within the blocks reference
                    const textBox =
                        previousBlock.ref.current.querySelector(".text_box");
                    if (textBox) {
                        putSelectionAtEnd(textBox);
                    }
                }
            }

            //Finally, delete this block
            pageRef.current.performAndSendOperation(
                new DeleteBlockOperation(blockId),
            );
        }
    }

    useEffect(() => {
        if (data.textContent !== currentTextContent.current) {
            textInputRef.current.innerText = data.textContent || "";
            currentTextContent.current = data.textContent || "";
            if (!data.textContent || data.textContent.trim() === "") {
                textInputRef.current.classList.add("showplaceholder");
            } else {
                textInputRef.current.classList.remove("showplaceholder");
            }
        }
    });

    useEffect(() => {
        if (textRenderAutofocusId === blockId) {
            textInputRef.current.focus();
            textRenderAutofocusId = null;
        }
    }, [textInputRef]);

    return (
        <>
            <div ref={ref} className="page_text_block_container">
                <div
                    className={
                        "text_box text_box_" + (data.subtype || "unknown")
                    }
                    contentEditable
                    /*onClick={handleTextClick}*/ /*onBlur={handleTextLeave}*/ onInput={
                        handleTextChanged
                    }
                    ref={textInputRef}
                    onKeyDown={handlePotentialDelete}
                    placeholder="Write text here... Type + to add blocks"
                ></div>
            </div>
            {data.subtype === "header" ? (
                <AppLineBreak className="text_header_underline" />
            ) : null}
            {subcontainerElement}
        </>
    );
}
