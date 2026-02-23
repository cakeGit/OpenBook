import { PageTextBlock } from "../../components/blocks/text/text";
import { PageFlashcardsBlock } from "../../components/blocks/flashcards/container/flashcards";
import { PageTextFlashcardBlock } from "../../components/blocks/flashcards/flashcard/flashcard";
import { PageDrawingCanvasBlock } from "../../components/blocks/drawing_canvas/drawingCanvas";
import { PageImageBlock } from "../../components/blocks/image/image";
import { PageMathBlock } from "../../components/blocks/math/math.jsx";
import { PageAssignmentsContainerBlock } from "../../components/blocks/assignments_container/assignment_container.jsx";
import { PageAssignmentBlock } from "../../components/blocks/assignment/assignment.jsx";

export const BLOCK_TYPE_REGISTRY = {
    text: {
        component: PageTextBlock,
    },
    flashcards: {
        component: PageFlashcardsBlock,
    },
    flashcard: {
        component: PageTextFlashcardBlock,
        containerType: "flashcard",
        hidesAddButton: true,
    },
    assignment_container: {
        component: PageAssignmentsContainerBlock,
        childSorting: (blockA, blockB) => {
            //If there is a difference in completion status, sort by that first

            //Extract each piece of data before using it, so we can explicily define the default value
            const completedA = blockA.completed || false;
            const completedB = blockB.completed || false;

            if (completedA !== completedB) {
                //Implcitly turn the boolean into a number (false = 0, true = 1) and subtract to get the order (complete stuff at the end)
                console.log("Branch 1 value ", completedA - completedB, completedA, completedB);
                return completedA - completedB;
            }
            //Otherwise, just sort by due date, earliest first
            //However, I realised for completed entries, its useful to put the most recently completed ones first
            //No due date means it should be treated as never due, so use use a very big number as its due date.
            //Infinity cannot be used as Infinity - Infinity is NaN, which breaks the sorting, but MAX_SAFE_INTEGER works fine
            const dueDateA = blockA.dueDate || Number.MAX_SAFE_INTEGER;
            const dueDateB = blockB.dueDate || Number.MAX_SAFE_INTEGER;
            console.log("Branch 2 value ", (
                (completedA ? -1 : 1) * //Flip the order if completed (at this point they arethe same)
                (dueDateA - dueDateB)
            ), completedA, completedB, dueDateA, dueDateB);
            return (
                (completedA ? -1 : 1) * //Flip the order if completed (at this point they arethe same)
                (dueDateA - dueDateB)
            ); //This doesent have to be +1 or -1, so we can just return the raw difference in time
        },
    },
    assignment: {
        component: PageAssignmentBlock,
        containerType: "assignment",
        hidesAddButton: true,
        hidesDragButton: true,
    },
    drawing_canvas: {
        component: PageDrawingCanvasBlock,
    },
    maths: {
        component: PageMathBlock,
    },
    image: {
        component: PageImageBlock,
    },
};
