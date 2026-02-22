import { useState } from "react";
import { fetchApi } from "../../../../foundation/api";
import { useApi } from "../../../../foundation/useApiData";
import "./style.css";
import { useNavigate } from "react-router-dom";

export function AppSidebarNoteBookSelect({ currentName, currentNotebookId }) {
    const { data, loading, error } = useApi(async () => {
        const response = await fetchApi("notebook/get_user_notebooks");
        return response.notebooks.filter(
            (notebook) => notebook.notebookId !== currentNotebookId,
        ); // Remove the current notebook
    });
    const [selectOpen, setSelectOpen] = useState(false);
    const navigate = useNavigate();

    if (loading || error) return <></>;


    function closeSelect() {
        console.log("Closing notebook select");
        setSelectOpen(false);
        document.removeEventListener("click", checkForClickOffSelect);
    }

    function checkForClickOffSelect(e) {
        //Check if we didnt click on the select or the options container, and if not, close the select
        if (
            //Closest tries to find the parent with the following class (meaning the container we clicked on)
            // However, if the container isnt a parent of the clicked element, it will return null, so we close
            !e.target.closest(".app_sidebar_notebook_select_options_container")
        ) {
            closeSelect();
        }
    }

    function openNotebookSelect(e) {
        e?.stopPropagation(); //Stop the click from immediately closing the select

        if (selectOpen) {
            closeSelect(); //Clicking an already open notebook select should just close it
            return;
        }
        setSelectOpen(true);
        document.addEventListener("click", checkForClickOffSelect);
    }

    async function setNotebookTo(notebookId) {
        setSelectOpen(false);
        document.removeEventListener("click", checkForClickOffSelect);
        navigate(`/?notebook_id=${notebookId}`, { replace: true });
    }

    return (
        <>
            <div
                className="app_sidebar_notebook_select"
                onClick={openNotebookSelect}
            >
                {currentName}
            </div>

            <div className="app_sidebar_notebook_select_options_container">
                {selectOpen && ( //Only show the following if selectOpen is true
                    <div className="app_sidebar_notebook_select_options">
                        {(data.length === 0 && (
                            //If the user has no notebooks they can switch to
                            <p>You have no other notebooks!</p>
                        )) ||
                            //Otherwise, display the list of notebooks
                            data.map((notebook) => (
                                <div
                                    key={notebook.notebookId}
                                    onClick={(e) =>
                                        setNotebookTo(notebook.notebookId)
                                    }
                                    className="app_sidebar_notebook_select_option"
                                >
                                    {notebook.name}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </>
    );
}
