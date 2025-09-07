import { Express } from 'express';
import apiRoutes from '../api/routes';

export const setupRoutes = (app: Express): void => {
  app.get('/', (_req, res) => {
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

  app.use('/api', apiRoutes);
};

