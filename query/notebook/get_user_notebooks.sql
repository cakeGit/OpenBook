SELECT Users.DisplayName as OwnerDisplayName, Users.LabelName as OwnerLabelName, Users.UserID as OwnerUserID, Notebooks.NotebookId, Notebooks.Name
FROM Notebooks, Users
WHERE (Notebooks.OwnerUserID = $UserID OR
    (Notebooks.NotebookID IN
        (SELECT NotebookID FROM NotebookShares WHERE SharedWithUserID = $UserID)))
    AND Users.UserID = Notebooks.OwnerUserID