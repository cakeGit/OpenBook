import { useEffect, useRef } from "react";
import "./style.css";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOCK_REGISTRY } from "../../../foundation/page/blockRegistry";

function setResultsForSearch(value, resultsRef, selectedAddBlockRef) {
    let results = [];

    if (value.length != 0) {
        for (const blockType in BLOCK_REGISTRY) {
            const blockDef = BLOCK_REGISTRY[blockType];
            let score = 0;

            if (blockDef.name.toLowerCase().includes(value.toLowerCase())) {
                score += 10;
            }

            if (
                blockDef.description.toLowerCase().includes(value.toLowerCase())
            ) {
                score += 5;
            }

            if (score > 0) {
                results.push({ blockType, score });
            }
            results = results.sort((a, b) => b.score - a.score);
        }
    } else {
        for (const blockType in BLOCK_REGISTRY) {
            results.push({ blockType });
        }
    }

    let first = true;

    resultsRef.current.innerHTML = results
        .map(({ blockType }) => {
            let wasFirst = first;
            first = false;
            return renderToStaticMarkup(
                <div className={wasFirst ? "selected_add_block" : ""}>
                    {BLOCK_REGISTRY[blockType].name}&nbsp;
                    <span className="add_block_description">
                        {BLOCK_REGISTRY[blockType].description}
                    </span>
                </div>
            );
        })
        .join("");

    selectedAddBlockRef.current =
        results.length > 0 ? results[0].blockType : null;
}

export function PageAddBlockPopover({ pageRef }) {
    const resultsRef = useRef(null);
    const selectedAddBlockRef = useRef(null);
    const pageModalRef = useRef(null);

    const adjacentBlockIdRef = useRef(null);
    const inputRef = useRef(null);

    const onType = (e) => {
        const value = e.target.value;

        setResultsForSearch(value, resultsRef, selectedAddBlockRef);
    };

    const onSubmit = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (!selectedAddBlockRef.current) return;

        let newBlockId = pageRef.current.createNewBlock(
            BLOCK_REGISTRY[selectedAddBlockRef.current].type, //Convert the registry id, i.e "textHeader", to the actual block type, i.e. "text"
            adjacentBlockIdRef.current,
            selectedAddBlockRef.current in BLOCK_REGISTRY
                ? BLOCK_REGISTRY[selectedAddBlockRef.current].defaultData
                : {}
        );
        pageModalRef.current.style.display = "none";
        inputRef.current.value = "";
    };

    const onBlur = (e) => {
        pageModalRef.current.style.display = "none";
    };

    useEffect(() => {
        if (!pageRef.current) return;

        pageRef.current.openAddBlockPopover = (adjacentBlockId, blockRef) => {
            const rect = blockRef.current.getBoundingClientRect();
            pageModalRef.current.style.top = `${
                rect.bottom
            }px`;
            pageModalRef.current.style.left = `${rect.left + window.scrollX}px`;

            adjacentBlockIdRef.current = adjacentBlockId;
            setResultsForSearch("", resultsRef, selectedAddBlockRef);

            pageModalRef.current.style.display = "block";
            inputRef.current.focus();
        };
    }, [pageRef]);

    return (
        <div
            style={{ display: "none", position: "fixed" }}
            ref={pageModalRef}
        >
            <input
                placeholder="Type the name of the block to insert, enter to confirm"
                onChange={onType}
                onKeyDown={onSubmit}
                onBlur={onBlur}
                ref={inputRef}
            />
            <div ref={resultsRef}></div>
        </div>
    );
}
