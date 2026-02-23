import { useState, useEffect } from "react";
import "./math.css";
import { addStyles, EditableMathField } from "react-mathquill";

//Add in the necassary stylesheet for react-mathquill to work
addStyles();

export function PageMathBlock({ blockId, data, pageRef, children, blockRef }) {
    const [mathContent, setMathContent] = useState(data.mathContent || "");

    //When the change is recived from react-mathquill, update the page data and server
    function onMathChanged(mathField) {
        let latex = mathField.latex();
        setMathContent(latex);
        pageRef.current.content[blockId].mathContent = latex;
        pageRef.current.onChange(blockId);
    }

    //Update the display if it differs from what was recived from the server
    useEffect(() => {
        if (data.mathContent != mathContent)
            setMathContent(data.mathContent);
    }, [data.mathContent]);

    return (
        <div>
            <EditableMathField
            className="math_box"
                latex={mathContent}
                onChange={onMathChanged}
            />
        </div>
    );
}
