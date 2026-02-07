import { Fragment, useEffect, useRef, useState } from "react";
import { LocalPage } from "../../../foundation/page/localPage.js";
import "./style.css";
import { renderChildBlocks } from "../../../foundation/blockRenderer.jsx";
import { PageNetHandler } from "../../../foundation/page/localPageNetHandler.js";
import { EmptyPageHint } from "../page_empty_hint/component.jsx";
import { PageAddBlockPopover } from "../page_add_popover/component.jsx";
import { AppLineBreak } from "../line_break/component.jsx";
import { VALID_PAGE_NAME } from "../../../../backend/web/foundation_safe/validations.js";
import { createPortal } from "react-dom";
import { UndoRedoFloatingButton } from "../undo_redo_floating_button/component.jsx";

//Methods we use for the display and handling of editing the page name
function trySubmitNameChange(
    pageRef,
    pageNameChangeRef,
    linkedNetHandler,
    pageNameRef,
) {
    //If the page isnt loaded, or missing metadata from server, ignore
    if (!pageRef.current || !pageRef.current.metadata) return;

    //Remove spaces from start and end
    const newName = pageNameChangeRef.current.value.trim();

    pageNameChangeRef.current.style.display = "none";
    pageNameRef.current.style.display = "inline-block";

    const validity = VALID_PAGE_NAME.test(newName);
    if (validity.isValid) {
        if (newName === pageRef.current.metadata.name) return; //Valid, but no change, ignore
        console.log("Submitting name change to:", newName);

        pageRef.current.metadata.name = newName;
        pageNameRef.current.textContent = newName;
        //If valid and not the same, we update the meta and send to the server
        const newMetadata = {
            ...pageRef.current.metadata,
            name: newName,
        };
        linkedNetHandler.current.sendMetadata(newMetadata);
    } else {
        //Alert the user the name was invalid
        alert("Invalid page name! " + validity.errorMessage);
    }
}

function startPageNameChange(pageNameRef, pageNameChangeRef) {
    //If the page isnt loaded, or missing metadata from server, ignore
    if (!pageNameRef.current || !pageNameChangeRef.current) return;

    pageNameChangeRef.current.style.display = "inline";
    pageNameRef.current.style.display = "none";
    pageNameChangeRef.current.focus();
    pageNameChangeRef.current.value = pageNameRef.current.textContent;
}

export function PageViewComponent({ pageId }) {
    const socketRef = useRef(null);

    const pageRef = useRef(null);
    const linkedNetHandler = useRef(null);
    const pageNameRef = useRef(null);
    const pageNameChangeRef = useRef(null);

    const [renderTick, setRenderTick] = useState(0);

    useEffect(() => {
        //If there is no page, make one
        if (!pageRef.current) {
            //Create an empty page for now
            pageRef.current = new LocalPage({ children: [] }, {});

            window.pageRef = pageRef; // (Debug, makes the pageRef avaliable on the console)

            //Bind the page to the net handler if it is ready
            if (linkedNetHandler.current) {
                pageRef.current.linkedNetHandler = linkedNetHandler.current;
            }
        }

        //Register the "primary container" to the page
        pageRef.current.primaryContainerRef = primaryContainerRef;

        //Register the structure rerender trigger, adds one to the tick to force react to recreate the whole component
        pageRef.current.triggerStructureRerender = () => {
            setRenderTick((tick) => tick + 1);
        };

        return () => {
            pageRef.current.triggerStructureRerender = null;
            pageRef.current.primaryContainerRef = null;
        };
    }, []);

    const primaryContainerRef = useRef(null);
    const pageCurrentNameRef = useRef(null);

    useEffect(() => {
        //Connect to the websocket
        const ws = new WebSocket(
            `ws://${window.location.host}/page_editor?pageId=${pageId}`,
        );

        //Create the net handler
        const pageNetHandler = new PageNetHandler(pageRef, ws);
        pageNetHandler.updateMetadata = (metadata) => {
            pageCurrentNameRef.current = metadata.name
            if (pageNameRef.current) {
                pageNameRef.current.textContent = metadata.name;
                pageNameChangeRef.current.value = metadata.name;
            }
        };
        //Make the net handler avaliable to loading pages
        linkedNetHandler.current = pageNetHandler;

        //However, if a page already exists then bind the net handler to it
        if (pageRef.current) {
            pageRef.current.linkedNetHandler = pageNetHandler;
        }

        socketRef.current = ws;

        return () => {
            ws.close();
        };
    }, [pageId]);

    //Temp: disabled key={renderTick}
    //React is actually strong enough to just handle updates to structure itself,
    // the full remount also causes incredible lag.
    return (
        <Fragment>
            {createPortal(
                <UndoRedoFloatingButton pageRef={pageRef} />,
                document.body,
            )}
            <h1>
                {/*The name of the page, and the input box that takes its place when we edit it*/}
                <span
                    ref={pageNameRef}
                    className="page_name_span"
                    onClick={() =>
                        startPageNameChange(pageNameRef, pageNameChangeRef)
                    }
                >{pageCurrentNameRef.current}</span>
                <input
                    ref={pageNameChangeRef}
                    type="text"
                    className="page_name_input"
                    defaultValue={pageCurrentNameRef.current}
                    style={{ display: "none" }}
                    onBlur={() =>
                        trySubmitNameChange(
                            pageRef,
                            pageNameChangeRef,
                            linkedNetHandler,
                            pageNameRef,
                        )
                    }
                    onSubmit={() =>
                        trySubmitNameChange(
                            pageRef,
                            pageNameChangeRef,
                            linkedNetHandler,
                            pageNameRef,
                        )
                    }
                />
            </h1>
            <AppLineBreak />
            <br />
            <div ref={primaryContainerRef} className="page_view">
                {pageRef.current ? (
                    pageRef.current.structure.children.length > 0 ? (
                        renderChildBlocks(
                            pageRef.current.structure.children,
                            pageRef.current.content,
                            pageRef,
                        )
                    ) : (
                        <EmptyPageHint pageRef={pageRef} />
                    )
                ) : null}

                <PageAddBlockPopover pageRef={pageRef} />
            </div>
        </Fragment>
    );
}
