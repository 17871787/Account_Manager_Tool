import express from 'express';
import cors from 'cors';
import routes from '../src/api/routes';

const app = express();

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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date(),
  });
});

export default app;