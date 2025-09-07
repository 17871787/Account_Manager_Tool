import { Router, Request, Response } from 'express';
import { HarvestConnector } from '../connectors/harvest.connector';
import { SFTConnector } from '../connectors/sft.connector';
import { ProfitabilityService } from '../services/profitability.service';
import { ExceptionEngine } from '../rules/exception.engine';
import { ExportService } from '../services/export.service';
import { query } from '../models/database';
import { startOfMonth, endOfMonth } from 'date-fns';

const router = Router();
const harvestConnector = new HarvestConnector();
const sftConnector = new SFTConnector();
const profitabilityService = new ProfitabilityService();
const exceptionEngine = new ExceptionEngine();
const exportService = new ExportService();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Sync Harvest data
router.post('/sync/harvest', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, clientId } = req.body;
    const entries = await harvestConnector.getTimeEntries(
      new Date(fromDate),
      new Date(toDate),
      clientId
    );

    // Process and store entries
    let processed = 0;
    for (const entry of entries) {
      // Store in database (simplified - would need proper mapping)
      await query(
        `INSERT INTO time_entries 
          (harvest_entry_id, date, hours, billable_flag, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (harvest_entry_id) DO UPDATE SET
          hours = $3,
          billable_flag = $4,
          notes = $5`,
        [entry.entryId, entry.date, entry.hours, entry.billableFlag, entry.notes]
      );
      processed++;
    }

    res.json({ 
      success: true, 
      entriesProcessed: processed,
      period: { fromDate, toDate }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync Harvest data' });
  }
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

// Get pending exceptions
router.get('/exceptions/pending', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;
    const exceptions = await exceptionEngine.getPendingExceptions(
      clientId as string
    );
    res.json(exceptions);
  } catch (error) {
    console.error('Exceptions error:', error);
    res.status(500).json({ error: 'Failed to get exceptions' });
  }
});

// Review exception
router.post('/exceptions/:id/review', async (req: Request, res: Response) => {
  try {
    const { action, userId, helpdeskTicketId } = req.body;
    
    if (action === 'approve') {
      await exceptionEngine.approveException(
        req.params.id,
        userId,
        helpdeskTicketId
      );
    } else if (action === 'reject') {
      await exceptionEngine.rejectException(req.params.id, userId);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true, exceptionId: req.params.id, action });
  } catch (error) {
    console.error('Exception review error:', error);
    res.status(500).json({ error: 'Failed to review exception' });
  }
});

// Generate invoice export
router.post('/export/invoice', async (req: Request, res: Response) => {
  try {
    const { clientId, projectId, startDate, endDate, userId } = req.body;
    const invoiceExport = await exportService.generateInvoiceExport(
      clientId,
      projectId,
      new Date(startDate),
      new Date(endDate),
      userId
    );
    res.json(invoiceExport);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate invoice export' });
  }
});

// Export to CSV
router.post('/export/csv', async (req: Request, res: Response) => {
  try {
    const { invoiceExport } = req.body;
    const csv = await exportService.exportToCSV(invoiceExport);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.csv"');
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Get budget vs burn
router.get('/budget/:projectId', async (req: Request, res: Response) => {
  try {
    const { month = new Date() } = req.query;
    const budgetData = await exportService.getBudgetVsBurn(
      req.params.projectId,
      new Date(month as string)
    );
    res.json(budgetData);
  } catch (error) {
    console.error('Budget error:', error);
    res.status(500).json({ error: 'Failed to get budget data' });
  }
});

// Get monthly report
router.get('/report/monthly/:clientId', async (req: Request, res: Response) => {
  try {
    const { month = new Date() } = req.query;
    const report = await exportService.getMonthlyReport(
      req.params.clientId,
      new Date(month as string)
    );
    res.json(report);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
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