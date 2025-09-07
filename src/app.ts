import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import createApiRouter from './api/routes';
import { AppError } from './types';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', createApiRouter());

// Error handling middleware
app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status ?? 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date(),
  });
});

export default app;
