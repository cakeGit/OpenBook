import { PageTextBlock } from "../../components/blocks/text/text";
import { PageFlashcardsBlock } from "../../components/blocks/flashcards/container/flashcards";
import { PageTextFlashcardBlock } from "../../components/blocks/flashcards/flashcard/flashcard";
import { PageDrawingCanvasBlock } from "../../components/blocks/drawing_canvas/drawingCanvas";
import { PageImageBlock } from "../../components/blocks/image/image";

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
    drawing_canvas: {
        component: PageDrawingCanvasBlock,
    },
    image: {
        component: PageImageBlock,
    }
};