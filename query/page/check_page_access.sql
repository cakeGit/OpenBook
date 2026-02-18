SELECT * FROM Pages, Notebooks
WHERE Pages.PageID = $PageID
    AND Pages.NotebookID = Notebooks.NotebookID
    AND (Notebooks.OwnerUserID = $UserID
        OR Notebooks.NotebookID IN
            (SELECT NotebookID FROM NotebookShares
                WHERE SharedWithUserID = $UserID))
LIMIT 1;