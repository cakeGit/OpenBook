import nlp from "compromise";

//Fixed the merge cost order being inverted
const punctuationMergeCostOrder = ",;.?!:".split("");
const punctuationSplitExpression = /(?<=[,;.?!:])/;

function getTargetPartCount(chars) {
    return Math.min(chars * (5 / 100) + 2, 12); //starting with 2, then 5 per 100 chars up to 12 splits
}

//Turn a text into blocks sepreated by punctuation characters
function getPunctuationParts(text) {
    //This regex splits on punctuation and uses a look behind to keep the punctuation with split result
    return text
        .split(punctuationSplitExpression)
        .map((p) => p.trim())
        .filter((p) => p.length > 0); //Ensure its not just blank text in any of these
}

function getFunctionalLength(text) {
    //Get number of non space characters
    return text.replace(/\s/g, "").length;
}

//The punctuation should always be the last char of each element,
// so between A and B, the cost should be determined by last char of A
//Part B is unused here, but we keep it for debugging and completeness
function getNeightborMergeCost(partA, partB) {
    const lastCharA = partA.charAt(partA.length - 1);
    const cost = punctuationMergeCostOrder.indexOf(lastCharA);

    //Warning since the character should be in the merge order, and cost should not be minus one
    if (cost === -1) {
        console.warn(
            `Punctuation merge cost not found for character " ${lastCharA} ", between parts "${partA}" and "${partB}"`,
        );
    }

    return cost === -1 ? 0 : cost; //If not found, return low cost cause its not punctuation
}

function mergeSmallPunctuationParts(punctuationParts, tooSmallTarget) {
    let currentItteration = 0;
    while (currentItteration++ < 1000) {
        let biggestSmallPartIndex = -1;
        let biggestSmallPartLength = 0;

        //Find the biggest part we need to merge, where the length is less than the too small target
        for (let i in punctuationParts) {
            let part = punctuationParts[i];

            if (
                part.length < tooSmallTarget &&
                biggestSmallPartLength < part.length
            ) {
                biggestSmallPartIndex = parseInt(i);
                biggestSmallPartLength = part.length;
            }
        }

        if (biggestSmallPartIndex === -1) {
            return; //No more small parts, safe to exit
        }

        //Define how we want to merge this part with a neighbor, given the small part index
        function mergeWithNeighbor(targetIndex) {
            let insertIndex = Math.min(biggestSmallPartIndex, targetIndex);

            //Remove the target part and merge it with the neighbor
            const mergedText = punctuationParts
                .splice(insertIndex, 2)
                .join(" ");

            punctuationParts.splice(insertIndex, 0, mergedText);
        }

        //We have a part thats too small, get the best neighbor to merge with
        const beforeIndex = biggestSmallPartIndex - 1;
        const afterIndex = biggestSmallPartIndex + 1;

        const length = punctuationParts.length;
        if (beforeIndex < 0) {
            //Only the after is available, perform the merge that way
            mergeWithNeighbor(afterIndex);
        } else if (afterIndex >= length) {
            //Only the before is available, perform the merge that way
            mergeWithNeighbor(beforeIndex);
        } else {
            //Both neighbors are available, get the best cost to merge with
            const beforeCost = getNeightborMergeCost(
                punctuationParts[beforeIndex],
                punctuationParts[biggestSmallPartIndex],
            );
            const afterCost = getNeightborMergeCost(
                punctuationParts[biggestSmallPartIndex],
                punctuationParts[afterIndex],
            );
            if (beforeCost <= afterCost) {
                mergeWithNeighbor(beforeIndex);
            } else {
                mergeWithNeighbor(afterIndex);
            }
        }
    }
    console.warn(
        "Max itterations reached when merging small punctuation parts",
    );
}

//Get the absolute distance between two numbers, regardless of which is bigger
function absDist(a, b) {
    return Math.abs(a - b);
}

function breakDownPart(part, targetSize) {
    const words = part.split(" ");
    const brokenDownParts = [];

    //Because we want to split evenly within the part,
    // we need to estimate how many splits we will do,
    // otherwise, theres a a risk we have a very small bit at the end
    const characters = getFunctionalLength(part);
    const numberOfSplits = Math.floor(characters / targetSize);
    const partTargetSize = characters / numberOfSplits + 1; //Sometimes it would leave a hanging word at the end, so slightly bump the target

    let currentPart = "";
    let consumedLength = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordLength = word.length;

        const newLengthIfMerged = consumedLength + wordLength;

        if (
            absDist(newLengthIfMerged, partTargetSize) <
            absDist(consumedLength, partTargetSize)
        ) {
            //Merging this word gets us closer to target size
            currentPart += (currentPart ? " " : "") + word;
            consumedLength += wordLength;
        } else {
            //Merging this word makes us further from target size, so finalize current part and start a new one with this word
            if (currentPart) {
                brokenDownParts.push(currentPart);
            }
            currentPart = word;
            consumedLength = wordLength;
        }
    }

    //Push any remaining part
    if (currentPart) {
        brokenDownParts.push(currentPart);
    }
    return brokenDownParts;
}

