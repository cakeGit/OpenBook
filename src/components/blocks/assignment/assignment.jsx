import { useEffect, useRef, useState } from "react";
import "./assignment.css";
import { UrlInputModal } from "./inner_modals/urlInputModal.jsx";
import { useModal } from "../../../foundation/modals/genericModal.jsx";
import { FaClock, FaExternalLinkAlt, FaLink } from "react-icons/fa";
import { FaPencil, FaPlus } from "react-icons/fa6";
import { DateInputModal } from "./inner_modals/DateInputModal.jsx";
import { DeleteBlockOperation } from "../../../../backend/web/foundation_safe/page/pageOperations.js";

const MS_IN_DAY = 1000 * 60 * 60 * 24;

/**
 * Takes in the due date (integer timestamp from the database), comparing it to the current time
 * Outputs a string in the format of "in X days", "X days ago", "in X months", "X years ago" with an exception for "today"
 * Also returns the styling class to be used
 */
function getDueDateDisplay(dueDate) {
    //Since our units are only in a day, we need to keep it
    // as to avoid due dates within 23 hours always showing as today, even if its the next day
    function toDayOnly(date) {
        return new Date(Math.floor(date / MS_IN_DAY) * MS_IN_DAY);
    }

    const now = toDayOnly(new Date());
    // Get if the date is today
    const due = toDayOnly(new Date(dueDate));
    const deltaDays = Math.round((now - due) / MS_IN_DAY);
    const isToday = deltaDays === 0;

    let prefix = "";
    let suffix = "";

    //Decide the prefix and suffix if this happened before or after
    if (isToday) {
        return ["today", "due_date_today"];
    } else if (due < now) {
        suffix = " ago";
    } else {
        prefix = "in ";
    }

    //Get the difference of days (either forward or back in time but always positive)
    const differenceInDays = Math.abs(deltaDays);

    //Define our results
    let value;
    let unit;

    if (differenceInDays >= 365) {
        //In terms of years
        value = Math.round(differenceInDays / 365);
        unit = value !== 1 ? "years" : "year";
    } else if (differenceInDays >= 30) {
        //In terms of months
        value = Math.round(differenceInDays / 30);
        unit = value !== 1 ? "months" : "month";
    } else {
        //In terms of days
        value = differenceInDays;
        unit = value !== 1 ? "days" : "day";
    }

    //Return an array of the string and style, which can be easily unpacked as seen below.
    return [
        prefix + value + " " + unit + suffix,
        due < now ? "due_date_past" : "due_date_future",
    ];
}

export function PageAssignmentBlock({
    blockId,
    data,
    pageRef,
    children,
    blockRef,
}) {
    const assignmentDescriptionInputRef = useRef(null);
    const assignmentDescriptionContentSpanRef = useRef(null);
    const modalHook = useModal();

    const [dueDate, setDueDate] = useState(data.dueDate);
    const [url, setUrl] = useState(data.linkText);
    function isTrueLike(value) {
        //SQL gives 1, but we want to treat it as a boolean, so we need to check for both
        return value === true || value === 1;
    }
    const [completed, setCompleted] = useState(
        isTrueLike(data.completed || false),
    );

    useEffect(() => {
        if (assignmentDescriptionInputRef.current) {
            assignmentDescriptionInputRef.current.value =
                data.descriptionText || "";
        }
    }, [data]);

    function onDescriptionChanged(e) {
        pageRef.current.content[blockId].descriptionText = e.target.value;
        assignmentDescriptionContentSpanRef.current.innerText = e.target.value;
        pageRef.current.onChange(blockId);
    }

    //Define the method that is used when the due date button is clicked
    function openDueDateModal(e) {
        e.preventDefault();
        e.stopPropagation();
        //Define the method used for updating the due date, passed onto the date input modal as the "interface" to pass info back to the page
        function updateDueDate(newDate) {
            pageRef.current.content[blockId].dueDate = newDate;
            setDueDate(newDate);
            pageRef.current.onChange(blockId);
        }
        //Use the result of "useModal" to open the modal, abstracting without having to worry about the actual state implementation
        modalHook.openModal(
            new DateInputModal(modalHook, dueDate, updateDueDate),
        );
    }

    function openUrlModal(e) {
        e.preventDefault();
        e.stopPropagation();
        //Identical interfacing method as the due date modal, just for the url
        function updateUrl(newUrl) {
            pageRef.current.content[blockId].linkText = newUrl;
            setUrl(newUrl);
            pageRef.current.onChange(blockId);
        }
        modalHook.openModal(new UrlInputModal(modalHook, url, updateUrl));
    }

    //Gets both the text to display and the styling class from the getDueDateDisplay function
    const [deltaTimeString, dueDateClass] = getDueDateDisplay(dueDate);

    //When changed, update the block data, rendering, and network as normal
    function onCheckboxChanged(e) {
        pageRef.current.content[blockId].completed = e.target.checked;
        setCompleted(e.target.checked);
        pageRef.current.onChange(blockId);
    }

    //Cut down version of the code in the text block
    //This is then bound to the onKeyDown event
    function onCheckForDeleted(e) {
        if (e.key === "Backspace" && assignmentDescriptionInputRef.current.value === "") {
            e.preventDefault();
            pageRef.current.performAndSendOperation(
                new DeleteBlockOperation(blockId),
            );
        }
    }
    return (
        <div
            ref={blockRef}
            className={`assignment_block ${completed ? "due_date_complete" : dueDateClass}`}
        >
            {/*Uses the abstracted rendering method, so the modal is the only one that needs to worry about deciding if it should render or not*/}
            {modalHook.render()}

            {/* First div is left content 2nd div is right content */}
            <div>
                {/* Checkbox to mark the block as complete */}
                <input
                    type="checkbox"
                    className="assignment_checkbox"
                    defaultChecked={completed}
                    onChange={onCheckboxChanged}
                />

                <div className="assignment_description">
                    {/* trying out a different input scaling solution here, when the user types they type into the box, it updates the span, which is used to scale the input */}
                    <textarea
                        className={"assignment_description_input"}
                        ref={assignmentDescriptionInputRef}
                        onChange={onDescriptionChanged}
                        onKeyDown={onCheckForDeleted}
                        value={data.descriptionText}
                    ></textarea>
                    <span
                        className="assignment_description_spanner"
                        onClick={() =>
                            assignmentDescriptionInputRef.current.focus()
                        }
                        ref={assignmentDescriptionContentSpanRef}
                    >
                        {data.descriptionText}
                    </span>
                </div>
            </div>
            <div className="assignment_right_col">
                <div className="vertical_spacer"></div>
                <button
                    className="assignment_action_btn"
                    onClick={openDueDateModal}
                >
                    {dueDate ? (
                        <>
                            <FaClock /> Due {deltaTimeString}
                        </>
                    ) : (
                        <>
                            <FaPlus />
                            <FaClock />
                        </>
                    )}
                </button>
                <div className="vertical_spacer"></div>
                {url && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="assignment_link"
                    >
                        <FaExternalLinkAlt />
                    </a>
                )}
                <button
                    className="assignment_action_btn"
                    onClick={openUrlModal}
                >
                    {url ? (
                        <FaPencil />
                    ) : (
                        <>
                            <FaPlus />
                            <FaLink />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
