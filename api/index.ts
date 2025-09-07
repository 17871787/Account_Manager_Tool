import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/nextjs';
import routes from '../src/api/routes';

const app = express();

// Sentry v8 doesn't have these middleware for Express
// They're automatically handled by the SDK initialization

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'MoA Account Manager AI',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      sync: {
        harvest: '/api/sync/harvest',
        hubspot: '/api/sync/hubspot',
        sft: '/api/sync/sft'
      },
      profitability: '/api/profitability/*',
      exceptions: '/api/exceptions/*',
      export: '/api/export/*',
      budget: '/api/budget/*',
      clients: '/api/clients',
      projects: '/api/projects/*'
    }
  });
});

// API routes
app.use('/api', routes);

// Sentry error handler (must be before other error handlers)
app.use(Sentry.expressErrorHandler());

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Add error context to Sentry
  Sentry.withScope((scope) => {
    scope.setContext('request', {
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
    Sentry.captureException(err);
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date(),
    errorId: res.locals.sentryId, // Include Sentry error ID for tracking
  });
});

export default app;