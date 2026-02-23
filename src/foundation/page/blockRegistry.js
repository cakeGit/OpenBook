export const BLOCK_REGISTRY = {
    text: {
        name: "Text",
        description: "A block for writing text.",
        type: "text",
    },
    textHeader: {
        name: "Text Header",
        description: "A block for writing text That needs to stand out.",
        type: "text",
        defaultData: { subtype: "header" },
    },
    flashcards: {
        name: "Flashcards",
        description: "A block for holding your flashcards.",
        type: "flashcards",
    },
    assignment_container: {
        name: "Assignments",
        description: "A block for organizing your todos and assignments.",
        type: "assignment_container",
    },
    drawingCanvas: {
        name: "Drawing Canvas",
        description: "A block for drawing diagrams or writing on a canvas.",
        type: "drawing_canvas",
    },
    image: {
        name: "Image",
        description: "A block for displaying an image.",
        type: "image",
    },
    maths: {
        name: "Maths",
        description: "Write mathematical equations quicky",
        type: "maths",
    }
};
