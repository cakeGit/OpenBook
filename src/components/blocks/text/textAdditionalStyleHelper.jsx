//Highlighting relies on the document.execCommand API, couldnt find a good enough alternative library
//This is technically deprecated, but there is no replacement and it seems to it will be supported for a long time
function isHighlightActive() {
    //To properly get the current highlight from the document /selection
    // (including if the user has pressed ctrl+h at the end of a highlight block making it not actually highlight)
    // The query command value is used, with either chrome naming or firefox naming
    const currentColor = document.queryCommandValue("backColor") || document.queryCommandValue("hiliteColor");
    return currentColor === "rgb(255, 255, 0)"; //Yellow gets flattened to the rgb value, so we have to check for that instead
}

function toggleHighlightActive(active) {
    document.execCommand(
        "hiliteColor",
        false,
        active ? "yellow" : "transparent",
    );
}

function isCurrentRangeInsideAHighlight() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
        return false;
    }
    const range = selection.getRangeAt(0);
    //Recursivley, check if parent is span and has "background-color: yellow;" style (explicit tag). If we reach .text_box or body without finding it, return false
    function isNodeHighlighted(node) {
        if (!node) {
            return false;
        }
        if (node.classList?.contains("text_box") || node === document.body) {
            return false;
        }
        if (node.tagName === "SPAN" && node.style?.backgroundColor === "yellow") {
            return true;
        }
        return isNodeHighlighted(node.parentElement);
    }
    return isNodeHighlighted(range.startContainer);
}

//List of the extra styles (on top of bold, italic, etc that exist in the document)
const extraStyles = {
    highlight: {
        isActive: isHighlightActive,
        toggleActive: toggleHighlightActive,
        isActiveInCurrentSelection: isCurrentRangeInsideAHighlight,
        ctrlKeybind: "h",
    },
};

export function onKeyDownForTextAdditionalStyles(e) {
    for (const styleName in extraStyles) {
        const style = extraStyles[styleName];
        if (e.ctrlKey && e.key.toLowerCase() === style.ctrlKeybind) {
            e.preventDefault();
            style.toggleActive(!style.isActive());
        }
    }
}

export function onBlurTextAdditionalStyles() {
    for (const styleName in extraStyles) {
        const style = extraStyles[styleName];
        if (style.isActive()) {
            style.toggleActive(false);
        }
    }
}
export function onSelectionChange(e) {
//     //Check for if current selection is a style and if so upate the state
//     for (const styleName in extraStyles) {
//         const style = extraStyles[styleName];
//         const active = style.isActiveInCurrentSelection();
//         console.log("Style " + styleName + " active in selection: " + active);
//         if (active !== style.isActive()) {
//             style.toggleActive(active);
//         }
//     }
}
