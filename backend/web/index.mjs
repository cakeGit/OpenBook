import express from 'express';
import { logWeb, logWebWithGoodNewsBlinker } from '../logger.mjs';
import ViteExpress from "vite-express";
import { apiRouter } from './webApiRoutes.mjs';
import cookieParser from 'cookie-parser';
import { addPageEditorRouterEndpoint } from './page_editor/pageEditorSocket.mjs';
import expressWs from 'express-ws';
import { addNotebookStructureEditorRouterEndpoint } from './structure_editor/notebookStructureEditorSocket.mjs';
import { serverStartTime } from '../index.js';
import { imageRoute } from './imageRoute.mjs';

logWeb("Web index.js loaded, starting web server...");

const app = express();
expressWs(app); //Extend with WebSocket support
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.json());

//Add api routes
app.use('/api/', apiRouter.expressRouter);

//Add image serving route
app.use("/image/", imageRoute());

//These have to be defferred until after expressWs call
addPageEditorRouterEndpoint(app);
addNotebookStructureEditorRouterEndpoint(app);

// ViteExpress.config({
//     mode: "production"
// });
ViteExpress.listen(app, PORT, () => {
    logWebWithGoodNewsBlinker(`Server running on http://localhost:${PORT}, server setup in`, (performance.now() - serverStartTime) / 1000, `s`);
});