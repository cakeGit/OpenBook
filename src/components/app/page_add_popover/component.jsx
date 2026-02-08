import { useEffect, useRef, useState } from "react";
import "./style.css";
import { BLOCK_REGISTRY } from "../../../foundation/page/blockRegistry";

//The search function, which is for the most part preserved from the old system
function getResultsForSearch(search, selectedAddBlockTypeRef) {
    let results = [];

    if (search.length > 0) {
        //If there is a search query, then we add a score to each block
        //This score is based on whether the search query is present in the block name or description
        //This score also is weighted based on if it was in the name (score of 10) or description (score of 5)
        for (const blockType in BLOCK_REGISTRY) {
            const blockDef = BLOCK_REGISTRY[blockType];
            let score = 0;

            if (blockDef.name.toLowerCase().includes(search.toLowerCase())) {
                score += 10;
            }

            if (
                blockDef.description
                    .toLowerCase()
                    .includes(search.toLowerCase())
            ) {
                score += 5;
            }

            if (score > 0) {
                //If there was any match at all, we include it in the results
                //Push the block type and its score to the results array
                results.push({
                    blockType,
                    score, //Include the score in the results so we can sort based on it
                    // ...this is an optional element in the results, and is generally just internal
                });
            } //Otherwise quietly ignore this element
        }
        //Sort based on score, so that most relevant items are first
        results = results.sort((a, b) => b.score - a.score);
    } else {
        //Otherwise, just include everything
        for (const blockType in BLOCK_REGISTRY) {
            results.push({ blockType });
        }
    }

    selectedAddBlockTypeRef.current =
        results.length > 0 ? results[0].blockType : null;

    return results; //Return the results
}

//This component handles the rendering of all the results from getResultsForSearch
function SearchResults({ results, submitAndPlace }) {
    let first = true;

    if (!results || results.length === 0) {
        return <></>;
    }

    return (
        <div className="page_add_block_popover_search_results">
            {...results.map(({ blockType }) => {
                let wasFirst = first;
                first = false;
                return (
                    <button
                        className={
                            "page_add_block " +
                            (wasFirst ? "selected_add_block" : "")
                        }
                        onMouseDown={() => {
                            //submitAndPlace is now a method in of itself,
                            //This means we can add a click handler to this, to place the block
                            submitAndPlace(blockType);
                        }}
                    >
                        {BLOCK_REGISTRY[blockType].name}&nbsp;
                        <span className="add_block_description">
                            {BLOCK_REGISTRY[blockType].description}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

//This component is the actual popover that appears when you click the add block button on a block
//It will always be in the page, it will just toggle display on and off
export function PageAddBlockPopover({ pageRef }) {
    const selectedAddBlockTypeRef = useRef(null);
    const pageModalRef = useRef(null);

    const adjacentBlockIdRef = useRef(null);
    const inputRef = useRef(null);

    const closeWithoutAddRef = useRef(null);

    const [results, setResults] = useState(null);

    //When the user types in the input, we update the search results based on the search query
    function onType(e) {
        const search = e.target.value;

        setResults(getResultsForSearch(search, selectedAddBlockTypeRef));
    }

    //When the enter key is pressed inside the input we just place whichever was the top result
    function onSubmit(e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (!selectedAddBlockTypeRef.current) return;

        submitAndPlace(selectedAddBlockTypeRef.current);
    }

    //The function used to actually place the block on the page
    //This may be called by pressing enter and placing the top result, or by clicking the block in the reults
    function submitAndPlace(registryEntryId) {
        console.log("Submitting and placing block of type:", registryEntryId);
        pageRef.current.createNewBlock(
            BLOCK_REGISTRY[registryEntryId].type, //Convert the registry id, i.e "textHeader", to the actual block type, i.e. "text"
            adjacentBlockIdRef.current,
            BLOCK_REGISTRY[registryEntryId].defaultData,
        );
        pageModalRef.current.style.display = "none";
        inputRef.current.value = "";
    }

    //Close the popover, just hide it
    function onBlur(e) {
        pageModalRef.current.style.display = "none";
        if (closeWithoutAddRef.current) {
            closeWithoutAddRef.current();
        }
    }

    //When the page is loaded we need to make the method used to open this popover available
    useEffect(() => {
        if (!pageRef.current) return;

        //Extend the page with an openAddBlockPopover method, since everything has access to it
        //This method can then be called by the pageblocks
        pageRef.current.openAddBlockPopover = (adjacentBlockId, blockRef, onCloseWithoutAdd) => {
            closeWithoutAddRef.current = onCloseWithoutAdd;

            const rect = blockRef.current.getBoundingClientRect();
            //Position the popover based on the block's position
            pageModalRef.current.style.top = `${rect.bottom}px`;
            pageModalRef.current.style.left = `${rect.left}px`;

            //Store which block we are placing the new block after
            adjacentBlockIdRef.current = adjacentBlockId;
            //clear the results before we open
            setResults(getResultsForSearch("", selectedAddBlockTypeRef));

            pageModalRef.current.style.display = "block";
            inputRef.current.focus();
        };
    }, [pageRef]);

    return (
        <div
            className="page_add_block_popover"
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
            <SearchResults results={results} submitAndPlace={submitAndPlace} />
        </div>
    );
}
