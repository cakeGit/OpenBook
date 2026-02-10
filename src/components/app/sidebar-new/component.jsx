import { useRef } from "react";
import "./style.css";
import { AppSidebarLineBreak } from "./lineBreak/component.jsx";
import { AppSidebarNoteBookSelect } from "./noteBookSelect/component.jsx";
import { NotebookStructureView } from "./notebook_Structure/component.jsx";
import { CurrentLoginUserInfo } from "./current_login_user_info/component.jsx";
import { Link } from "react-router-dom";

export function AppSideBar({
    currentNotebookName,
    currentNotebookId,
}) {
    const sidebarRef = useRef(null);
    const sidebarTagRef = useRef(null);

    // const startShowingAppSidebar = () => {
    //     sidebarTagRef.current.classList.add("show");
    //     sidebarRef.current.classList.add("show");
    // };
    // const stopShowingAppSidebar = () => {
    //     sidebarTagRef.current.classList.remove("show");
    //     sidebarRef.current.classList.remove("show");
    // };

    const setSidebarLock = (locked) => {
        if (locked) {
            sidebarRef.current.classList.add("locked_open");
        } else {
            sidebarRef.current.classList.remove("locked_open");
        }
    };

    return (
        <div>
            <div ref={sidebarRef} className="app_sidebar">
                <div className="app_sidebar_logo">
                    <b>open</b>book 📖
                </div>
                <AppSidebarLineBreak />
                <div className="app_sidebar_navigation">
                    <Link to="/settings">Settings</Link>
                </div>
                <AppSidebarLineBreak />
                <AppSidebarNoteBookSelect currentName={currentNotebookName} currentNotebookId={currentNotebookId} />
                <NotebookStructureView notebookId={currentNotebookId} setSidebarLock={setSidebarLock} />
                <AppSidebarLineBreak />

                <CurrentLoginUserInfo />

                <div ref={sidebarRef} className="app_sidebar_pull_tab">
                    <svg
                        className="chevron"
                        viewBox="0 0 10 10"
                        width="10"
                        height="10"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                            position: "relative",
                            left: "1px",
                            color: "var(--color-text)",
                        }}
                    >
                        <path
                            d="M2 1 L6 5 L2 9"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                        />
                    </svg>
                </div>
            </div>
            {/* <div
                ref={sidebarTagRef}
                onMouseEnter={startShowingAppSidebar}
                className="app_sidebar_hover_tag"
            ></div>
            <div
                className="app_sidebar_hover_out_box"
                onMouseLeave={stopShowingAppSidebar}
            /> */}
        </div>
    );
}
