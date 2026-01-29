function isMastered(flashcard) {
    return (
        flashcard.learningHistory1 === 3 &&
        flashcard.learningHistory2 === 3 &&
        flashcard.learningHistory3 === 3 &&
        flashcard.learningHistory4 === 3
    );
}

/**
 * Takes in the learning data in the form {flashcardLinkId, confidence} collected during a flashcard session
 * returns:
 * - Flaschard learning information to send to the server
 * - statistics to pass on to the flaschard session complete page
 */
export function collectFlashcardSessionData(
    flashcardLearningUpdates, //Edits
    finalData, //Data with edits
    initialData, //Data before edits
) {
    let totalConfidence = 0;

    const flashcardLearningStacks = {}; //Each learning stack is the time ordered list of confidences for that flashcard
    for (const update of flashcardLearningUpdates) {
        if (!flashcardLearningStacks[update.flashcardLinkId]) {
            flashcardLearningStacks[update.flashcardLinkId] = [];
        }
        flashcardLearningStacks[update.flashcardLinkId].push(update.confidence);
        totalConfidence += update.confidence;
        //The stack will forget the bottom item if it exceeds 4 entries
        if (flashcardLearningStacks[update.flashcardLinkId].length > 4) {
            flashcardLearningStacks[update.flashcardLinkId].shift();
        }
    }

    //Then get statistics about the session
    let totalFlashcardsStudied = Object.keys(flashcardLearningStacks).length;
    let totalReviews = flashcardLearningUpdates.length;
    let averageConfidence = totalConfidence / totalReviews;
    //Coded statistic, average confidence is 3(Easy)-1(Hard), it needs to be mapped to 1(100% correct)-0(0% correct) scale
    let averageAccuracy = (averageConfidence - 1) / 2;
    let flashcardsMasteredTotal = 0; //Number of flashcards in the set that reached mastery
    let lastFlashcardsMasteredTotal = 0;

    //Optional statistics to be hidden if 0,
    let newFlashcards = 0;
    let flashcardsMasteredThisSession = 0; //Defined as having 4 consecutive 'easy' reviews

    for (const flashcard of finalData) {
        const initialFlashcard = initialData.find(
            (fc) => fc.flashcardLinkId === flashcard.flashcardLinkId,
        );
        const cardNowMastered = isMastered(flashcard);
        const cardPreviouslyMastered = isMastered(initialFlashcard);
        if (cardNowMastered) {
            if (!cardPreviouslyMastered) {
                flashcardsMasteredThisSession += 1;
            }
            flashcardsMasteredTotal += 1;
        }
        if (cardPreviouslyMastered) {
            lastFlashcardsMasteredTotal += 1;
        }
        if (
            !initialFlashcard.lastLearnedTime ||
            initialFlashcard.lastLearnedTime === 0
        ) {
            newFlashcards += 1;
        }
    }

    return {
        flashcardLearningStacks,
        statistics: {
            totalFlashcardsStudied,
            totalReviews,
            averageConfidence,
            averageAccuracy,
            setMastery: flashcardsMasteredTotal / totalFlashcardsStudied,
            setMasteryChange:
                (flashcardsMasteredTotal - lastFlashcardsMasteredTotal) / totalFlashcardsStudied,
            newFlashcards: newFlashcards > 0 ? newFlashcards : undefined,
            flashcardsMastered:
                flashcardsMasteredThisSession > 0
                    ? flashcardsMasteredThisSession
                    : undefined,
        },
    };
}
