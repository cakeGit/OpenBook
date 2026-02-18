--First remove the notebook from the invites (if exists)
DELETE FROM NotebookInvites WHERE NotebookID = $NotebookID AND InvitedUserId = $UserID;
--Then remove the share (if exists)
DELETE FROM NotebookShares WHERE NotebookID = $NotebookID AND SharedWithUserId = $UserID;