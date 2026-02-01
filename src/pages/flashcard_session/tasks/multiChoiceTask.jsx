import { useRef, useState } from "react";
import { FlashcardTaskFrontDisplay } from "../../../components/flashcard/front/component.jsx";

function FlashcardMultichoiceOption({
    flashcard,
    index,
    correctIndex,
    submittedIndex,
    submitAnswer,
}) {
    const option = flashcard.multiChoiceOptions[index];
    const isCorrect = index === correctIndex;
    const wasIncorrect = submittedIndex === index && !isCorrect;
    const handleClick = () => {
        if (isCorrect) {
            submitAnswer(3, index); // Easy
        } else {
            submitAnswer(1, index); // Hard
        }
    };
    return (
        <button
            className={`multichoice_option multichoice_option_${submittedIndex !== null ? (isCorrect ? "correct" : wasIncorrect ? "incorrect" : "") : ""}`}
            onClick={handleClick}
            disabled={submittedIndex !== null}
        >
            {option.backText}
        </button>
    );
}

//This requires that additional information is supplied into flashcard object
export function FlashcardMultiChoiceTask({ flashcard, onComplete }) {
    const [submittedIndex, setSubmittedIndex] = useState(null);
    const questionResultRef = useRef(null);

    if (!flashcard) return <></>;

    const correctIndex = flashcard.multiChoiceOptions.findIndex(
        (option) => option.flashcardLinkId === flashcard.flashcardLinkId,
    );

    const submitAnswer = (confidence, submittedIndex) => {
        setSubmittedIndex(submittedIndex);
        questionResultRef.current = confidence;
    };
    return (
        <div className="flashcard_task">
            <FlashcardTaskFrontDisplay flashcard={flashcard} />
            <div>
                <div className="multichoice_option_row">
                    <FlashcardMultichoiceOption
                        flashcard={flashcard}
                        index={0}
                        correctIndex={correctIndex}
                        submittedIndex={submittedIndex}
                        submitAnswer={submitAnswer}
                    />
                    <FlashcardMultichoiceOption
                        flashcard={flashcard}
                        index={1}
                        correctIndex={correctIndex}
                        submittedIndex={submittedIndex}
                        submitAnswer={submitAnswer}
                    />
                </div>
                <div className="multichoice_option_row">
                    <FlashcardMultichoiceOption
                        flashcard={flashcard}
                        index={2}
                        correctIndex={correctIndex}
                        submittedIndex={submittedIndex}
                        submitAnswer={submitAnswer}
                    />
                    <FlashcardMultichoiceOption
                        flashcard={flashcard}
                        index={3}
                        correctIndex={correctIndex}
                        submittedIndex={submittedIndex}
                        submitAnswer={submitAnswer}
                    />
                </div>
            </div>
            {submittedIndex !== null ? (
                <button onClick={() => onComplete(questionResultRef.current)} autoFocus={true}>
                    Continue
                </button>
            ) : null}
        </div>
    );
}
