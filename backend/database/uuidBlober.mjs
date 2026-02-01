import crypto from "crypto";
import util from "util";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getUUIDBlob(uuid) {
    if (uuid == undefined || !uuidPattern.test(uuid)) {
        throw new Error("Invalid UUID format: " + util.inspect(uuid));
    }
    let hexString = uuid.replaceAll("-", "");
    return Buffer.from(hexString, "hex");
}

export function parseUUIDBlob(blob) {
    //Example: "8ec55b17-a39d-47f3-98dd-cc10a108bcfb"
    let hexString = blob.toString("hex");
    return hexString.slice(0, 8) + "-" +
        hexString.slice(8, 12) + "-" +
        hexString.slice(12, 16) + "-" +
        hexString.slice(16, 20) + "-" +
        hexString.slice(20, 32);
}

export function generateRandomUUID() {
    return crypto.randomUUID();
}

export function generateRandomUUIDBlob() {
    return getUUIDBlob(generateRandomUUID());
}