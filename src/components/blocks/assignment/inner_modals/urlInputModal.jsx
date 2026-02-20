import { useRef } from "react";
import { GenericModal } from "../../../../foundation/modals/genericModal";

//Pretty much identical in structure to the DateInputModal, as this just provides an interface to the input inside the modal
function UrlInputModalInner({ modal }) {
    const urlInputRef = useRef(null);

    function handleSave() {
        modal.updateUrl(urlInputRef.current.value);
        modal.closeModal();
    }

    function handleCancel() {
        modal.closeModal();
    }
    //...Render return omitted for brevity
    return (
        <div className="assignment_modal_content">
            <h3>Attach a link to the assignment</h3>
            <div className="assignment_modal_body">
                <input
                    type="url"
                    className="assignment_modal_input"
                    placeholder="https://example.com"
                    ref={urlInputRef}
                    defaultValue={modal.initialUrl}
                />
            </div>
            <div className="assignment_modal_actions">
                <button onClick={handleCancel}>Cancel</button>
                <button onClick={handleSave}>Save</button>
            </div>
        </div>
    );
}

export class UrlInputModal extends GenericModal {
    constructor(modalHook, initialUrl, updateUrl) {
        super(UrlInputModalInner, modalHook);
        this.initialUrl = initialUrl;
        this.updateUrl = updateUrl;
    }
}
