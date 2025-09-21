import { Router, Request, Response } from 'express';
import { ProfitabilityService } from '../services/profitability.service';
import { query } from '../models/database';
import { captureException } from '../utils/sentry';

import createSyncRouter, { SyncRouterDeps } from './sync/routes.optimized';
import exceptionsRouter from './exceptions/routes';
import exportRouter from './export/routes';

export default function createApiRouter(deps?: SyncRouterDeps) {
  const router = Router();
  const profitabilityService = new ProfitabilityService();

  router.use(createSyncRouter(deps));
  router.use(exceptionsRouter);
  router.use(exportRouter);

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Calculate profitability
  router.post('/profitability/calculate', async (req: Request, res: Response) => {
    const { clientId, projectId, month } = req.body;
    try {
      const metric = await profitabilityService.calculateProfitability(
        clientId,
        projectId,
        new Date(month)
      );
      res.json(metric);
    } catch (error) {
      captureException(error, {
        operation: 'calculateProfitability',
        clientId,
        projectId,
        month,
      });
      res.status(500).json({ error: 'Failed to calculate profitability' });
    }
  });

  // Get portfolio profitability
  router.get('/profitability/portfolio/:month', async (req: Request, res: Response) => {
    try {
      const metrics = await profitabilityService.getPortfolioProfitability(
        new Date(req.params.month)
      );
      res.json(metrics);
    } catch (error) {
      captureException(error, {
        operation: 'getPortfolioProfitability',
        month: req.params.month,
      });
      res.status(500).json({ error: 'Failed to get portfolio profitability' });
    }
  });

  // Get client trend
  router.get('/profitability/trend/:clientId', async (req: Request, res: Response) => {
    const { months = 6 } = req.query;
    try {
      const trend = await profitabilityService.getClientProfitabilityTrend(
        req.params.clientId,
        Number(months)
      );
      res.json(trend);
    } catch (error) {
      captureException(error, {
        operation: 'getClientProfitabilityTrend',
        clientId: req.params.clientId,
        months,
      });
      res.status(500).json({ error: 'Failed to get profitability trend' });
    }
  });

  // Clients endpoints
  router.get('/clients', async (req: Request, res: Response) => {
    try {
      const result = await query('SELECT * FROM clients WHERE is_active = true ORDER BY name');
      res.json(result.rows);
    } catch (error) {
      captureException(error, {
        operation: 'getClients',
      });
      res.status(500).json({ error: 'Failed to get clients' });
    }
  });

  // Projects endpoints
  router.get('/projects/:clientId', async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT * FROM projects WHERE client_id = $1 AND is_active = true ORDER BY name',
        [req.params.clientId]
      );
      res.json(result.rows);
    } catch (error) {
      captureException(error, {
        operation: 'getProjects',
        clientId: req.params.clientId,
      });
      res.status(500).json({ error: 'Failed to get projects' });
    }
  });

  return router;
}

