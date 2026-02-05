import xxhash from "xxhash-wasm";
import { handleRequest } from "./pageServerEditorHandler.mjs";
import { logEditor } from "../../logger.mjs";
import { MutablePage } from "../foundation_safe/page/mutablePage.js";
import ActiveSocketElement from "../foundation/network/ActiveSocketElement.mjs";

//This method handles linking a websocket to the handling, as the actual message handler is a seperate module
function bindEvents(activePage, ws) {
    //Tell the client the current state of the page, including metadata (unlike a full sync)
    ws.send(JSON.stringify({
        type: "initial_page_data",
        metadata: activePage.metadata,
        structure: activePage.structure,
        content: activePage.content,
    }));

    ws.on("message", (msg) => {
        try {
            handleRequest(activePage, ws, JSON.parse(msg));
        } catch (e) {
            const message = {
                type: "full_sync",
                structure: activePage.structure,
                content: activePage.content,
            };
            activePage.sendWithHash(ws, message);

            logEditor("Error handling ws message for editor, force syncing:", e);
        }
    });
    
    ws.on("close", () => {
        logEditor("Editor client disconnected from page:", activePage.metadata.pageId);
        activePage.disconnectClient(ws);
    });
}

const hash = await xxhash();

//Pseudo-double inheritance helper, safe to use as active socket element is mostly an interface in this case
function sideInhereit(BaseClass, derivedInstance, loggingName) {
    const baseInstance = new BaseClass(loggingName);
    Object.getOwnPropertyNames(BaseClass.prototype).forEach((name) => {
        if (name !== "constructor") {
            derivedInstance[name] = derivedInstance[name] || baseInstance[name].bind(derivedInstance);
        }
    });
}

export class ActivePage extends MutablePage {
    constructor(pageMetadata, pageStructure, pageBlocks) {
        super(pageStructure, pageBlocks, true, logEditor);
        sideInhereit(ActiveSocketElement, this, "ActivePage");
        this.metadata = pageMetadata;
        this.connectedClients = [];
        this.isDirty = false;
    }

    connectClient(ws) {
        bindEvents(this, ws);
        this.connectedClients.push(ws);
    }

    disconnectClient(ws) {
        this.connectedClients = this.connectedClients.filter((clientWs) => clientWs !== ws);
    }

    sendToOtherClients(senderWs, msg) {
        this.connectedClients.forEach((clientWs) => {
            if (clientWs !== senderWs && clientWs.readyState === clientWs.OPEN) {
                clientWs.send(JSON.stringify(msg));
            }
        });
    }

    sendToOtherClientsWithHash(senderWs, msg) {
        this.sendToOtherClients(senderWs, this.withHash(msg));
    }

    sendWithHash(ws, msg) {
        ws.send(JSON.stringify(this.withHash(msg)));
    }

    withHash(msg) {
        const contentString = JSON.stringify(this.content);
        const structureString = JSON.stringify(this.structure);
        const hashValue = hash.h32(contentString + structureString);
        return { ...msg, hash: hashValue };
    }

}