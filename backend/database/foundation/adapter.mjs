import { getUUIDBlob, parseUUIDBlob } from "../uuidBlober.mjs";

function sqlToJsName(str) {
    if (str == "OrderIndex") {
        return "order";
    }
    if (str.endsWith("ID")) {
        str = str.slice(0, -2) + "Id";
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}

export function adaptSqlRowsContentToJs(rows, uuidParseKeys = []) {
    rows.forEach((block) => {
        for (const key in block) {
            const value = block[key];
            delete block[key];

            //Remove null values, these are probably from other types that arent relevant
            //For example, all blocks will have a imageUrl property even if it is null
            if (value == null) continue;

            const camelKey = sqlToJsName(key);
            
            if (key.endsWith("ID") || (uuidParseKeys.length !== 0 && uuidParseKeys.includes(key))) {
                //For any ID field, parse the UUID blob
                block[camelKey] = parseUUIDBlob(value);
            } else {
                block[camelKey] = value;
            }
        }
    });
}

function jsToSqlName(str) {
    if (str === "order") {
        return "OrderIndex";
    }
    if (str.endsWith("Id")) {
        str = str.slice(0, -2) + "ID";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function adaptJsObjectToSql(obj, {uuidBlobifyKeys = [], dropInvalidUUIDs = false}) {
    const sqlObj = {};
    for (const key in obj) {
        const value = obj[key];

        if (value == null) continue; //Skip null values

        const sqlKey = "$" + jsToSqlName(key); //Since this adapting into SQL queries (not strictly rows), we need the $ prefix

        if (key.endsWith("Id") || (uuidBlobifyKeys.length !== 0 && uuidBlobifyKeys.includes(key))) {
            if (!dropInvalidUUIDs)
                sqlObj[sqlKey] = getUUIDBlob(value);
            else try {
                sqlObj[sqlKey] = getUUIDBlob(value);
            } catch (e) {
                sqlObj[sqlKey] = null;
            }
        } else {
            sqlObj[sqlKey] = value;
        }
    }
    return sqlObj;
}