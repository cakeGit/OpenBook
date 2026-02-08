import { useEffect, useRef, useState } from "react";
import { ALL_FIELDS_PRESENT } from "../../../../../backend/web/foundation_safe/validations.js";
import { startDraggingPage } from "./pageDrag";
import "./style.css";
import { Link } from "react-router-dom";

function NotebookHighlightTarget({ ref }) {
    return (
        <div
            style={{
                width: "100%",
                height: "0",
                position: "relative",
            }}
        >
            <div
                ref={ref}
                style={{
                    //TODO: make this a stylesheet thing
                    height: "3px",
                    width: "100%",
                    opacity: 0,
                    backgroundColor: "var(--color-accent)",
                    borderRadius: "2px",
                }}
            ></div>
        </div>
    );
}

function NotebookStructureNode({
    parentId,
    item,
    index,
    level,
    notebookId,
    structurePlaceTargets,
    currentDragInfoRef,
    socketRef,
    sendPageMove,
    first,
    setSidebarLock,
    currentPageId,
}) {
    const pageRef = useRef();
    const abovePlaceTargetRef = useRef();
    const belowPlaceTargetRef = useRef();
    const belowIndentedPlaceTargetRef = useRef();

    structurePlaceTargets.push({
        refs: [
            { ref: abovePlaceTargetRef, index: index },
            { ref: belowPlaceTargetRef, index: index + 1 },
            { ref: belowIndentedPlaceTargetRef, index: 0, inside: true },
        ],
        pageId: item.pageId,
        parentId: parentId,
    });

    return (
        <div>
            {first ? (
                <NotebookHighlightTarget ref={abovePlaceTargetRef} />
            ) : null}

            <div ref={pageRef}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Link
                        to={`/?notebook_id=${notebookId}&page_id=${item.pageId}`}
                        className="notebook_structure_page_name"
                        style={{
                            fontWeight:
                                item.pageId === currentPageId ? "700" : "500",
                            textDecoration:
                                item.pageId === currentPageId
                                    ? "underline"
                                    : "none",
                        }}
                    >
                        {item.name || "(untitled)"}
                    </Link>

                    <button
                        style={{ display: "block" }}
                        onClick={() =>
                            startDraggingPage(
                                currentDragInfoRef,
                                structurePlaceTargets,
                                item.pageId,
                                pageRef,
                                socketRef,
                                sendPageMove,
                                setSidebarLock
                            )
                        }
                        className="page_structure_drag_button"
                    >
                        =
                    </button>
                </div>

                <div
                    style={{
                        marginLeft: "10px",
                        marginBottom: "1px",
                        marginTop: "1px",
                        borderLeft: `3px solid rgba(0.25, 0.25, 0.25, ${
                            1 / (3 + level)
                        })`,
                        paddingLeft: "10px",
                    }}
                >
                    {item.children && item.children.length > 0 ? (
                        <NotebookStructureLevel
                            structure={item.children}
                            parentId={item.pageId}
                            level={level + 1}
                            notebookId={notebookId}
                            structurePlaceTargets={structurePlaceTargets}
                            currentDragInfoRef={currentDragInfoRef}
                            socketRef={socketRef}
                            sendPageMove={sendPageMove}
                            setSidebarLock={setSidebarLock}
                            currentPageId={currentPageId}
                        />
                    ) : (
                        <NotebookHighlightTarget
                            ref={belowIndentedPlaceTargetRef}
                        />
                    )}
                </div>

                <NotebookHighlightTarget ref={belowPlaceTargetRef} />
            </div>
        </div>
    );
}

function NotebookStructureLevel({
    structure,
    parentId = null,
    level = 0,
    notebookId,
    structurePlaceTargets = [],
    currentDragInfoRef,
    socketRef,
    sendPageMove,
    setSidebarLock,
    currentPageId,
}) {
    let first = true;
    return (
        <div>
            {structure ? (
                structure.map((item, index) => {
                    let component = (
                        <NotebookStructureNode
                            parentId={parentId}
                            key={index}
                            item={item}
                            index={index}
                            level={level}
                            notebookId={notebookId}
                            structurePlaceTargets={structurePlaceTargets}
                            currentDragInfoRef={currentDragInfoRef}
                            socketRef={socketRef}
                            sendPageMove={sendPageMove}
                            first={first}
                            setSidebarLock={setSidebarLock}
                            currentPageId={currentPageId}
                        />
                    );
                    first = false;
                    return component;
                })
            ) : (
                <div>Loading notebook...</div>
            )}
        </div>
    );
}

function handleStructureEditorMessage(message, updateStructure) {
    switch (message.type) {
        case "notebook_structure":
            const structure = message.structure;
            ALL_FIELDS_PRESENT.test({ structure }).throwErrorIfInvalid();
            //Render the notebook structure in the UI
            updateStructure(structure);
            break;
        default:
            console.warn(
                "Unknown message type from structure editor:",
                message.type
            );
    }
}

export function NotebookStructureView({ notebookId, setSidebarLock }) {
    let [notebookStructure, setNotebookStructure] = useState(null);
    let [rerenderKey, setRerenderKey] = useState(0);
    let currentDragInfoRef = useRef(null);
    let socketRef = useRef(null);

    const structurePlaceTargets = [];

    const requestNewPage = useRef(() => {});
    const sendPageMove = useRef(() => {});

    //Open a websocket connection to the structure editor for this notebook
    useEffect(() => {
        const ws = new WebSocket(
            `ws://${window.location.host}/structure_editor?notebookId=${notebookId}`
        );

        ws.onopen = () => {
            console.log("Connected to notebook structure editor WebSocket");
            requestNewPage.current = () => {
                console.log("Requesting new page");
                ws.send(
                    JSON.stringify({
                        type: "request_new_page", //Kinda debug rn, since there is no information about where we want the page or what name
                    })
                );
            };
            sendPageMove.current = (pageId, newParentId, newIndex) => {
                console.log(
                    "Sending page move:",
                    pageId,
                    newParentId,
                    newIndex
                );
                ws.send(
                    JSON.stringify({
                        type: "move_page",
                        pageId,
                        newParentId,
                        newIndex,
                    })
                );
            };
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            try {
                handleStructureEditorMessage(message, (struct) => {
                    setNotebookStructure(struct);
                    setRerenderKey((key) => key + 1);
                });
            } catch (error) {
                console.error(
                    "Error handling message from structure editor:",
                    error
                );
            }
        };

        return () => {
            ws.close();
        };
    }, [notebookId]);

    const currentPageId = new URLSearchParams(window.location.search).get(
        "page_id"
    );

    return (
        <>
            <NotebookStructureLevel
                key={rerenderKey}
                structure={notebookStructure?.children}
                notebookId={notebookId}
                structurePlaceTargets={structurePlaceTargets}
                currentDragInfoRef={currentDragInfoRef}
                socketRef={socketRef}
                sendPageMove={sendPageMove}
                setSidebarLock={setSidebarLock}
                currentPageId={currentPageId}
            />

            <div className="page_structure_new_page_container">
                <button
                    onClick={() => requestNewPage.current()}
                    className="page_structure_new_page_button"
                >
                    +
                </button>
            </div>
        </>
    );
}
