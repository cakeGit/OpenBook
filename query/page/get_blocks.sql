--Fancy sql statement, because we have a "conditional join" the LEFT JOIN can be used to fill in all the information in one go
SELECT 
    Blocks.*, 
    TextBlocks.TextContent, 
    TextBlocks.Subtype, 
    FlashcardBlocks.FrontText, 
    FlashcardBlocks.BackText,
    FlashcardBlocks.FrontCanvasDocumentData,
    FlashcardBlocks.BackCanvasDocumentData,
    FlashcardBlocks.FlashcardLinkID,
    DrawingCanvasBlocks.DocumentData,
    ImageBlocks.ResourceID
FROM Blocks

LEFT JOIN TextBlocks ON Blocks.BlockID = TextBlocks.BlockID AND Blocks.Type = 'text'
LEFT JOIN FlashcardBlocks ON Blocks.BlockID = FlashcardBlocks.BlockID AND Blocks.Type = 'flashcard'
LEFT JOIN DrawingCanvasBlocks ON Blocks.BlockID = DrawingCanvasBlocks.BlockID AND Blocks.Type = 'drawing_canvas'
LEFT JOIN ImageBlocks ON Blocks.BlockID = ImageBlocks.BlockID AND Blocks.Type = 'image'

WHERE Blocks.PageID = ?;