import { fetchApi } from "../../../foundation/api";
import { useRef } from "react";
import { SettingsModal } from "./settingsModal.jsx";

//Modal inner component, which just goes inside the generic modal container
//Contains a cancel and a submit button while also providing an input for the user to share the notebook with
function ShareModalInner({ modal }) {
    const userToShareWithRef = useRef();

    //Create the submit function, which calls the API
    function submitShare() {
        const safeTagName = userToShareWithRef.current.value.replace(/^@/, "");

        fetchApi("share/share_notebook_with_user", {
            notebookId: modal.notebookId,
            inviteUserLabelName: safeTagName,
        }).then(() => {
            //Once the api call finished, call onSubmit (closes the modal and reloads the page)
            modal.onSubmit();
        });
    }

    return (
        <>
            <h2>Share notebook</h2>
            <p>
                Enter the user to share <b>{modal.notebookName}</b> with:
            </p>
            <input
                ref={userToShareWithRef}
                placeholder="User tag to share with (e.g. @user)"
            />
            <div className="right_button_row">
                <button onClick={() => modal.closeModal()}>Cancel</button>
                <button onClick={submitShare}>Share</button>
            </div>
        </>
    );
}

//Extend the settings modal, provide the inner component, and for this modal type, notebookId and name are stored
export class ShareNotebookModal extends SettingsModal {
    constructor(notebookId, notebookName, setModal) {
        super(ShareModalInner, setModal);
        this.notebookId = notebookId;
        this.notebookName = notebookName;
    }
}
