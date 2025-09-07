import { InvoiceExport, InvoiceLine, ExclusionSummary } from '../types';
import { query } from '../models/database';
import { format } from 'date-fns';
import { createObjectCsvStringifier } from 'csv-writer';

export class ExportService {
  async generateInvoiceExport(
    clientId: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<InvoiceExport> {
    // Get billable time entries
    const billableResult = await query(
      `SELECT 
        t.name as task_name,
        SUM(te.hours) as total_hours,
        AVG(te.billable_rate) as avg_rate,
        SUM(te.billable_amount) as total_amount,
        STRING_AGG(DISTINCT te.notes, '; ') as notes
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE te.client_id = $1
        AND te.project_id = $2
        AND te.date >= $3
        AND te.date <= $4
        AND te.billable_flag = true
        AND t.category = 'billable'
      GROUP BY t.id, t.name
      ORDER BY t.name`,
      [clientId, projectId, startDate, endDate]
    );

    const billableLines: InvoiceLine[] = billableResult.rows.map(row => ({
      task: row.task_name,
      hours: parseFloat(row.total_hours),
      rate: parseFloat(row.avg_rate),
      amount: parseFloat(row.total_amount),
      notes: row.notes,
    }));

    // Get exclusions summary
    const exclusionsResult = await query(
      `SELECT 
        t.name as task_name,
        SUM(te.hours) as total_hours,
        SUM(te.cost_amount) as total_cost
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE te.client_id = $1
        AND te.project_id = $2
        AND te.date >= $3
        AND te.date <= $4
        AND t.category = 'exclusion'
      GROUP BY t.id, t.name
      ORDER BY t.name`,
      [clientId, projectId, startDate, endDate]
    );

    const exclusionDetails = exclusionsResult.rows.map(row => ({
      task: row.task_name,
      hours: parseFloat(row.total_hours),
      cost: parseFloat(row.total_cost),
    }));

    const totalExclusionHours = exclusionDetails.reduce((sum, d) => sum + d.hours, 0);
    const totalExclusionCost = exclusionDetails.reduce((sum, d) => sum + d.cost, 0);

    const exclusionsSummary: ExclusionSummary = {
      totalHours: totalExclusionHours,
      totalCost: totalExclusionCost,
      coveredBySubscription: true, // This would be determined by contract rules
      details: exclusionDetails,
    };

    // Get client and project names
    const namesResult = await query(
      `SELECT c.name as client_name, p.name as project_name
      FROM clients c
      JOIN projects p ON p.client_id = c.id
      WHERE c.id = $1 AND p.id = $2`,
      [clientId, projectId]
    );

    const { client_name, project_name } = namesResult.rows[0];

    const totalBillable = billableLines.reduce((sum, line) => sum + line.amount, 0);

    const invoiceExport: InvoiceExport = {
      client: client_name,
      project: project_name,
      period: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
      billableLines,
      exclusionsSummary,
      totalBillable,
      generatedAt: new Date(),
      generatedBy: userId,
    };

    // Store the export record
    await this.storeExportRecord(clientId, projectId, startDate, endDate, invoiceExport, userId);

    return invoiceExport;
  }

  private async storeExportRecord(
    clientId: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    exportData: InvoiceExport,
    userId: string
  ): Promise<void> {
    await query(
      `INSERT INTO invoice_exports 
        (client_id, project_id, period_start, period_end, export_data, total_billable, generated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [clientId, projectId, startDate, endDate, JSON.stringify(exportData), exportData.totalBillable, userId]
    );
  }

  async exportToCSV(invoiceExport: InvoiceExport): Promise<string> {
    // Create CSV for billable lines
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'task', title: 'Task' },
        { id: 'hours', title: 'Hours' },
        { id: 'rate', title: 'Rate (£)' },
        { id: 'amount', title: 'Amount (£)' },
        { id: 'notes', title: 'Notes' },
      ],
    });

    const header = csvStringifier.getHeaderString();
    const records = csvStringifier.stringifyRecords(invoiceExport.billableLines);

    // Add summary section
    const summary = `
    
Invoice Summary
Client: ${invoiceExport.client}
Project: ${invoiceExport.project}
Period: ${invoiceExport.period}
Total Billable: £${invoiceExport.totalBillable.toFixed(2)}

Exclusions Summary (Covered by Subscription)
Total Hours: ${invoiceExport.exclusionsSummary.totalHours.toFixed(2)}
Total Cost: £${invoiceExport.exclusionsSummary.totalCost.toFixed(2)}
`;

    return header + records + summary;
  }

  async getBudgetVsBurn(projectId: string, month: Date): Promise<any> {
    const result = await query(
      `SELECT 
        p.budget,
        p.budget_hours,
        COALESCE(SUM(te.hours), 0) as actual_hours,
        COALESCE(SUM(te.cost_amount), 0) as actual_cost,
        EXTRACT(DAY FROM CURRENT_DATE) / EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day') as month_progress
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
        AND DATE_TRUNC('month', te.date) = DATE_TRUNC('month', $2::date)
      WHERE p.id = $1
      GROUP BY p.id, p.budget, p.budget_hours`,
      [projectId, month]
    );

    if (!result.rows[0]) return null;

    const data = result.rows[0];
    const monthProgress = parseFloat(data.month_progress) * 100;
    const hoursUtilization = data.budget_hours ? 
      (parseFloat(data.actual_hours) / parseFloat(data.budget_hours)) * 100 : 0;
    const costUtilization = data.budget ? 
      (parseFloat(data.actual_cost) / parseFloat(data.budget)) * 100 : 0;

    const burnRate = monthProgress > 0 ? hoursUtilization / monthProgress : 0;
    const forecastToCompletion = burnRate * 100;

    return {
      budget: parseFloat(data.budget || 0),
      budgetHours: parseFloat(data.budget_hours || 0),
      actualHours: parseFloat(data.actual_hours),
      actualCost: parseFloat(data.actual_cost),
      monthProgress,
      hoursUtilization,
      costUtilization,
      burnRate,
      forecastToCompletion,
      status: forecastToCompletion > 100 ? 'over-budget' : 
              forecastToCompletion > 90 ? 'at-risk' : 'on-track',
    };
  }

  async getMonthlyReport(clientId: string, month: Date): Promise<any> {
    // Get all projects for client
    const projectsResult = await query(
      `SELECT id, name FROM projects WHERE client_id = $1 AND is_active = true`,
      [clientId]
    );

    const reports = [];
    for (const project of projectsResult.rows) {
      const profitabilityResult = await query(
        `SELECT * FROM profitability_metrics 
        WHERE client_id = $1 
          AND project_id = $2 
          AND DATE_TRUNC('month', month) = DATE_TRUNC('month', $3::date)`,
        [clientId, project.id, month]
      );

      const budgetVsBurn = await this.getBudgetVsBurn(project.id, month);

      reports.push({
        projectName: project.name,
        profitability: profitabilityResult.rows[0],
        budgetVsBurn,
      });
    }

    return {
      clientId,
      month: format(month, 'yyyy-MM'),
      projects: reports,
      generatedAt: new Date(),
    };
  }
}