function breakDownPartsExceedingTargetSize(
    punctuationParts,
    exceedSizeThreshold,
    targetSize,
) {
    //Itterate and replace the big parts with an array of smaller parts
    for (let i = 0; i < punctuationParts.length; i++) {
        const part = punctuationParts[i];
        if (part.length > exceedSizeThreshold) {
            punctuationParts[i] = breakDownPart(part, targetSize);
        }
    }
}

//Utility to inverse map keys and values of an object
function inverseMap(obj) {
    const inverted = {};
    for (const key in obj) {
        const value = obj[key];
        inverted[value] = key;
    }
    return inverted;
}

//Empty class to mark parenthesis in between strings
class IsolatedSegment {
    constructor(text, isForParenthesis, characterPerPart) {
        this.result = getFlashcardBreakdown(
            text,
            isForParenthesis,
            characterPerPart,
        );
    }
}

function isolateParts(text, characterPerPart) {
    const parenthesisCharactersStartToEnd = {
        "(": ")",
        "[": "]",
        "{": "}",
        "<": ">",
        "-": "-",
    };
    const parenthesisCharactersEndToStart = inverseMap(
        parenthesisCharactersStartToEnd,
    );

    //We only want the outermost parenthesis, so we use a stack to track nesting
    //We check the end character first, so that the "-" character can be used and just close on the next
    const stack = [];
    const isolatedSegments = [];
    let currentSegment = "";

    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        if (parenthesisCharactersEndToStart[char]) {
            //This is a closing parenthesis character
            if (stack.length > 0) {
                const lastOpened = stack[stack.length - 1];
                if (parenthesisCharactersStartToEnd[lastOpened] === char) {
                    //This closes the last opened parenthesis, so we pop the stack

                    if (stack.length === 1 && currentSegment.trim() !== "") {
                        //We are closing the outermost parenthesis, and thus need to finalize the current segment first
                        currentSegment += char;
                        //Finalize the current segment as a non-parenthesis segment
                        isolatedSegments.push(
                            new IsolatedSegment(
                                currentSegment,
                                true,
                                characterPerPart,
                            ),
                        );
                        currentSegment = "";
                    }

                    stack.pop();

                    continue;
                } else {
                    //Unexpected closing parenthesis, just continue
                }
            }
        } else if (parenthesisCharactersStartToEnd[char] && i !== 0) {
            //Ignore opening parenthesis at start
            //This is an opening parenthesis character,
            // We are starting a parenthesis segment, so finalize the current segment first
            if (stack.length === 0 && currentSegment.trim() !== "") {
                isolatedSegments.push(
                    new IsolatedSegment(
                        currentSegment,
                        false,
                        characterPerPart,
                    ),
                );
                currentSegment = "";
            }
            stack.push(char);
        }
        currentSegment += char;
    }

    //If there are any remaining characters in the current segment, add them as a segment
    //But, only if we've done isolations. No isolations means this is a normal flow
    if (currentSegment && isolatedSegments.length !== 0) {
        isolatedSegments.push(
            new IsolatedSegment(currentSegment, false, characterPerPart),
        );
    }

    return isolatedSegments.length > 0
        ? isolatedSegments.reduce((result, segment) => {
              return result.concat(segment.result);
          }, [])
        : null;
}

const attractionScores = {
    "#Noun #Noun": 1, //Compound nouns
    "#Gerund #Noun": 1, //-ing doesent count as a noun directly, so "Programming language" comes under this
    "#Noun #Gerund": 1,
    "#Adjective #Noun": 0.5,
    "#Adverb #Verb": 0.5,
    "#Noun #Verb": -1,
    "#Verb #Noun": -1,
};
function getAttraction(wordA, wordB) {
    const doc = nlp(`${wordA} ${wordB}`);
    for (const pattern in attractionScores) {
        if (doc.has(pattern)) {
            return attractionScores[pattern];
        }
    }
    return 0; //Neutral attraction if no pattern matched
}

