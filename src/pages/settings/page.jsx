import { Link } from "react-router-dom";
import { AppLineBreak } from "../../components/app/line_break/component";
import { PageCenterContent } from "../../components/layout/pageCenterContent/component";
import { fetchApi } from "../../foundation/api";
import { useApi } from "../../foundation/useApiData";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./style.css";

export default function BuildPage() {
    const { data, loading, error } = useApi(async () => {
        const userInfo = await fetchApi("get_current_user_info", {});
        const notebooksInfo = await fetchApi("notebook/get_user_notebooks", {});

        return {
            userInfo,
            notebooksInfo,
        };
    });

    const currentModalNotebookId = useRef(null);
    const currentModalNotebookName = useRef(null);
    const [deleteNotebookModalOpen, setDeleteNotebookModalOpen] =
        useState(false);
    const [renameNotebookModalOpen, setRenameNotebookModalOpen] =
        useState(false);
    const renameNotebookInputRef = useRef(null);

    if (loading || error) return <></>;

    function setCurrentModalNotebook(notebookId) {
        if (notebookId === null) {
            currentModalNotebookId.current = null;
            currentModalNotebookName.current = null;
            return;
        }
        currentModalNotebookId.current = notebookId;
        const notebook = data.notebooksInfo.notebooks.find(
            (n) => n.notebookId === notebookId,
        );
        currentModalNotebookName.current = notebook.name;
    }

    //Generic method for closing all modals
    function closeAllModal() {
        setRenameNotebookModalOpen(false);
        setDeleteNotebookModalOpen(false);
        setCurrentModalNotebook(null);
        document.removeEventListener("click", closeModalOnOutsideClick);
    }

    function openModal(type, notebookId) {
        setCurrentModalNotebook(notebookId);
        if (type === "delete") {
            setDeleteNotebookModalOpen(true);
        } else if (type === "rename") {
            setRenameNotebookModalOpen(true);
        }
        document.addEventListener("click", closeModalOnOutsideClick);
    }

    //Deletion methods
    function openDeleteNotebookModal(notebookId) {
        openModal("delete", notebookId);
    }

    function confirmDeleteNotebook() {
        console.log("Deleting notebook");
        fetchApi("notebook/delete_notebook", {
            notebookId: currentModalNotebookId.current,
        }).then(() => {
            window.location.href = window.location.href;
        });
        closeAllModal();
    }

    //Renaming methods
    function openRenameNotebookModal(notebookId) {
        openModal("rename", notebookId);
    }

    function confirmRenameNotebook() {
        console.log("Renaming notebook");

        fetchApi("notebook/rename_notebook", {
            notebookId: currentModalNotebookId.current,
            newName: renameNotebookInputRef.current.value,
        }).then(() => {
            window.location.href = window.location.href;
        });

        closeAllModal();
    }

    //General modal methods
    function closeModalOnOutsideClick(e) {
        if (!e.target.closest(".notebook_modal_container")) {
            console.log("Clicked outside modal");
            closeAllModal();
        }
    }

    //Notebook creation method
    function createNewNotebook() {
        fetchApi("notebook/create_notebook", {}).then(() => {
            window.location.href = window.location.href;
        });
    }

    return (
        <>
            {deleteNotebookModalOpen || renameNotebookModalOpen
                ? createPortal(
                      <div className="notebook_modal_overlay">
                          <div className="notebook_modal_container">
                              {deleteNotebookModalOpen ? (
                                  <>
                                      <h2>Confirm delete</h2>
                                      <p>
                                          Are you sure you want to delete
                                          notebook:
                                          <br />
                                          <b>
                                              {currentModalNotebookName.current}
                                          </b>
                                          <br />
                                          This action cannot be undone and all
                                          notes inside the notebook will be
                                          deleted as well.
                                      </p>
                                      <button onClick={confirmDeleteNotebook}>
                                          Delete
                                      </button>
                                  </>
                              ) : renameNotebookModalOpen ? (
                                  <>
                                      <h2>Rename notebook</h2>
                                      Enter the new name for notebook:
                                      <br />
                                      <b>{currentModalNotebookName.current}</b>
                                      <input
                                          ref={renameNotebookInputRef}
                                          placeholder="New notebook name"
                                      />
                                      <button onClick={confirmRenameNotebook}>
                                          Rename
                                      </button>
                                  </>
                              ) : null}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}

            <PageCenterContent>
                <h1>
                    Settings <Link to={"/"}>(Return to app)</Link>
                </h1>
                <AppLineBreak />
                <h2>Account information</h2>
                <p>Display name: {data.userInfo.display_name}</p>
                <p>Email: {data.userInfo.email}</p>
                <p>Label name: {data.userInfo.label_name}</p>
                <AppLineBreak />
                <h2>Your notebooks</h2>

                <div className="notebooks_options_container">
                    {data.notebooksInfo.notebooks.map((notebook) => (
                        <div
                            key={notebook.notebookId}
                            className="notebook_options"
                        >
                            {notebook.name}
                            <div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        openRenameNotebookModal(
                                            notebook.notebookId,
                                        );
                                    }}
                                >
                                    Rename
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        openDeleteNotebookModal(
                                            notebook.notebookId,
                                        );
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    <button onClick={createNewNotebook}>
                        Create new notebook
                    </button>
                </div>
            </PageCenterContent>
        </>
    );
}
