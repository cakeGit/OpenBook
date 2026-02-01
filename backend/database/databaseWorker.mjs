import { alertStyle, logDb, logDbWithWarningBlinker } from "../logger.mjs";
import { RequestError } from "../web/foundation_safe/requestError.js";
import { addAllDatabaseRoutes } from "./databaseRoutes.mjs";
import { runPageDataTest } from "./pageDataTest.mjs";
import { queries } from "./queries.mjs";

const RUN_PAGE_DATA_TEST = false;

function logTestQuery(db) {
    //Run the "get_users" query as a test
    const testQuery = queries["get_users"];
    if (!testQuery) {
        console.error('Test query "get_users" not found in loaded queries');
        return;
    }
    db.all(testQuery, [], (err, rows) => {
        if (err) {
            console.error('Error running test query "get_users":', err);
        } else {
            logDb(
                `Test query "get_users" result: ${rows.length} users in database.`,
            );
        }
    });
}

function filterForPropertiesInQuery(query, inputParams) {
    for (const param in inputParams) {
        if (!query.includes(param)) delete inputParams[param];
    }
    return inputParams;
}

//We take in the actual database (db) and then return a promise based API wrapper around it
//This makes it much easier to work with async javascript code, avoiding long nested callbacks.
//This also includes extended features for things like running multiple statements in one call, which is typically not allowed.
function wrapDbForPromises(db) {
    return {
        beginTransaction: () => {
            return db.run("BEGIN TRANSACTION;");
        },
        commitTransaction: () => {
            return db.run("COMMIT;");
        },
        rollbackTransaction: () => {
            return db.run("ROLLBACK;");
        },
        asTransaction: async (operation) => {
            await db.run("BEGIN TRANSACTION;");
            try {
                const result = await operation();
                await db.run("COMMIT;");
                return result;
            } catch (error) {
                await db.run("ROLLBACK;");
                throw error;
            }
        },
        getQueryOrThrow: (queryName) => {
            const query = queries[queryName]; //Load query from the queries module.
            if (!query) {
                //If the query does not exist, throw an error, as described.
                throw new Error("Query not found: " + queryName);
            }
            return query;
        },
        get: (sql, params) => {
            const tracedError = new Error("Failed to execute statement"); //Error that traces back to the function running the get call
            return new Promise((resolve, reject) => {
                //We return a promise that resolves or rejects based on the db call
                db.get(sql, params, (err, row) => {
                    if (err) {
                        console.error(err);
                        tracedError.cause = err;
                        reject(tracedError); //This means it was unsuccessful, and we reject the promise
                    } else {
                        resolve(row); //This means it was successful, and we return the row
                    }
                });
            });
        },
        all: (sql, params) => {
            const tracedError = new Error("Failed to execute statement");
            return new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) {
                        console.error(err);
                        tracedError.cause = err;
                        reject(tracedError);
                    } else {
                        resolve(rows);
                    }
                });
            });
        },
        run: (sql, params) => {
            const tracedError = new Error("Failed to execute statement");
            return new Promise((resolve, reject) => {
                db.run(sql, params, function (err) {
                    if (err) {
                        console.error(err);
                        tracedError.cause = err;
                        reject(tracedError);
                    } else {
                        resolve();
                    }
                });
            });
        },
        async runMultiple(sql, params) {
            const tracedError = new Error(
                "Failed to execute multiple statements",
            );

            //Break down the SQL in to the smaller statements
            //This is an example of functional programming in javascript, using map and filter
            const statements = sql
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            for (const statement of statements) {
                //Since not all params may be used in each statement, we filter them down to just the ones used
                //SQL requires named parameters to have a specific format, we generally use them in the form "$param"
                //This means I can search for those in the statement text safely
                let subParams = filterForPropertiesInQuery(
                    statement,
                    structuredClone(params),
                );

                try {
                    await this.run(statement, subParams);
                } catch (err) {
                    console.error(err);
                    tracedError.cause = err;
                    throw tracedError;
                }
            }
        },
    };
}

export async function startDatabaseWorker(db) {
    db = wrapDbForPromises(db);

    logDb("Database worker started, ready to handle queries.");

    logTestQuery(db);

    if (RUN_PAGE_DATA_TEST) await runPageDataTest(db);

    logDb("Sending 'database_ready' message to primary process.");

    process.send("database_ready");

    //When we recive a message from the cluster primary process, handle database queries
    process.on("message", (message) => {
        if (!message) {
            logDb("Database worker received empty message, ignoring.");
            return;
        }
        let type = message?.type;
        let requestId = message?.requestId;
        if (!type || !requestId) {
            logDb(
                'Database worker received message with no type, ignoring "',
                message,
                '"',
            );
            return;
        }

        handleDatabaseMessage(db, message);
    });
}

const requestRoutes = {};

function addEndpoint(type, handler) {
    requestRoutes[type] = handler;
}

addAllDatabaseRoutes(addEndpoint);

class DatabaseResponse {
    constructor(requestId) {
        this.requestId = requestId;
        this.responded = false;
    }

    success(data) {
        process.send({ requestId: this.requestId, status: "success", data });
        this.responded = true;
    }

    error(errorMessage) {
        process.send({
            requestId: this.requestId,
            status: "error",
            errorMessage: errorMessage,
        });
        this.responded = true;
    }

    isResponded() {
        return this.responded;
    }
}

async function handleDatabaseMessage(db, message) {
    let type = message.type;
    let requestId = message.requestId;
    let handler = requestRoutes[type];

    const response = new DatabaseResponse(requestId);

    if (!handler) {
        response.error("No handler for request type: " + type);
        return;
    }

    try {
        let result = await handler(db, message, response);
        if (result !== undefined) {
            response.success(result);
        }
        //Else if this was not responded, we assume this was a procedure which had no return value, but also had no errors
        if (!response.isResponded()) {
            response.success();
        }
    } catch (err) {
        if (err instanceof RequestError) {
            process.send({
                requestId: requestId,
                status: "error",
                requestError: true,
                errorEffect: err.effect,
                errorMessage: err.message,
            });
            return;
        }

        console.error("Error handling database message:", err);
        console.trace(err);
        response.error("Database error: " + err.message);
    }
}
