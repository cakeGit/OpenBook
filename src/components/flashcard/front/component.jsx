import "./style.css";
import { CanvasDisplay } from "../canvas_display/canvasDisplay";

export function FlashcardTaskFrontDisplay({ flashcard }) {
    const hasCanvasData =
        flashcard.frontCanvasDocumentData &&
        flashcard.frontCanvasDocumentData.length > 0;

    return (
        <div className="flashcard_task_front_display">
            <div className="flashcard_task_front_display_inner">
                {hasCanvasData ? (
                    <div className="flashcard_task_front_with_canvas">
                        <div className="flashcard_task_front_canvas">
                            {/* Display of the diagram from the flashcard front side */}
                            <CanvasDisplay canvasDocumentData={flashcard.frontCanvasDocumentData}/>
                        </div>
                        <p className="flashcard_task_front_text_caption">
                            {flashcard.frontText}
                        </p>
                    </div>
                ) : (
                    <p className="flashcard_task_front_text_exclusive">
                        {flashcard.frontText}
                    </p>
                )}
                <div className="minibar" />
            </div>
        </div>
    );
}
