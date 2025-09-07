import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExportService } from '../../services/export.service';

const router = Router();
const exportService = new ExportService();

router.post('/export/invoice', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      clientId: z.string(),
      projectId: z.string(),
      startDate: z
        .string()
        .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid startDate' }),
      endDate: z
        .string()
        .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid endDate' }),
      userId: z.string()
    });
    const { clientId, projectId, startDate, endDate, userId } = schema.parse(req.body);
    const invoiceExport = await exportService.generateInvoiceExport(
      clientId,
      projectId,
      new Date(startDate),
      new Date(endDate),
      userId
    );
    res.json(invoiceExport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate invoice export' });
  }
});

router.post('/export/csv', async (req: Request, res: Response) => {
  try {
    const { invoiceExport } = z.object({ invoiceExport: z.unknown() }).parse(req.body);
    const csv = await exportService.exportToCSV(invoiceExport);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.csv"');
    res.send(csv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

router.get('/budget/:projectId', async (req: Request, res: Response) => {
  try {
    const params = z.object({ projectId: z.string() }).parse(req.params);
    const { month } = z.object({ month: z.string().optional() }).parse(req.query);
    const budgetData = await exportService.getBudgetVsBurn(
      params.projectId,
      new Date(month ?? new Date().toISOString())
    );
    res.json(budgetData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Budget error:', error);
    res.status(500).json({ error: 'Failed to get budget data' });
  }
});

router.get('/report/monthly/:clientId', async (req: Request, res: Response) => {
  try {
    const params = z.object({ clientId: z.string() }).parse(req.params);
    const { month } = z.object({ month: z.string().optional() }).parse(req.query);
    const report = await exportService.getMonthlyReport(
      params.clientId,
      new Date(month ?? new Date().toISOString())
    );
    res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

export default router;
