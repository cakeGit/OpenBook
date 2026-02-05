DELETE FROM TextBlocks
WHERE BlockID IN (
    SELECT Blocks.BlockID
    FROM Blocks
    WHERE Blocks.PageID = $pageId
);

DELETE FROM FlashcardBlocks
WHERE BlockID IN (
    SELECT Blocks.BlockID
    FROM Blocks
    WHERE Blocks.PageID = $pageId
);

DELETE FROM DrawingCanvasBlocks
WHERE BlockID IN (
    SELECT Blocks.BlockID
    FROM Blocks
    WHERE Blocks.PageID = $pageId
);

DELETE FROM ImageBlocks
WHERE BlockID IN (
    SELECT Blocks.BlockID
    FROM Blocks
    WHERE Blocks.PageID = $pageId
);

--Finally, after deleting from dependent tables, delete from Blocks table
DELETE FROM Blocks
WHERE BlockID IN (
    SELECT Blocks.BlockID
    FROM Blocks
    WHERE Blocks.PageID = $pageId
)