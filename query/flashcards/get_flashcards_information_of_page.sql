SELECT
FrontText, BackText,
FrontCanvasDocumentData, BackCanvasDocumentData,
LastLearnedTime,
FlashcardBlocks.FlashcardLinkID,
(LearningHistory & 3) AS LearningHistory1,
((LearningHistory >> 2) & 3) AS LearningHistory2,
((LearningHistory >> 4) & 3) AS LearningHistory3,
((LearningHistory >> 6) & 3) AS LearningHistory4
FROM FlashcardBlocks, Blocks
LEFT JOIN FlashcardLearningHistory ON FlashcardBlocks.FlashcardLinkID = FlashcardLearningHistory.FlashcardLinkID
WHERE Blocks.BlockID = FlashcardBlocks.BlockID
AND Blocks.PageID = ?;