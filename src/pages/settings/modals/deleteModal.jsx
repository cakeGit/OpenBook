import { fetchApi } from "../../../foundation/api";
import { SettingsModal } from "./settingsModal.jsx";

//Modal inner component, which just goes inside the generic modal container
//Contains a cancel and a delete button while also providing a warning about which notebook will be deleted
function DeleteModalInner({ modal }) {
    function submitDelete() {
        fetchApi("notebook/delete_notebook", {
            notebookId: modal.notebookId,
        }).then(() => {
            modal.onSubmit();
        });
    }
    return (
        <>
            <h2>Confirm delete</h2>
            <p>
                Are you sure you want to delete notebook:
                <br />
                <b>{modal.notebookName}</b>
                <br />
                This action cannot be undone and all notes inside the notebook
                will be deleted as well.
            </p>
            <div className="right_button_row">
                <button onClick={() => modal.closeModal()}>Cancel</button>
                <button onClick={submitDelete}>Delete</button>
            </div>
        </>
    );
}

//Extend the settings modal, provide the inner component, and for this modal type, notebookId and name are stored
export class DeleteNotebookModal extends SettingsModal {
    constructor(notebookId, notebookName, setModal) {
        super(DeleteModalInner, setModal);
        this.notebookId = notebookId;
        this.notebookName = notebookName;
    }
}
