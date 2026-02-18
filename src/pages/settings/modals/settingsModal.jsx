import { createPortal } from "react-dom";

//Generic modal code for all the actions on the settings page
//The inner component contains the actual content of the modal, and is displayed from render()
//setModal is the state in the main page which is used to stop the modal from rendering (by setting it to null)
export class SettingsModal {
    constructor(innerComponent, setModal) {
        this.innerComponent = innerComponent;
        this.setModal = setModal;
        this.listenerAdded = false;
    }

    //Check if the click was outside and close if so
    closeModalOnOutsideClick(e) {
        if (!e.target.closest(".notebook_modal_container")) {
            this.closeModal();
        }
    }

    //Close the modal by setting it to null and removing the click listener
    closeModal() {
        if (this.listenerAdded) {
            document.removeEventListener("click", this.closeModalOnOutsideClick);
            this.listenerAdded = false;
        }
        this.setModal(null);
    }

    //Reload the page for new content, and close the modal
    onSubmit() {
        this.closeModal();
        window.location.href = window.location.href;
    }

    //Render the modal with the inner component, and add the click listener (on the first render only to avoid binding multiple times)
    render() {
        if (!this.listenerAdded) {
            document.addEventListener("click", this.closeModalOnOutsideClick.bind(this));
            this.listenerAdded = true;
        }
        //Render in a portal so it can display on top of everything else
        return createPortal(
            <div className="notebook_modal_overlay">
                <div className="notebook_modal_container">
                    {/*Render the inner component, passing the modal itself as a prop so it can call the onSubmit and close functions when needed*/}
                    <this.innerComponent modal={this}></this.innerComponent>
                </div>
            </div>,
            document.body,
        );
    }
}
