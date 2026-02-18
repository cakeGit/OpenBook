import { fetchApi } from "../../../foundation/api";
import { useRef } from "react";
import { SettingsModal } from "./settingsModal.jsx";

//Modal inner component, which just goes inside the generic modal container
//Contains a cancel and a submit button while also providing an input for the new notebook name
function RenameModalInner({ modal }) {
    const renameNotebookInputRef = useRef();

    //Create the submit function, which calls the API
    function submitRename() {
        fetchApi("notebook/rename_notebook", {
            notebookId: modal.notebookId,
            newName: renameNotebookInputRef.current.value,
        }).then(() => {
            //Once the api call finished, call onSubmit (closes the modal and reloads the page)
            modal.onSubmit();
        });
    }

    return (
        <>
            <h2>Rename notebook</h2>
            Enter the new name for notebook:
            <br />
            <b>{modal.notebookName}</b>
            <input
                ref={renameNotebookInputRef}
                placeholder="New notebook name"
            />
            <div className="right_button_row">
            <button onClick={() => modal.closeModal()}>Cancel</button>
            <button onClick={submitRename}>Rename</button>
            </div>
        </>
    );
}

//Extend the settings modal, provide the inner component, and for this modal type, notebookId and name are stored
export class RenameNotebookModal extends SettingsModal {
    constructor(notebookId, notebookName, setModal) {
        super(RenameModalInner, setModal);
        this.notebookId = notebookId;
        this.notebookName = notebookName;
    }
}
