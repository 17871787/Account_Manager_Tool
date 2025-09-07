import express from 'express';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { setupErrorHandlers } from './errorHandlers';

const app = express();

setupMiddleware(app);
setupRoutes(app);
setupErrorHandlers(app);

export default app;

