import { Link } from "react-router-dom";
import { AppLineBreak } from "../../components/app/line_break/component";
import { PageCenterContent } from "../../components/layout/pageCenterContent/component";
import { fetchApi } from "../../foundation/api";
import { useApi } from "../../foundation/useApiData";
import { Fragment, useState } from "react";
import { DeleteNotebookModal } from "./modals/deleteModal.jsx";
import { RenameNotebookModal } from "./modals/renameModal.jsx";
import "./style.css";
import { ShareNotebookModal } from "./modals/shareModal.jsx";
import { LeaveNotebookModal } from "./modals/leaveModal.jsx";
import { RevokeNotebookAccessModal } from "./modals/revokeModal.jsx";

export default function BuildPage() {
    const { data, loading, error } = useApi(async () => {
        const userInfo = await fetchApi("get_current_user_info", {});
        const notebooksInfo = await fetchApi("notebook/get_user_notebooks", {});
        const ownedNotebookShares = await fetchApi(
            "share/get_all_owned_notebook_shares",
            {},
        );
        const incomingShares = await fetchApi(
            "share/get_all_notebook_invites_for_user",
            {},
        );
        console.log(
            userInfo,
            notebooksInfo,
            "Owned shares: ",
            ownedNotebookShares,
            "Incoming shares: ",
            incomingShares,
        );

        return {
            userInfo,
            notebooksInfo,
            ownedNotebookShares,
            incomingShares,
        };
    });

    const thisUserId = data?.userInfo?.user_id;

    //Holds a subclass of settingsModal or a null to mean no modal
    const [currentModal, setCurrentModal] = useState(null);

    if (loading || error) return <></>;

    //Generic modal open method, instead of the type specific one we had before
    function clickOpenModal(e, modal) {
        e.stopPropagation();
        e.preventDefault();
        setCurrentModal(modal);
    }

    //Notebook creation method when the create notebook button is clicked, calls the API and then reloads the page
    function createNewNotebook() {
        fetchApi("notebook/create_notebook", {}).then(() => {
            window.location.href = window.location.href;
        });
    }

    //Notebook invite accept and ignore, both will sent the relevant api call and reload page
    function acceptNotebookInvite(e, notebookId) {
        e.stopPropagation();
        e.preventDefault();
        fetchApi("share/accept_notebook_invite", { notebookId }).then(() => {
            window.location.href = window.location.href;
        });
    }

    function ignoreNotebookInvite(e, notebookId) {
        e.stopPropagation();
        e.preventDefault();
        fetchApi("share/ignore_notebook_invite", { notebookId }).then(() => {
            window.location.href = window.location.href;
        });
    }

    return (
        <>
            {currentModal ? currentModal.render() : null}

            <PageCenterContent>
                <h1>
                    Settings <Link to={"/"}>(Return to app)</Link>
                </h1>
                <AppLineBreak />
                <h2>Account information</h2>
                <p>Display name: {data.userInfo.display_name}</p>
                <p>Email: {data.userInfo.email}</p>
                <p>Tag: @{data.userInfo.label_name}</p>
                <AppLineBreak />
                <h2>Your notebooks</h2>

                <div className="notebooks_options_container inset_container">
                    {data.notebooksInfo.notebooks.map((notebook) => {
                        const outgoingInvites =
                            data.ownedNotebookShares.pendingShares[
                                notebook.notebookId
                            ] || [];
                        const activeShares =
                            data.ownedNotebookShares.shares[
                                notebook.notebookId
                            ] || [];
                        const showShareDetails =
                            outgoingInvites.length > 0 ||
                            activeShares.length > 0;

                        return (
                            <Fragment key={notebook.notebookId}>
                                <div className="notebook_options">
                                    <div className="notebook_options_inner">
                                    <span>
                                        <b>{notebook.name}</b>&nbsp;
                                        {notebook.ownerUserId !== thisUserId ? (
                                            <>
                                                (<b>{notebook.ownerDisplayName}<span className="secondary_text">@{notebook.ownerLabelName}</span></b>)
                                            </>
                                        ) : null}
                                    </span>

                                    {notebook.ownerUserId === thisUserId ? (
                                        getNotebookButtonsForOwner(
                                            clickOpenModal,
                                            notebook,
                                            setCurrentModal,
                                        )
                                    ) : (
                                        <>
                                            {getNotebookButtonsForShared(
                                                clickOpenModal,
                                                notebook,
                                                setCurrentModal,
                                                thisUserId,
                                            )}
                                        </>
                                    )}
                                    </div>

                                    {showShareDetails ? (
                                        <div className="notebook_share_list inset_container">
                                            {outgoingInvites.map((invite) => (
                                                <OutgoingInvite
                                                    key={`invite-${invite.notebookId}-${invite.invitedUserId}`}
                                                    invite={invite}
                                                    notebook={notebook}
                                                    clickOpenModal={
                                                        clickOpenModal
                                                    }
                                                    setCurrentModal={
                                                        setCurrentModal
                                                    }
                                                />
                                            ))}
                                            {activeShares.map((share) => (
                                                <ActiveShare
                                                    key={`share-${share.notebookId}-${share.sharedWithUserId}`}
                                                    share={share}
                                                    notebook={notebook}
                                                    clickOpenModal={
                                                        clickOpenModal
                                                    }
                                                    setCurrentModal={
                                                        setCurrentModal
                                                    }
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </Fragment>
                        );
                    })}

                    <button onClick={createNewNotebook}>
                        Create new notebook
                    </button>
                </div>

                <AppLineBreak />

                <h2>Notebook share invites</h2>
                <div className="invites_options_container inset_container">
                    {data.incomingShares.incomingShares.length === 0 ? (
                        <p>No pending invites</p>
                    ) : (
                        data.incomingShares.incomingShares.map((invite) => (
                            <div
                                key={invite.notebookId}
                                className="invite_option"
                            >
                                <div>
                                    Invitation to join <b>{invite.name}</b> from
                                    user {invite.displayName}
                                    <span className="secondary_text">
                                        (@{invite.labelName})
                                    </span>
                                </div>
                                <div>
                                    <button
                                        onClick={(e) =>
                                            acceptNotebookInvite(
                                                e,
                                                invite.notebookId,
                                            )
                                        }
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={(e) =>
                                            ignoreNotebookInvite(
                                                e,
                                                invite.notebookId,
                                            )
                                        }
                                    >
                                        Ignore
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PageCenterContent>
        </>
    );
}

//Contains the owner specific buttons on a notebook
//No change to inside function, just moved out of the main component for better structure
function getNotebookButtonsForOwner(clickOpenModal, notebook, setCurrentModal) {
    return (
        <div>
            {/*This is where the delete/rename modals are opened*/}
            {/*They call clickOpenModal which will set the current modal to the appropriate modal component,*/}
            {/* as well as stoping the click from immediately closing the modal*/}
            <button
                onClick={(e) =>
                    clickOpenModal(
                        e,
                        new ShareNotebookModal(
                            notebook.notebookId,
                            notebook.name,
                            setCurrentModal,
                        ),
                    )
                }
            >
                Share
            </button>
            <button
                onClick={(e) =>
                    clickOpenModal(
                        e,
                        new RenameNotebookModal(
                            notebook.notebookId,
                            notebook.name,
                            setCurrentModal,
                        ),
                    )
                }
            >
                Rename
            </button>
            <button
                onClick={(e) =>
                    clickOpenModal(
                        e,
                        new DeleteNotebookModal(
                            notebook.notebookId,
                            notebook.name,
                            setCurrentModal,
                        ),
                    )
                }
            >
                Delete
            </button>
        </div>
    );
}

//Contains the shared (non-owner) specific buttons on a notebook
//Dummy for now, no functionality
function getNotebookButtonsForShared(
    clickOpenModal,
    notebook,
    setCurrentModal,
    userId,
) {
    return (
        <div>
            {/*This is where the leave share modal is opened*/}
            <button
                onClick={(e) =>
                    clickOpenModal(
                        e,
                        new LeaveNotebookModal(
                            notebook.notebookId,
                            notebook.name,
                            userId,
                            setCurrentModal,
                        ),
                    )
                }
            >
                Leave
            </button>
        </div>
    );
}

    function OutgoingInvite({ invite, notebook, clickOpenModal, setCurrentModal }) {
        return (
            <div className="notebook_share_entry">
                <span>
                    Pending invite to user <b>{invite.displayName}<span className="secondary_text">@{invite.labelName}</span></b>
                </span>
                <button
                    onClick={(e) =>
                        clickOpenModal(
                            e,
                            new RevokeNotebookAccessModal(
                                notebook.notebookId,
                                notebook.name,
                                invite.invitedUserId,
                                invite.displayName,
                                invite.labelName,
                                setCurrentModal,
                                true,
                            ),
                        )
                    }
                >
                    Revoke
                </button>
            </div>
        );
    }

    function ActiveShare({ share, notebook, clickOpenModal, setCurrentModal }) {
        return (
            <div className="notebook_share_entry">
                <span>
                    Shared with user <b>{share.displayName}<span className="secondary_text">@{share.labelName}</span></b>
                </span>
                <button
                    onClick={(e) =>
                        clickOpenModal(
                            e,
                            new RevokeNotebookAccessModal(
                                notebook.notebookId,
                                notebook.name,
                                share.sharedWithUserId,
                                share.displayName,
                                share.labelName,
                                setCurrentModal,
                                false,
                            ),
                        )
                    }
                >
                    Revoke
                </button>
            </div>
        );
    }
