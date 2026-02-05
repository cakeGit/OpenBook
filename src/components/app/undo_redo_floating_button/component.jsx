import { FaRedo, FaUndo } from "react-icons/fa";
import "./style.css"

export function UndoRedoFloatingButton({ pageRef }) {
    const handleUndo = () => {
        pageRef.current.requestHistoryAction("undo");
    };

    const handleRedo = () => {
        pageRef.current.requestHistoryAction("redo");
    };

    return (
        <div className="floating_history_buttons">
            <button onClick={handleUndo} className="floating_undo_button">
                <FaUndo />
            </button>
            <button onClick={handleRedo} className="floating_redo_button">
                <FaRedo />
            </button>
        </div>
    );
}