import { useNavigate } from "react-router-dom";
import "./style.css";

export function FlashcardFloatingButton({ currentNotebookId }) {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate(`/flashcard_select?notebook_id=${currentNotebookId}`);
    };
    return (
        <div className="flashcard_floating_button" onClick={handleClick}>
            <div className="flashcard_symbol_element flashcard_symbol_1"></div>
            <div className="flashcard_symbol_element flashcard_symbol_2"></div>
        </div>
    );
}
