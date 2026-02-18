import { fetchApi } from "../../../foundation/api";
import { SettingsModal } from "./settingsModal.jsx";

//Modal inner component, which just goes inside the generic modal container
//Contains a cancel and a revoke button while also providing a warning about which notebook access will be revoked
function RevokeModalInner({ modal }) {
    function submitRevoke() {
        fetchApi("share/revoke_notebook_share", {
            notebookId: modal.notebookId,
            revokeUserId: modal.revokeUserId,
        }).then(() => {
            modal.onSubmit();
        });
    }

    return (
        <>
            <h2>Revoke notebook access</h2>
            <p>
                Are you sure you want to {modal.isInvite ? "revoke this invite" : "revoke access"} to <b>{modal.notebookName}</b> for
                user <b>{modal.revokeUserDisplayName}<span className="secondary_text">@{modal.revokeUserLabelName}</span></b>?
            </p>
            <div className="right_button_row">
                <button onClick={() => modal.closeModal()}>Cancel</button>
                <button onClick={submitRevoke}>Revoke</button>
            </div>
        </>
    );
}

//Extend the settings modal, provide the inner component, and for this modal type, notebookId and name are stored
export class RevokeNotebookAccessModal extends SettingsModal {
    constructor(notebookId, notebookName, revokeUserId, revokeUserDisplayName, revokeUserLabelName, setModal, isInvite) {
        super(RevokeModalInner, setModal);
        this.notebookId = notebookId;
        this.notebookName = notebookName;
        this.revokeUserId = revokeUserId;
        this.revokeUserDisplayName = revokeUserDisplayName;
        this.revokeUserLabelName = revokeUserLabelName;
        this.isInvite = isInvite;
    }
}
