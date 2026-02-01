import { generateMultiChoiceOptions } from "./tasks/helper/multiChoiceHelper.mjs";

function getFlashcardPriority(flashcard) {
    const l1 = flashcard.learningHistory1 || 0;
    const l2 = flashcard.learningHistory2 || 0;
    const l3 = flashcard.learningHistory3 || 0;
    const l4 = flashcard.learningHistory4 || 0;

    const now = Date.now();
    const lastLearnedTime = flashcard.lastLearnedTime || 0;
    const daysSinceLastLearned =
        (now - lastLearnedTime) / (1000 * 60 * 60 * 24);

    return (
        1 -
        (l1 * 2 + l2 * 1.5 + l3 * 1.25 + l4) / 12 +
        Math.pow(1.05, daysSinceLastLearned)
    );
}

function randomRound(value) {
    const lower = Math.floor(value);
    const upper = Math.ceil(value);
    const fraction = value - lower;
    return Math.random() < fraction ? upper : lower;
}

function getIntroducedNewFlashcards(averagePriority, bundleSize) {
    //If bundle size is ever changed, then we linearly scale the introduction,
    // This formula was written for bundle size 5
    const scale = bundleSize / 5;
    if (averagePriority <= 0.7) return randomRound(2 * scale);
    if (averagePriority >= 1) return 0;

    return randomRound(
        (1 + Math.cos((Math.PI / 0.3) * (averagePriority - 0.7))) * scale,
    );
}

/**
 * Get a 'Bundle' of the next n flashcards to learn
 */
export function getNextFlashcardBundle(
    flashcards,
    includeMultiChoiceData,
    excludeNonTextAnswers,
    bundleSize = 5,
) {
    flashcards = structuredClone(flashcards); //Deep clone to avoid mutating the original data

    //If we are excluding non text answers, filter them out now, so we ensure we have enough cards later
    flashcards = flashcards.filter((flashcard) => {
        if (excludeNonTextAnswers) {
            return flashcard.backText != null && flashcard.backText.trim() !== "";
        }
        return true;
    });
    
    if (flashcards.length === 0) {
        throw new Error("No flashcards available to build a flashcard bundle");
    }

    //Apply in the flashcard priority
    flashcards.forEach((flashcard) => {
        flashcard.priority = getFlashcardPriority(flashcard); //Note that unlearned flashcards will have a priority of infinity
    });
    flashcards.sort((a, b) => b.priority - a.priority);

    let nextUnlearnedCard = null;
    let flashcardBundle = [];
    //Skip unlearned cards from the top but keep track of the first one, and then fill in the rest of the bundle with learned cards
    for (let i = 0; i < flashcards.length; i++) {
        const flashcard = flashcards[i];
        if (!flashcard.lastLearnedTime) {
            if (!nextUnlearnedCard) {
                nextUnlearnedCard = flashcard;
            }
            continue;
        }
        flashcardBundle.push(flashcard);
        if (flashcardBundle.length >= bundleSize) {
            break;
        }
    }

    let unlearnedCardIncluded = false;
    //If flashcardBundle has less than (bundleSize) cards, we can go back and add unlearned cards
    if (flashcardBundle.length < bundleSize && nextUnlearnedCard) {
        for (let i = flashcardBundle.length; i < bundleSize; i++) {
            if (!flashcards[i] || flashcards[i].priority !== Infinity) break;
            flashcardBundle.push(flashcards[i]);
            unlearnedCardIncluded = true;
        }
        //If the length is still lower, repeat the cards
        if (flashcardBundle.length < bundleSize) {
            let i = 0;
            while (flashcardBundle.length < bundleSize) {
                flashcardBundle.push(flashcardBundle[i]);
                i++;
            }
        }
    }

    //OLD LOGIC
    //Check the lowest priority of the learned cards in the bundle, and see if its less than 0.90,
    //If so, check a random number (so we maintain close to the 5% guideline of unlearned cards in sessions
    //->Later change: we also accept very high confidences (<0.6 priority) to be replaced with unlearned cards
    // if (
    //     flashcardBundle[flashcardBundle.length - 1].priority < 0.9 &&
    //     !unlearnedCardIncluded &&
    //     (Math.random() < 0.05 * bundleSize ||
    //         flashcardBundle[flashcardBundle.length - 1].priority < 0.6)
    // ) {
    //     //Replace the last card with the next unlearned card
    //     flashcardBundle[flashcardBundle.length - 1] = nextUnlearnedCard;
    // }
    //END OF OLD LOGIC

    if (!unlearnedCardIncluded) {
        let averagePriority = 0;
        for (const flashcard of flashcardBundle) {
            averagePriority += flashcard.priority;
        }
        averagePriority /= flashcardBundle.length;
        const numNewCards = getIntroducedNewFlashcards(
            averagePriority,
            bundleSize,
        );
        console.log("Introducing", numNewCards, "new flashcards into the bundle from an average priority of", averagePriority.toFixed(2));
        for (let i = 0; i < numNewCards; i++) {
            if (!flashcards[i] || flashcards[i].priority !== Infinity) break;
            flashcardBundle[flashcardBundle.length - 1 - i] = flashcards[i]; //Fill in from the back of the bundle (lowest priority cards)
        }
    }

    //If multi choice mode, generate the additional data needed
    for (const flashcard of flashcardBundle) {
        if (includeMultiChoiceData) {
            flashcard.multiChoiceOptions = generateMultiChoiceOptions(
                flashcard,
                flashcards,
            );
        }
    }

    //Shuffle the bundle to avoid always having the same order
    for (let i = flashcardBundle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcardBundle[i], flashcardBundle[j]] = [
            flashcardBundle[j],
            flashcardBundle[i],
        ];
    }

    return flashcardBundle;
}
