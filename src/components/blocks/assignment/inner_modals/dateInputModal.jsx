import { useRef } from "react";
import { GenericModal } from "../../../../foundation/modals/genericModal";

function DateInputModalInner({ modal }) {
    const dateInputRef = useRef(null);

    function handleSave() {
        //The updateDate function is the specific function provided to the DateInputModal class
        // it is what ensures the result of the input is passed back to both the component and the server
        let dateTime = new Date(dateInputRef.current.value).getTime();
        modal.updateDate(dateTime);
        modal.closeModal();
    }

    function handleCancel() {
        modal.closeModal();
    }

    return (
        <div className="assignment_modal_content">
            <h3>Attach a date to the assignment</h3>
            <div className="assignment_modal_body">
                <input
                    type="date"
                    className="assignment_modal_input"
                    ref={dateInputRef}
                    defaultValue={modal.initialDate}
                />
            </div>
            <div className="assignment_modal_actions">
                <button onClick={handleCancel}>Cancel</button>
                <button onClick={handleSave}>Save</button>
            </div>
        </div>
    );
}

//Modal with a "date" type input
export class DateInputModal extends GenericModal {
    constructor(modalHook, initialDate, updateDate) {
        super(DateInputModalInner, modalHook);
        //The current date and the method to update the date are passed from the assignment block component
        this.initialDate = initialDate;
        this.updateDate = updateDate;
    }
}
