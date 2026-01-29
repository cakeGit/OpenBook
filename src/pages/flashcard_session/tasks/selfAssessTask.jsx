import { useState } from "react";
import { FlashcardTaskFrontDisplay } from "../../../components/flashcard/front/component.jsx";

export function FlashcardSelfAssessTask({ flashcard, onComplete }) {
    const [showAnswer, setShowAnswer] = useState(false);//This is the only state needed, determines if show answer has been clicked
    if (!flashcard) return <></>;
    return (
        <div className="flashcard_task">
            <FlashcardTaskFrontDisplay flashcard={flashcard} /> {/*Show front of flashcard*/}
            {showAnswer && (
                //The back is shown but only after user clicks "Show Answer"
                <div className="flashcard_back">
                    <p>{flashcard.backText}</p>
                </div>
            )}
            {!showAnswer ? (
                <button onClick={() => setShowAnswer(true)}>Show Answer</button>
            ) : (
                //Shown after answer is revealed, user can self-assess confidence
                <div className="flashcard_confidence_buttons">
                    <button onClick={() => onComplete(3)}>Easy</button>
                    <button onClick={() => onComplete(2)}>Medium</button>
                    <button onClick={() => onComplete(1)}>Hard</button>
                </div>
            )}
        </div>
    );
}