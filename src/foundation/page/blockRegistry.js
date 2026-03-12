export const BLOCK_REGISTRY = {
    text: {
        name: "Text",
        description: "A block for writing text.",
        type: "text",
    },
    textNumbered: {
        name: "Numbered list",
        description: "A block for writing numbered lists.",
        type: "text",
        defaultData: { subtype: "numbered" },
    },
    textBulleted: {
        name: "Bulleted list",
        description: "A block for writing bulleted lists.",
        type: "text",
        defaultData: { subtype: "bullet" },
    },
    textCallout: {
        name: "Callout text",
        description: "Adds a callout element to the document.",
        type: "text",
        defaultData: { subtype: "callout" },
    },
    textQuote: {
        name: "Quote text",
        description: "Adds a quote element to the document.",
        type: "text",
        defaultData: { subtype: "quote" },
    },
    textHeader: {
        name: "Text Header",
        description: "A block for organizing your content with headers.",
        type: "text",
        defaultData: { subtype: "header" },
    },
    textSubheading: {
        name: "Text Subheading",
        description: "A block for organizing your content with subheadings.",
        type: "text",
        defaultData: { subtype: "header_small" },
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
