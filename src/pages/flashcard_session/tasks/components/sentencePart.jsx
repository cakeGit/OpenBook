import { useRef } from "react";

export function SentencePart({
    content,
    isPallette,
    sentencePalletteContent,
    sentenceBuilderContent,
    targets,
    tickRenderer,
}) {
    const thisRef = useRef(null);
    const lastHoveredElement = useRef(null);

    function moveElement(fromArray, toArray) {
        const index = fromArray.indexOf(content);
        if (index !== -1) {
            fromArray.splice(index, 1);
            toArray.push(content);
            tickRenderer();
        } else {
            console.warn("Element not found in source array");
        }
    }

    function getClosestTarget(mouseX, mouseY) {
        let closestTarget = null;
        let closestDistance = Infinity;
        for (let target of targets) {
            let targetRef = target.ref;
            const rect = targetRef.current.getBoundingClientRect();

            const targetX = rect.left + rect.width / 2;
            const targetY = rect.top + rect.height / 2;

            const deltaX = mouseX - targetX;
            const deltaY = mouseY - targetY;

            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance < closestDistance) {
                closestTarget = target;
                closestDistance = distance;
            }
        }
        return closestTarget;
    }

    function moveToTarget(target) {
        //Move from anywhere to the builder specifically
        //Remove from current array before putting in the target position
        const fromArrayRef = isPallette
            ? sentencePalletteContent
            : sentenceBuilderContent;

        fromArrayRef.splice(fromArrayRef.indexOf(content), 1);

        //If the target index is greater than the current length, just push to end
        if (target.index >= sentenceBuilderContent.length) {
            sentenceBuilderContent.push(content);
        } else {
            //Othwise insert at target index
            sentenceBuilderContent.splice(target.index, 0, content);
        }
        tickRenderer();
    }

    //Create some safe access functions for hover state,
    function hover(target) {
        //Give the target element a "sentence_builder_hovered_target" class
        target.ref.current.classList.add("sentence_builder_hovered_target");
        lastHoveredElement.current = target.ref.current;
    }

    function clearCurrentHover(newHoverTarget = null) {
        if (lastHoveredElement.current !== newHoverTarget?.ref.current) {
            if (lastHoveredElement.current) {
                lastHoveredElement.current.classList.remove(
                    "sentence_builder_hovered_target",
                );
                lastHoveredElement.current = null;
            }
            return true;
        } else {
            return false;
        }
    }

    const mouseStartPos = useRef(null);
    const isDragging = useRef(false);
    const isMouseDown = useRef(false);

    function handleMouseDown(e) {
        e.preventDefault();
        //Note down where this started, it is important we dont start dragging yet
        mouseStartPos.current = { x: e.clientX, y: e.clientY };
        isMouseDown.current = true;

        //Bind these global listeners so any movement / mouseup is captured
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }

    function handleMouseMove(e) {
        e.preventDefault();
        const deltaX = e.clientX - mouseStartPos.current.x;
        const deltaY = e.clientY - mouseStartPos.current.y;
        if (
            !isDragging.current &&
            isMouseDown.current &&
            (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)
        ) {
            //If we have moved by more than 5px in either axis, start dragging, since that was likely intentional
            isDragging.current = true;
        }

        if (isDragging.current) {
            thisRef.current.style.position = "fixed";
            thisRef.current.style.left = `${e.clientX}px`;
            thisRef.current.style.top = `${e.clientY}px`;
        }

        let closestTarget = getClosestTarget(e.clientX, e.clientY);
        //Clear current hover when provided with the new target will return if a change will actually be made
        //If there is no change, skip editing the classes
        if (clearCurrentHover(closestTarget) && closestTarget) {
            hover(closestTarget);
        }
    }

    function handleMouseUp(e) {
        e.preventDefault();
        isMouseDown.current = false;
        //Unbind the listeners
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        if (isDragging.current) {
            //Handle a drop
            isDragging.current = false;

            let closestTarget = getClosestTarget(e.clientX, e.clientY);
            if (closestTarget) {
                moveToTarget(closestTarget);
            }
            //Reset positioning styles
            thisRef.current.style.position = "static";
            thisRef.current.style.left = null;
            thisRef.current.style.top = null;

            clearCurrentHover();
        } else {
            //Handle click / fast move
            if (isPallette) {
                moveElement(sentencePalletteContent, sentenceBuilderContent);
            } else {
                moveElement(sentenceBuilderContent, sentencePalletteContent);
            }
        }
        tickRenderer();
    }

    return (
        <div
            className={`sentence_part ${isPallette ? "sentence_pallette_part" : "sentence_builder_part"}`}
            onMouseDown={handleMouseDown}
            ref={thisRef}
        >
            {content.text}
        </div>
    );
}
