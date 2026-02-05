import tk from "terminal-kit";
import process from "process";
import util from "util";
var term = tk.terminal;

const logQueue = [];

const ansiRedBg = "\u001b[41m";
const ansiWhiteText = "\u001b[37m";
const ansiReset = "\u001b[0m";

//Evil hack from stack overflow to track how many lines have been printed to the terminal
let globalScrollOffset = 0;

// Intercept all terminal output to track line counts
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
    const s = typeof chunk === "string" ? chunk : chunk.toString();
    // Count newlines in the chunk to detect how much the screen has scrolled
    const lines = (s.match(/\n/g) || []).length;
    globalScrollOffset += lines;
    return originalWrite(chunk, encoding, callback);
};
//End of evil hack

function log(
    color,
    group,
    message,
    endLine = true,
    timestamp = new Date().toISOString()
) {
    term[color](`[${group}] `)
        .gray(`${timestamp}: `)
        .white(`${message}${endLine ? "\n" : ""}`);
}

function getCurrentScreenY() {
    return new Promise((resolve, reject) => {
        term.getCursorLocation((error, x, y) => {
            if (error) {
                reject(error);
            } else {
                resolve(y);
            }
        });
    });
}

const blinkers = {};
async function logWithBlinker(
    color,
    group,
    message,
    blinkerColor = "bgRed"
) {
    if (blinkers[group]) {
        delete blinkers[group];
    }

    // Get current position once and track relative to scroll offset
    const startScreenY = await getCurrentScreenY();
    const trackScroll = globalScrollOffset;

    let timestamp = new Date().toISOString();
    //Log normally first
    log(color, group, message, true, timestamp);

    blinkers[group] = {
        blink: true,
        remainingBlinks: 6,
        handle: async () => {
            const moveDelta = globalScrollOffset - trackScroll;
            const gotoY = startScreenY - moveDelta;

            // If offscreen we cant blink so return
            if (gotoY < 1 || gotoY > term.height) {
                blinkers[group].remainingBlinks -= 1;
                if (blinkers[group].remainingBlinks <= 0) {
                    delete blinkers[group];
                }
                return;
            }

            let blink = blinkers[group].blink;
            performBlink(
                blink,
                gotoY,
                group,
                blinkerColor,
                color,
                message,
                timestamp
            );

            blinkers[group].blink = !blink;

            if (blinkers[group].remainingBlinks <= 0) {
                delete blinkers[group];
            }
        },
        lastBlink: 0, //Timestamp of last blink, so we know how often this should run
    };
}

function performBlink(
    blink,
    gotoY,
    group,
    blinkerColor,
    color,
    message,
    timestamp
) {
    term.saveCursor();

    term.moveTo(1, gotoY);

    blinkers[group].remainingBlinks -= 1;

    if (blinkers[group].remainingBlinks <= 0) {
        blink = false;
    }

    if (blink) {
        term[blinkerColor]();
    }

    term.column(1);
    //Alert style inside needs to have the reset codes removed to avoid messing up the colors
    log(
        color,
        group,
        blink ? message.replaceAll(ansiReset, "") : message,
        false,
        timestamp
    );
    term.eraseLineAfter();
    term.styleReset();

    term.restoreCursor();
    return blink;
}

let blinkerInterval = null;

async function processQueue() {
    while (logQueue.length > 0) {
        let logItem = logQueue.shift();
        if (logItem.blinker === true) {
            await logWithBlinker(
                logItem.color,
                logItem.group,
                logItem.content,
                logItem.blinkerColor
            );
        } else {
            log(logItem.color, logItem.group, logItem.content);
        }
    }
    //Blinker specific processing
    for (const group in blinkers) {
        const blinker = blinkers[group];
        const now = Date.now();
        if (now - blinker.lastBlink >= 200) {
            blinker.handle();
            blinker.lastBlink = now;
        }
    }
    let hasBlinkers = Object.keys(blinkers).length > 0;
    if (hasBlinkers) {
        if (!blinkerInterval) {
            blinkerInterval = setInterval(processQueue, 20);
        }
    } else {
        if (blinkerInterval) {
            clearInterval(blinkerInterval);
            blinkerInterval = null;
        }
    }
}

function getLogString(arg) {
    if (typeof arg === "number") {
        arg = Math.round(arg * 100) / 100;
    }
    return typeof arg === "string"
        ? arg
        : util.inspect(arg, { showHidden: false, depth: null, colors: true });
}

function collectContent(firstArg, allArgs) {
    if (allArgs.length <= 1) {
        return getLogString(firstArg);
    } else {
        let content = getLogString(firstArg);
        for (let i = 1; i < allArgs.length; i++) {
            if (i > 0) {
                content += " ";
            }
            content += getLogString(allArgs[i]);
        }
        return content;
    }
}

export function setupWorkerListener(worker) {
    worker.on("message", (message) => {
        if (message.type === "log_db") {
            logQueue.push({
                group: "DB",
                color: "magenta",
                content: message.content,
                blinker: message.blinker,
                blinkerColor: message.blinkerColor || "bgRed",
            });
            setTimeout(processQueue, 0);
        }
    });
}

export function logDb(message) {
    //Put together the string to send to main process via IPC to avoid race condition
    var content = collectContent(message, arguments);
    process.send({ type: "log_db", content: content });
}

export async function logWeb(message) {
    //Put together the string but just for the queue to avoid race condition
    var content = collectContent(message, arguments);
    logQueue.push({
        group: "WEB",
        color: "cyan",
        content: content,
    });
    return new Promise((resolve, reject) =>
        setTimeout(() => {
            processQueue();
            resolve();
        }, 0)
    );
}

export async function logEditor(message) {
    //Put together the string but just for the queue to avoid
    var content = collectContent(message, arguments);
    logQueue.push({
        group: "EDITOR",
        color: "blue",
        content: content,
    });
    return new Promise((resolve, reject) =>
        setTimeout(() => {
            processQueue();
            resolve();
        }, 0)
    );
}

export function logClus(group, message) {
    var color = "green";
    if (group.indexOf("/") != -1) {
        color = "yellow";
    }
    logQueue.push({
        group: `CLUS/${group}`,
        color: color,
        content: message, //Assume its just the one, i dont use extra args here
    });
    setTimeout(processQueue, 0);
}

//For putting alerts where theres red background white text
export function alertStyle(text) {
    return `${ansiRedBg}${ansiWhiteText}${text}${ansiReset}`;
}

//Difficult to parametrize blinkers so we make specific functions for common cases, they arent frequently used enough to generalize further
export function logDbWithWarningBlinker(message) {
    var content = collectContent(message, arguments);
    process.send({
        type: "log_db",
        content: content,
        blinker: true,
        blinkerColor: "bgRed",
    });
}

export function logWebWithGoodNewsBlinker(message) {
    var content = collectContent(message, arguments);
    logQueue.push({
        group: "WEB",
        color: "cyan",
        content: content,
        blinker: true,
        blinkerColor: "bgGreen",
    });
    setTimeout(processQueue, 0);
}
