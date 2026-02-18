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

export function adaptSqlRowsContentToJs(rows, opts) {
    rows.forEach((block) => {
        adaptSqlContentToJs(block, opts);
    });
}

export function adaptSqlContentToJs(con, opts) {
    opts = {
        uuidParseKeys: opts?.uuidParseKeys || [],
    };
    for (const key in con) {
        const value = con[key];
        delete con[key];

        //Remove null values, these are probably from other types that arent relevant
        //For example, all blocks will have a imageUrl property even if it is null
        if (value == null) continue;

        const camelKey = sqlToJsName(key);

        if (
            key.endsWith("ID") ||
            (opts.uuidParseKeys.length !== 0 &&
                opts.uuidParseKeys.includes(key))
        ) {
            //For any ID field, parse the UUID blob
            con[camelKey] = parseUUIDBlob(value);
        } else if (key.endsWith("Date")) {
            //For any Date field, convert timestamp to Date object
            con[camelKey] = new Date(value);
        } else {
            con[camelKey] = value;
        }
    }
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

export function adaptJsObjectToSql(obj, opts) {
    //Before, opts was defined as a broken down {param1, param2} style argument
    //Howver, if we passed just one anonymous object with actual data, it would get confused
    //Therefore it had to be turned into a normal argument
    //Here we just break out any parameters (if present)
    //This way the rest of the function can continue to assume defaults are present
    opts = {
        uuidBlobifyKeys: opts?.uuidBlobifyKeys || [],
        dropInvalidUUIDs: opts?.dropInvalidUUIDs || false,
    };
    const sqlObj = {};
    for (const key in obj) {
        const value = obj[key];

        if (value == null) continue; //Skip null values

        const sqlKey = "$" + jsToSqlName(key); //Since this adapting into SQL queries (not strictly rows), we need the $ prefix

        if (
            key.endsWith("Id") ||
            (opts.uuidBlobifyKeys.length !== 0 &&
                opts.uuidBlobifyKeys.includes(key))
        ) {
            if (!opts.dropInvalidUUIDs) sqlObj[sqlKey] = getUUIDBlob(value);
            else
                try {
                    sqlObj[sqlKey] = getUUIDBlob(value);
                } catch (e) {
                    sqlObj[sqlKey] = null;
                }
        } else if (key.endsWith("Date") && value instanceof Date) {
            //For anything ending in "date", get the integer timestamp to use rather than converting it manually
            sqlObj[sqlKey] = value.getTime();
        } else {
            sqlObj[sqlKey] = value;
        }
    }
    return sqlObj;
}
