import { serializeOperation } from "../../../backend/web/foundation_safe/page/pageOperations";
import { handleLocalRequest } from "./pageLocalEditorHandler";

//Remove the react data since we cant send that, and it causes JSON to fail
export function getCleanNetworkBlockData(blockData) {
    let result = {};
    for (const key in blockData) {
        if (key != "ref" && key != "setData") {
            result[key] = blockData[key];
        }
    }
    return result;
}

export class PageNetHandler {
    constructor(pageRef, ws) {
        this.pageRef = pageRef;
        this.ws = ws;
        this.updateMetadata = () => {
            console.warn("Called update meta before initialized");
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "invalid_close_connection") {
                console.log(
                    "Closing local editor connection due to invalid message",
                );
                alert(
                    msg.message || "Connection closed due to invalid message.",
                );
                if (msg.link_action == "goto_default_page") {
                    console.log("Returning to default page as instructed");
                    localStorage.clear("currentPageId");
                    localStorage.clear("currentNotebookId");
                    window.location.href = "/";
                }
                ws.close();
            }
            try {
                handleLocalRequest(this.pageRef.current, ws, msg, this);
                if (msg.hash) {
                    const localHash = this.pageRef.current.getLocalHash();
                    if (localHash !== msg.hash) {
                        console.log(
                            "Hash mismatch after handling message, requesting full resync",
                        );
                        this.requestFullResync();
                    }
                }
            } catch (e) {
                console.error("Error handling ws message for local editor:", e);
                if (msg.type !== "full_sync") {
                    console.log("Requesting full resync due to error");
                    this.requestFullResync();
                }
            }
        };
    }

    sendOperation(operation) {
        const message = {
            type: "operation",
            operationData: serializeOperation(operation),
        };
        this.ws.send(JSON.stringify(message));
    }

    sendHistoryRequest(action) {
        const message = {
            type: "history_action",
            action: action,
        };
        this.ws.send(JSON.stringify(message));
    }

    sendMetadata(newMetadata) {
        const message = {
            type: "metadata_change",
            metadata: newMetadata,
        };
        this.ws.send(JSON.stringify(message));
    }

    requestFullResync() {
        const message = {
            type: "needs_sync",
        };
        this.ws.send(JSON.stringify(message));
    }

    sendBlockChange(blockId, blockData) {
        const message = {
            type: "block_change",
            blockId: blockId,
            content: getCleanNetworkBlockData(blockData),
        };
        this.ws.send(JSON.stringify(message));
    }

    sendBlockDeletion(blockId) {
        const message = {
            type: "block_deletion",
            blockId: blockId,
        };
        this.ws.send(JSON.stringify(message));
    }

    sendStructureChange(structure) {
        const message = {
            type: "structure_change",
            structure: structure,
        };
        this.ws.send(JSON.stringify(message));
    }

    sendNewBlock(adjacentBlockId, newBlockId, blockData, direction = "after") {
        const message = {
            type: "block_addition",
            adjacentBlockId: adjacentBlockId,
            newBlockId: newBlockId,
            direction: direction,
            content: getCleanNetworkBlockData(blockData),
        };
        this.ws.send(JSON.stringify(message));
    }
}
