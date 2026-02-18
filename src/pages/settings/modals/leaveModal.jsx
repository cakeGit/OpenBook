import { fetchApi } from "../../../foundation/api";
import { SettingsModal } from "./settingsModal.jsx";

//Modal inner component, which just goes inside the generic modal container
//Contains a cancel and a leave button while also providing a warning about which notebook will be left
function LeaveModalInner({ modal }) {
    function submitLeave() {
        fetchApi("share/revoke_notebook_share", {
            notebookId: modal.notebookId,
            revokeUserId: modal.userId,
        }).then(() => {
            modal.onSubmit();
        });
    }

    return (
        <>
            <h2>Leave notebook</h2>
            <p>
                Are you sure you want to leave notebook:
                <br />
                <b>{modal.notebookName}</b>
                <br />
                You will lose access to the notebook unless re-invited.
            </p>
            <div className="right_button_row">
                <button onClick={() => modal.closeModal()}>Cancel</button>
                <button onClick={submitLeave}>Leave</button>
            </div>
        </>
    );
}

//Extend the settings modal, provide the inner component, and for this modal type, notebookId and name are stored
export class LeaveNotebookModal extends SettingsModal {
    constructor(notebookId, notebookName, userId, setModal) {
        super(LeaveModalInner, setModal);
        this.notebookId = notebookId;
        this.notebookName = notebookName;
        this.userId = userId;
    }
}
