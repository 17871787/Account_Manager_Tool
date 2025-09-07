import { Router, Request, Response } from 'express';
import { ProfitabilityService } from '../services/profitability.service';
import { query } from '../models/database';

import syncRouter from './sync/routes';
import exceptionsRouter from './exceptions/routes';
import exportRouter from './export/routes';

const router = Router();
const profitabilityService = new ProfitabilityService();

router.use(syncRouter);
router.use(exceptionsRouter);
router.use(exportRouter);

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Calculate profitability
router.post('/profitability/calculate', async (req: Request, res: Response) => {
  try {
    const { clientId, projectId, month } = req.body;
    const metric = await profitabilityService.calculateProfitability(
      clientId,
      projectId,
      new Date(month)
    );
    res.json(metric);
  } catch (error) {
    console.error('Profitability calculation error:', error);
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
    console.error('Portfolio profitability error:', error);
    res.status(500).json({ error: 'Failed to get portfolio profitability' });
  }
});

// Get client trend
router.get('/profitability/trend/:clientId', async (req: Request, res: Response) => {
  try {
    const { months = 6 } = req.query;
    const trend = await profitabilityService.getClientProfitabilityTrend(
      req.params.clientId,
      Number(months)
    );
    res.json(trend);
  } catch (error) {
    console.error('Trend error:', error);
    res.status(500).json({ error: 'Failed to get profitability trend' });
  }
});

// Clients endpoints
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM clients WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Clients error:', error);
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
    console.error('Projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

export default router;
