import { useRef, useState } from "react";
import { PageCenterContent } from "../../components/layout/pageCenterContent/component.jsx";
import { fetchApi } from "../../foundation/api.js";
import { useApi } from "../../foundation/useApiData.js";
import "./style.css";
import { AppLineBreak } from "../../components/app/line_break/component.jsx";

function collectPageIdsRecursively(pages) {
    let ids = [];
    for (const page of pages) {
        ids.push(page.pageId);
        if (page.children && page.children.length > 0) {
            ids = ids.concat(collectPageIdsRecursively(page.children));
        }
    }
    return ids;
}

function createBulkSelectionControl(
    pages,
    parentId,
    selectedPageIdsRef,
    updateRender,
) {
    const allPageIds = collectPageIdsRecursively(pages);
    allPageIds.push(parentId);
    const allSelected = allPageIds.every((id) =>
        selectedPageIdsRef.current.has(id),
    );
    const performAction = () => {
        if (allSelected) {
            //Deselect all in the group
            for (const id of allPageIds) {
                selectedPageIdsRef.current.delete(id);
            }
        } else {
            //Select all in the group
            for (const id of allPageIds) {
                selectedPageIdsRef.current.add(id);
            }
        }
        updateRender((r) => r + 1); //Force rerender of the structure so the checkboxes update
    };
    return (
        <button onClick={performAction}>
            {allSelected ? "Exclude All" : "Include All"}
        </button>
    );
}

function FlashcardPageSelectionItem({
    page,
    selectedPageIdsRef,
     updateRender,
}) {
    const hasChildren = page.children && page.children.length > 0;
    return (
        <div key={page.pageId} className="flashcard_page_selection_item">
            <input
                type="checkbox"
                checked={selectedPageIdsRef.current.has(page.pageId)}
                onChange={(e) => {
                    //Toggle the selection of this page specifically
                    if (e.target.checked) {
                        selectedPageIdsRef.current.add(page.pageId);
                    } else {
                        selectedPageIdsRef.current.delete(page.pageId);
                    }
                    updateRender((r) => r + 1); //Force rerender to ensure checkbox updates
                }}
            />
            &nbsp;
            {page.name}&nbsp;
            {hasChildren //If we have children, show the bulk selection control, so "Include All" / "Exclude All"
                ? createBulkSelectionControl(
                      page.children,
                      page.pageId,
                      selectedPageIdsRef,
                      updateRender,
                  )
                : null}
            {hasChildren ? (
                <div style={{ marginLeft: "20px" }}> {/*Indent child pages*/}
                    <FlashcardPageSelectionLevel
                        pages={page.children}
                        selectedPageIdsRef={selectedPageIdsRef}
                        updateRender={updateRender}
                    />
                </div>
            ) : null}
        </div>
    );
}

//Recursive render of the page selection structure tree
function FlashcardPageSelectionLevel({
    pages,
    selectedPageIdsRef,
    updateRender,
}) {
    return (
        <div className="flashcard_page_selection_level">
            {pages.map((page) => {
                return (
                    <FlashcardPageSelectionItem
                        key={page.pageId}
                        page={page}
                        selectedPageIdsRef={selectedPageIdsRef}
                        updateRender={updateRender}
                    />
                );
            })}
        </div>
    );
}

function BuildPage() {
    const [_, updateRender] = useState(0);
    const selectedPageIdsRef = useRef(new Set()); //A faster version of a list, since we dont need order
    const sessionOptionRef = useRef(null);

    //Get the current notebook from the query selector, if absent, send the user back to the app
    const notebookId = new URLSearchParams(window.location.search).get(
        "notebook_id",
    );

    if (!notebookId || notebookId == "null") {
        window.location.href = "/";
        return <></>;
    }

    const { data, loading, error } = useApi(async () => {
        return await fetchApi("flashcards/get_selectable_pages", {
            notebookId,
        });
    });
    if (loading || error) return <></>;

    function startFlashcardSession() {
        //Load selected ids into the session storage and send the user to the flashcard session page
        const selectedPageIds = Array.from(selectedPageIdsRef.current);
        sessionStorage.setItem(
            "flashcard_session_selected_page_ids",
            JSON.stringify(selectedPageIds),
        );
        sessionStorage.setItem(
            "flashcard_session_option",
            sessionOptionRef.current.value,
        );
        window.location.href = "/flashcard_session?notebook_id=" + notebookId;
    }

    return (
        <PageCenterContent>
            <h1>Start flashcard revision session</h1>
            <AppLineBreak />
            <br />
            <h2>Select pages to revise from</h2>
            <AppLineBreak />
            <br />
            <FlashcardPageSelectionLevel
                pages={data.children}
                selectedPageIdsRef={selectedPageIdsRef}
                updateRender={updateRender}
            />
            <br />
            <h2>Session options</h2>
            <AppLineBreak />
            <br />
            <select ref={sessionOptionRef}>
                <option value="self_assess">
                    Self-assess (show answer, then rate confidence)
                </option>
                <option value="multi_choice">
                    Multiple choice (Pick out of 4)
                </option>
                <option value="sentence_builder">
                    Sentence builder (Construct the answer from words, disables non-text answers)
                </option>
            </select>
            <br />
            <br />
            <AppLineBreak />
            <br />
            <button onClick={startFlashcardSession}>Go!</button>
        </PageCenterContent>
    );
}

export default BuildPage;
