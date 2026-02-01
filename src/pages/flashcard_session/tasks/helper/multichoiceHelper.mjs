//Helper to take in an entire deck of possible flashcards and generate multiple choice options for a given flashcard
//Alternate choices must not be equal, and we sort by string-similarity distance to try find the most challenging options

//The actual similarity algorithm is from the string-similarity package
import stringSimilarity from "string-similarity";

//Possible optimisation: bubble sort the top 3 most similar rather than sorting the entire array, O(3n) vs O(n log n)
export function generateMultiChoiceOptions(flashcard, allFlashcards) {
    if (!flashcard || !allFlashcards || allFlashcards.length < 4) {
        //Cases like these need to be caught ahead of time, but to avoid tripping up an error is thrown
        throw new Error(
            "Insufficient data to generate multiple choice options",
        );
    }

    //Get all possible unique choices excluding the correct answer
    const possibleChoices = allFlashcards
        .filter(
            (fc) =>
                fc.flashcardLinkId !== flashcard.flashcardLinkId &&
                fc.backText !== flashcard.backText,
        )
        .filter( //Also ensure distinct backText values, this must be the one and only occurence of this backText in the array
            (fc, index, self) =>
                index === self.findIndex((t) => t.backText === fc.backText),
        );

    if (possibleChoices.length < 3) {
        throw new Error(
            "Insufficient distinct flashcards to generate multiple choice options",
        );
    }

    //Calculate similarity scores, bundling the flashcards with their similarity scores for sorting
    const choicesWithScores = possibleChoices.map((fc) => {
        const similarity = stringSimilarity.compareTwoStrings(
            flashcard.backText,
            fc.backText,
        );
        return { flashcard: fc, similarity };
    });

    //Sort by similarity descending
    choicesWithScores.sort((a, b) => b.similarity - a.similarity);

    //Select the top 3 incorrect choices, taking the flashcard and discarding the similarity score
    const selectedChoices = choicesWithScores
        .slice(0, 3)
        .map((item) => item.flashcard);

    //Add the correct answer
    selectedChoices.push(flashcard);

    //Shuffle the options
    for (let i = selectedChoices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedChoices[i], selectedChoices[j]] = [
            selectedChoices[j],
            selectedChoices[i],
        ];
    }

    return selectedChoices;
}
