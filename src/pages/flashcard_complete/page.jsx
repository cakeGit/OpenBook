import { AppLineBreak } from "../../components/app/line_break/component.jsx";
import { PageCenterContent } from "../../components/layout/pageCenterContent/component.jsx";
import "./style.css";

function getDeltaSymbol(v) {
    return v >= 0 ? "▲" : "▼";
}

function BuildPage() {
    const flashcardSessionInfo = JSON.parse(
        sessionStorage.getItem("flashcard_session_statistics"),
    );
    const notebookId = new URLSearchParams(window.location.search).get(
        "notebook_id"
    );
    return (
        <PageCenterContent>
            <h1>Flashcard session complete!</h1>
            <AppLineBreak />
            <p>You have completed your flashcard session. Well done!</p>
            <AppLineBreak />
            <h2>Session Statistics</h2>
            <div className="flashcard_complete_results_container">
                <div>
                    <b>Flashcards Studied</b>
                    {flashcardSessionInfo.totalFlashcardsStudied}
                </div>
                <div>
                    <b>Flashcard Reviews</b>
                    {flashcardSessionInfo.totalReviews}
                </div>
                <div>
                    <b>Accuracy</b>
                    {Math.round(flashcardSessionInfo.averageAccuracy * 100)}%
                </div>
                <div className="flashcard_complete_results_mastery">
                    <b>Set Mastery</b>
                    {Math.round(flashcardSessionInfo.setMastery * 100)}%{" "}
                    <span className="flashcard_complete_results_mastery_delta">
                        (
                        {getDeltaSymbol(flashcardSessionInfo.setMasteryChange) +
                            Math.round(
                                flashcardSessionInfo.setMasteryChange * 100,
                            )}
                        )
                    </span>
                </div>
            </div>
            <br />
            <a href={`/flashcard_session?notebook_id=${notebookId}`}>Do the session again</a>
            <br />
            <a href={`/flashcard_select?notebook_id=${notebookId}`}>Setup a new session</a>
            <br />
            <a href="/">Return to your notes</a>
        </PageCenterContent>
    );
}

export default BuildPage;
