import "./style.css";
import { CanvasDisplay } from "../canvas_display/canvasDisplay";

export function FlashcardTaskFrontDisplay({ flashcard }) {
    const hasCanvasData =
        flashcard.frontCanvasDocumentData &&
        flashcard.frontCanvasDocumentData.length > 0;
    const hasImageData = !hasCanvasData && flashcard.frontImageResourceId;

    return (
        <div className="flashcard_task_front_display">
            <div className="flashcard_task_front_display_inner">
                {hasCanvasData || hasImageData ? (
                    <div className="flashcard_task_front_with_media">
                        <div className="flashcard_task_front_media">
                            {hasCanvasData ? ( //Display of the diagram from the flashcard front side
                                <CanvasDisplay
                                    canvasDocumentData={
                                        flashcard.frontCanvasDocumentData
                                    }
                                />
                            ) : ( //Display of the image
                                <img
                                    src={`/image/${flashcard.frontImageResourceId}`}
                                    alt={`Front flashcard side image`}
                                    className="flashcard_task_front_image"
                                />
                            )}
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
