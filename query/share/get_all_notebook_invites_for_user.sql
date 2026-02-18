SELECT * FROM NotebookInvites, Notebooks, Users
WHERE NotebookInvites.InvitedUserID = $UserID
    AND NotebookInvites.NotebookID = Notebooks.NotebookID
    AND Notebooks.OwnerUserID = Users.UserID;