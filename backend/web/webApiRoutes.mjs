import { Router } from 'express';
import googleAuthRouter from './routes/authWebRoutes.mjs';
import { ApiRouter } from './apiRouter.mjs';
import userRouter from './routes/userWebRoutes.mjs';
import notebookWebRoutes from './routes/notebookWebRoutes.mjs';
import flashcardWebRoutes from './routes/flashcardWebRoutes.mjs';
import imageWebRoutes from './routes/imageWebRoutes.mjs';
import sharingWebRoutes from './routes/sharingWebRoutes.mjs';

const apiRouter = new ApiRouter(Router());

sharingWebRoutes(apiRouter);
googleAuthRouter(apiRouter);
userRouter(apiRouter);
notebookWebRoutes(apiRouter);
flashcardWebRoutes(apiRouter);
imageWebRoutes(apiRouter);

export { apiRouter };