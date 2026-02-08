import { PageViewComponent } from "../../components/app/page_view/component.jsx";
import { AppSideBar } from "../../components/app/sidebar-new/component.jsx";
import { PageCenterContent } from "../../components/layout/pageCenterContent/component.jsx";
import "./App.css";

import { withAuthCheck } from "../../foundation/authApi.js";
import { fetchApi } from "../../foundation/api.js";
import { useState } from "react";
import { FlashcardFloatingButton } from "../../components/app/flashcard_floating_button/component.jsx";
import { useLocation } from "react-router-dom";

function BuildPage() {
    const { search } = useLocation();
    withAuthCheck();

    let [user, setUser] = useState(null);
    let [notebookName, setNotebookName] = useState(null);

    if (!user) {
        fetchApi("get_current_user_info")
            .then((data) => {
                setUser(data);
            })
            .catch((error) => {
                console.error("Failed to get current user:", error);
            });
        return <></>;
    }

    //Read query params for notebook_id and page_id
    const urlParams = new URLSearchParams(window.location.search);
    const currentNotebookId = urlParams.get("notebook_id");
    const currentPageId = urlParams.get("page_id");

    if (!currentNotebookId) {
        fetchApi("notebook/get_default_notebook")
            .then((data) => {
                window.location.href = "/?notebook_id=" + data.notebook_id;
            })
            .catch((error) => {
                console.error("Failed to get default notebook:", error);
            });
        return <></>;
    } else {
        fetchApi("notebook/get_accessible_notebook_name", {
            notebook_id: currentNotebookId,
        })
            .then((data) => {
                setNotebookName(data.name);
            })
            .catch((error) => {
                console.error(
                    `No access to notebook '${currentNotebookId}':`,
                    error,
                );
                window.location.href = currentPageId
                    ? "/?page_id=" + currentPageId
                    : "/";
            });
    }

    if (!currentPageId) {
        fetchApi("notebook/get_default_page", {
            notebook_id: currentNotebookId,
        })
            .then((data) => {
                window.location.href =
                    "/?notebook_id=" +
                    currentNotebookId +
                    "&page_id=" +
                    data.page_id;
            })
            .catch((error) => {
                console.error("Failed to get default page:", error);
            });
        return <></>;
    }

    return (
        <div key={search}>
            <FlashcardFloatingButton currentNotebookId={currentNotebookId} />
            <AppSideBar
                currentNotebookName={notebookName}
                currentNotebookId={currentNotebookId}
            />
            <PageCenterContent>
                {currentPageId ? (
                    <PageViewComponent pageId={currentPageId} />
                ) : (
                    <div>Loading page...</div>
                )}
            </PageCenterContent>
            {/* <CenterColumn>
        <h1>UntitledNotesApp</h1>
        {/* <PageViewComponent pageUuid=""></PageViewComponent> }
      </CenterColumn> */}
        </div>
    );
}

export default BuildPage;
