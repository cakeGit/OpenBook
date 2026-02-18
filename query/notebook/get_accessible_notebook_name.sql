SELECT Name FROM Notebooks
WHERE NotebookID = $NotebookID
AND (OwnerUserID = $UserID
        OR NotebookID IN
            (SELECT NotebookID FROM NotebookShares WHERE
                    SharedWithUserID = $UserID)
    );