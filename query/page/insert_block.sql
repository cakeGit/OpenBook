REPLACE INTO Blocks (
    BlockID, ParentBlockID, OrderIndex, Type, PageID
) VALUES ($BlockID, $ParentBlockID, $OrderIndex, $Type, $PageID);

-- Insert into specific block type tables:

-- Sqlite doesent seem to directly have IF statements, if this script starts getting slow i will add them
-- but this will insert into TextBlocks if the block type is 'text', and does nothing otherwise
REPLACE INTO TextBlocks (BlockID, TextContent, Subtype)
SELECT $BlockID, $TextContent, $Subtype
WHERE $Type = 'text';

REPLACE INTO FlashcardBlocks (BlockID, FrontText, BackText, FrontCanvasDocumentData, BackCanvasDocumentData, FlashcardLinkID)
SELECT $BlockID, $FrontText, $BackText, $FrontCanvasDocumentData, $BackCanvasDocumentData, $FlashcardLinkID
WHERE $Type = 'flashcard';

REPLACE INTO DrawingCanvasBlocks (BlockID, DocumentData)
SELECT $BlockID, $DocumentData
WHERE $Type = 'drawing_canvas';

REPLACE INTO ImageBlocks (BlockID, ResourceID)
SELECT $BlockID, $ResourceID
WHERE $Type = 'image';

REPLACE INTO AssignmentBlocks (BlockID, DescriptionText, LinkText, DueDate, Completed)
SELECT $BlockID, $DescriptionText, $LinkText, $DueDate, $Completed
WHERE $Type = 'assignment';
