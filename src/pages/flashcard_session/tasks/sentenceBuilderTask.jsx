import { Fragment, useEffect, useRef, useState } from "react";
import { FlashcardTaskFrontDisplay } from "../../../components/flashcard/front/component.jsx";
import { getFlashcardBreakdown } from "./helper/sentenceBuilderHelper.mjs";
import { FlexCenter } from "../../../components/app/flex_center/component.jsx";
import { SentencePart } from "./components/sentencePart.jsx";

class PartContent {
    constructor(text) {
        this.text = text;
        //Remove all spaces for checking, to avoid any potential corruption from the breakdown when the content is checked
        this.checkText = text.toLowerCase().replace(/\s/g, "");
        this.key = crypto.randomUUID(); //Random uuid for react key
    }
}

function BuilderDragTarget({ targets, index }) {
    const thisRef = useRef(null);
    targets.add({
        ref: thisRef,
        index: index,
    });
    return (
        <div ref={thisRef} className="sentence_builder_drag_target">
            <div></div>{" "}
            {/* Empty div for styling when this target is hovered */}
        </div>
    );
}

function getRows(contentArray) {
    //Since targets need to exist at the start and end of each row, we need to apply our own wrapping
    const perPartExtra = 9 + 2; //Pixels in each part
    const maxRowWidth = 600; //Actual width is 500px, but leave padding for the border box and so

    const rows = [];
    let currentRow = [];
    let currentRowWidth = 0;
    for (let content of contentArray) {
        const estimatedPartWidth = content.text.length * 8 + perPartExtra; //Estimate 8px per character plus padding/margin
        if (currentRowWidth + estimatedPartWidth > maxRowWidth) {
            //Start a new row
            rows.push(currentRow);
            currentRow = [content];
            currentRowWidth = estimatedPartWidth;
        } else {
            currentRow.push(content);
            currentRowWidth += estimatedPartWidth;
        }
    }
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    return rows;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function isAnswerCorrect(sentenceBuilderContent, expectedCheckText) {
    const userCheckText = sentenceBuilderContent
        .map((part) => part.checkText)
        .join("");
    return userCheckText === expectedCheckText;
}

export function FlashcardSentenceBuilderTask({ flashcard, onComplete }) {
    if (!flashcard) return <></>;

    //Make the breakdown function available for testing
    window.testSentenceDivision = getFlashcardBreakdown;

    //Used to manually trigger re-renders when a change is made
    // rather than running multiple re-renders halfway through a drag and drop operation
    const tickRenderer = (
        (setRenderTick) => () => onRenderTick() + setRenderTick((t) => t + 1)
    )(useState(0)[1]); //Inline operation to make a tick renderer function
    //Now includes onRenderTick call

    function onRenderTick() {
        runAnswerCheck(false);
    }

    const [showAnswer, setShowAnswer] = useState(false);
    const wasAnswerCorrect = useRef(false);

    const sentencePalletteContent = useRef([]);
    const sentenceBuilderContent = useRef([]);
    const currentCheckText = useRef("");

    const sentenceBuilderTargets = new Set(); //Updates every render, used for drag and drop targets


    useEffect(() => {
        //Clear existing data
        sentencePalletteContent.current = [];
        sentenceBuilderContent.current = [];

        //Create the breakdown
        const breakdown = getFlashcardBreakdown(flashcard.backText);

        //Create the check text before shuffling
        currentCheckText.current = breakdown
            .map((part) => part.toLowerCase().replace(/\s/g, ""))
            .join("");    
            
        sentencePalletteContent.current = shuffle(breakdown).map(
            (partText) => new PartContent(partText),
        );

        tickRenderer(); //Force re-render
    }, [flashcard]); //Run when flashcard changes

    function runAnswerCheck(forceEnd) {
        const isCorrect = isAnswerCorrect(
            sentenceBuilderContent.current,
            currentCheckText.current,
        );

        if (isCorrect) {
            wasAnswerCorrect.current = true;
            setShowAnswer(true);
        } else if (forceEnd) {
            wasAnswerCorrect.current = false;
            setShowAnswer(true);
        }
        return isCorrect;
    }

    let accruedIndex = 0;
    return (
        <div className="flashcard_task">
            {/* Show front of flashcard */}
            <FlashcardTaskFrontDisplay flashcard={flashcard} />
            <FlexCenter>
                <div
                    className={`sentence_part_container sentence_builder ${showAnswer ? (wasAnswerCorrect.current ? "sentence_builder_correct_answer" : "sentence_builder_incorrect_answer") : ""}`}
                >
                    {showAnswer ? (
                        <p>{flashcard.backText}</p>
                    ) : (
                        getRows(sentenceBuilderContent.current).map(
                            (contents, index) => (
                                <div
                                    className="sentence_builder_row"
                                    key={index}
                                >
                                    <BuilderDragTarget
                                        targets={sentenceBuilderTargets}
                                        index={accruedIndex}
                                        key={accruedIndex + "nl"}
                                    />
                                    {contents.map((content, subIndex) => (
                                        <Fragment key={content.key}>
                                            <SentencePart
                                                key={content.key}
                                                content={content}
                                                isPallette={false}
                                                sentencePalletteContent={
                                                    sentencePalletteContent.current
                                                }
                                                sentenceBuilderContent={
                                                    sentenceBuilderContent.current
                                                }
                                                targets={sentenceBuilderTargets}
                                                tickRenderer={tickRenderer}
                                            />
                                            <BuilderDragTarget
                                                targets={sentenceBuilderTargets}
                                                index={accruedIndex + 1}
                                                key={accruedIndex ++}
                                            />
                                        </Fragment>
                                    ))}
                                </div>
                            ),
                        )
                    )}
                </div>
            </FlexCenter>
            <div className="sentence_part_container sentence_pallette">
                {sentencePalletteContent.current.map((content, index) => (
                    <SentencePart
                        key={content.key}
                        content={content}
                        isPallette={true}
                        sentencePalletteContent={
                            sentencePalletteContent.current
                        }
                        sentenceBuilderContent={sentenceBuilderContent.current}
                        targets={sentenceBuilderTargets}
                        tickRenderer={tickRenderer}
                    />
                ))}
            </div>
            <button
                onClick={() => {
                    if (!showAnswer) {
                        runAnswerCheck(true);
                    } else {
                        onComplete(wasAnswerCorrect.current ? 3 : 1);
                    }
                }}
                autoFocus={showAnswer}
                key={showAnswer} //Force re-focus when showing answer
            >
                Continue
            </button>
        </div>
    );
}
