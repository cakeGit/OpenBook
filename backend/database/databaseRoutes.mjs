import notebookDatabaseRoutes from "./routes/notebookDatabaseRoutes.mjs";
import authDatabaseRoutes from "./routes/authDatabaseRoutes.mjs";
import userDatabaseRoutes from "./routes/userDatabaseRoutes.mjs";
import pageDatabaseRoutes from "./routes/pageDatabaseRoutes.mjs";
import flashcardDatabaseRoutes from "./routes/flashcardDatabaseRoutes.mjs";
import imageDatabaseRoutes from "./routes/imageDatabaseRoutes.mjs";
import sharingDatabaseRoutes from "./routes/sharingDatabaseRoutes.mjs";

export function addAllDatabaseRoutes(addEndpoint) {
    sharingDatabaseRoutes(addEndpoint);
    userDatabaseRoutes(addEndpoint);
    authDatabaseRoutes(addEndpoint);
    notebookDatabaseRoutes(addEndpoint);
    pageDatabaseRoutes(addEndpoint);
    flashcardDatabaseRoutes(addEndpoint);
    imageDatabaseRoutes(addEndpoint);
}
