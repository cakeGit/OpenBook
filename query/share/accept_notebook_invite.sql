--Delete from the invites
DELETE FROM NotebookInvites WHERE NotebookID = $NotebookID AND InvitedUserId = $UserID;
--Then add to the shares
INSERT OR REPLACE INTO NotebookShares (NotebookID, SharedWithUserID) VALUES ($NotebookID, $UserID);