function evaluateAttractionJoins(parts) {
    for (let i = parts.length - 2; i >= 0; i--) {
        const partAWords = parts[i].split(" ").filter((w) => w !== "");
        const partBWords = parts[i + 1].split(" ").filter((w) => w !== "");

        //If part A ends in a non alphabhetical character, or part B starts with non alphabetical, skip attraction
        const lastCharA = parts[i].charAt(parts[i].length - 1);
        const firstCharB = parts[i + 1].charAt(0);
        if (!/[a-zA-Z0-9]/.test(lastCharA) || !/[a-zA-Z0-9]/.test(firstCharB)) {
            continue;
        }

        const crossAttraction =
            partAWords.length > 0 && partBWords.length > 0
                ? getAttraction(
                      partAWords[partAWords.length - 1],
                      partBWords[0],
                  )
                : 0;

        //Require a cross attraction to consider merging
        if (crossAttraction === 0) {
            continue;
        }

        const partAInternalAttraction =
            partAWords.length > 0
                ? getAttraction(
                      partAWords[partAWords.length - 2],
                      partAWords[partAWords.length - 1],
                  )
                : 0;
        const partBInternalAttraction =
            partBWords.length > 0
                ? getAttraction(partBWords[0], partBWords[1])
                : 0;

        const mergeLeftAttraction = partAInternalAttraction + crossAttraction;
        const mergeRightAttraction = partBInternalAttraction + crossAttraction;

        //Move word from one part to the other based on which has higher attraction
        if (mergeLeftAttraction > mergeRightAttraction) {
            partAWords.push(partBWords.shift());
        } else {
            partBWords.unshift(partAWords.pop());
        }

        //Update content
        parts[i] = partAWords.join(" ");
        parts[i + 1] = partBWords.join(" ");

        //Remove now empty parts
        if (parts[i] === "") {
            parts.splice(i, 1);
        }
        if (parts[i + 1] === "") {
            parts.splice(i + 1, 1);
        }
    }
}

function postProcess(parts) {
    //Final cleanup, move backwards in the array, merge any parts that are just 1 non alphanumeric characters with the one before
    for (let i = parts.length - 1; i > 0; i--) {
        const part = parts[i];
        if (/^[^a-zA-Z0-9]$/.test(part)) {
            //This part is just 1 non alphanumeric character, merge it with the previous part
            const mergedPart = parts[i - 1] + part;
            parts.splice(i - 1, 2, mergedPart); //Remove the two parts and insert the merged part
        }
    }
    return parts;
}

export function getFlashcardBreakdown(
    text,
    isForParenthesis = false,
    characterPerPartOverride = null,
) {
    const chars = text.length;
    const targetCount = getTargetPartCount(chars);
    let characterPerPart =
        characterPerPartOverride || getFunctionalLength(text) / targetCount;

    if (chars <= characterPerPart) {
        return [text]; //No need to break down further
    }

    //Stage zero: try run with an extract for parenthesis

    //Since this breaks down the current call into multiple smaller ones,
    // we let the final result be built from these smaller calls (which happens inside isolateParts)
    const isolatedResult = isolateParts(text, characterPerPart);
    if (isolatedResult !== null) {
        return postProcess(isolatedResult);
    }

    //Main flow:

    //If this is a parenthesis block, we increase the target character per part to improve cohesion of these segments
    if (isForParenthesis) {
        characterPerPart *= 2;
    }

    //Stage one: split to punctuation parts:
    const punctuationParts = getPunctuationParts(text);
    //Stage two: itterativley merge punctuation parts that are too small (less than a third target size)
    mergeSmallPunctuationParts(punctuationParts, characterPerPart / 3);

    //Stage 3: Break down parts that exceed target size significantly, into smaller parts that are closer to target size
    breakDownPartsExceedingTargetSize(
        punctuationParts,
        characterPerPart * 1.5,
        characterPerPart,
    );

    //Cleanup: merge sub arrays into the main array,
    const flattenedParts = punctuationParts.flatMap((part) =>
        Array.isArray(part) ? part : [part],
    );

    //Stage 4: Evaluate attraction joins between parts, merging parts that have strong attraction
    //This requires at least 3 parts to be meaningful and parts of a certain size,
    // as othwerwise there is a chance it will result in a single part
    if (flattenedParts.length > 2 && characterPerPart > 20)
        evaluateAttractionJoins(flattenedParts);

    return postProcess(flattenedParts);
}
