import { useRef, useState } from "react";
import { PageCenterContent } from "../../components/layout/pageCenterContent/component.jsx";
import { fetchApi } from "../../foundation/api.js";
import { useApi } from "../../foundation/useApiData.js";
import "./style.css";
import { FlashcardSelfAssessTask } from "./tasks/selfAssessTask.jsx";
import { FlashcardMultiChoiceTask } from "./tasks/multiChoiceTask.jsx";
import { getNextFlashcardBundle } from "./flashcardBundler.mjs";
import { collectFlashcardSessionData } from "./flashcardSessionDataCollector.mjs";
import { FlashcardSentenceBuilderTask } from "./tasks/sentenceBuilderTask.jsx";

function applyLearningResultToFlashcard(
    flashcards,
    flashcardLinkId,
    confidence,
) {
    const flashcard = flashcards.find(
        (fc) => fc.flashcardLinkId === flashcardLinkId,
    );
    if (!flashcard) return;
    const now = Date.now();
    flashcard.lastLearnedTime = now;

    //Shift the history up, this makes me feel weird that its not an array but oh well
    flashcard.learningHistory4 = flashcard.learningHistory3 || 0;
    flashcard.learningHistory3 = flashcard.learningHistory2 || 0;
    flashcard.learningHistory2 = flashcard.learningHistory1 || 0;
    flashcard.learningHistory1 = confidence;
}

function timeTo(timestamp) {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return `${diffSecs}s ago`;
}

function getLearningCode(flashcard) {
    function getLearningChar(value) {
        return value ? ["H", "M", "E"][value - 1] || "-" : "-";
    }
    return (
        getLearningChar(flashcard.learningHistory1) +
        getLearningChar(flashcard.learningHistory2) +
        getLearningChar(flashcard.learningHistory3) +
        getLearningChar(flashcard.learningHistory4)
    );
}

function getNextFlashcardBundleSafe(
    flashcards,
    includeMultiChoiceData,
    excludeNonTextAnswers,
) {
    try {
        return getNextFlashcardBundle(
            flashcards,
            includeMultiChoiceData,
            excludeNonTextAnswers,
        );
    } catch (e) {
        console.error(
            "Error getting next flashcard bundle, returning to selection page:",
            e,
        );
        alert("Couldn't setup flashcard session: " + e.message);
        const notebookId = new URLSearchParams(window.location.search).get(
            "notebook_id",
        );
        window.location.href = "/flashcard_select?notebook_id=" + notebookId;
        return [];
    }
}

function BuildPage() {
    //Get selected pages from the session storage (from flashcard_select page)
    const selectedPageIds = JSON.parse(
        sessionStorage.getItem("flashcard_session_selected_page_ids"),
    );

    const { data, loading, error } = useApi(async () => {
        const response = await fetchApi(
            "flashcards/get_flashcards_information_of_pages",
            {
                pageIds: selectedPageIds,
            },
        );

        return response.flashcards;
    });
    const initialData = structuredClone(data);

    const sessionOption =
        sessionStorage.getItem("flashcard_session_option") || "self_assess";
    const flashcardsInSessionCount = parseInt(
        sessionStorage.getItem("flashcard_session_flashcard_count") || "5",
    );
    const includeMultiChoiceData = sessionOption == "multi_choice";
    const excludeNonTextAnswers = sessionOption == "sentence_builder";

    const flashcardLearningUpdatesRef = useRef([]);

    const activeFlashcardBundleRef = useRef(null);
    const [flashcardLearnedCount, setFlashcardLearnedCount] = useState(0);
    const [activeFlashcard, setActiveFlashcard] = useState(null);

    if (loading || error) return <></>;

    if (!activeFlashcardBundleRef.current) {
        activeFlashcardBundleRef.current = getNextFlashcardBundleSafe(
            data,
            includeMultiChoiceData,
        );
        setActiveFlashcard(activeFlashcardBundleRef.current[0]);
    }

    const advanceToNextFlashcard = (confidence) => {
        //Update the flashcard learning history locally, we bundle actually uploading the results later
        const flashcard = activeFlashcardBundleRef.current.shift();
        flashcardLearningUpdatesRef.current.push({
            flashcardLinkId: flashcard.flashcardLinkId,
            confidence,
        });
        applyLearningResultToFlashcard(
            data,
            flashcard.flashcardLinkId,
            confidence,
        );

        if (flashcardLearnedCount >= flashcardsInSessionCount - 1) {
            //Finished the session, go to flashcard complete page and upload results
            const { flashcardLearningStacks, statistics } =
                collectFlashcardSessionData(
                    flashcardLearningUpdatesRef.current,
                    data,
                    initialData,
                );
            sessionStorage.setItem(
                "flashcard_session_statistics",
                JSON.stringify(statistics),
            );
            fetchApi("flashcards/update_flashcard_learning_data", {
                flashcardLearningUpdates: flashcardLearningStacks,
            }).then(() => {
                window.location.href = "/flashcard_complete";
            });
            return;
        }

        if (activeFlashcardBundleRef.current.length === 0) {
            //We need a new bundle if we're still going
            activeFlashcardBundleRef.current = getNextFlashcardBundleSafe(
                data,
                includeMultiChoiceData,
            );
        }

        setActiveFlashcard(activeFlashcardBundleRef.current[0]);
        setFlashcardLearnedCount(flashcardLearnedCount + 1);
    };

    const TaskComponent = {
        self_assess: FlashcardSelfAssessTask,
        multi_choice: FlashcardMultiChoiceTask,
        sentence_builder: FlashcardSentenceBuilderTask,
    }[sessionOption]; //Resolve the task component based on session option

    return (
        <PageCenterContent>
            <h1>Flashcard revision session</h1>
            <TaskComponent
                flashcard={activeFlashcard}
                onComplete={advanceToNextFlashcard}
                key={flashcardLearnedCount}
            />
            <i className="flashcard_learning_debug">
                priority=
                {activeFlashcard
                    ? activeFlashcard.priority === Infinity
                        ? "Unlearned"
                        : activeFlashcard.priority.toFixed(2)
                    : "N/A"}
                &nbsp;|&nbsp;last learned=
                {activeFlashcard
                    ? activeFlashcard.lastLearnedTime === 0 ||
                      activeFlashcard.lastLearnedTime === undefined
                        ? "Never"
                        : timeTo(activeFlashcard.lastLearnedTime)
                    : "N/A"}
                &nbsp;|&nbsp;history=
                {activeFlashcard ? getLearningCode(activeFlashcard) : "N/A"}
            </i>
            <div
                className="flashcard_session_progress_bar"
                style={{
                    width: "100%",
                }}
            >
                <div
                    className="flashcard_session_progress_bar_fill"
                    style={{
                        width: `${100 * (flashcardLearnedCount / flashcardsInSessionCount)}%`,
                    }}
                ></div>
            </div>
        </PageCenterContent>
    );
}

export default BuildPage;
