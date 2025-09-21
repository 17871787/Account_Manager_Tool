import { AppError, ProfitabilityMetric } from '../types';
import { query } from '../models/database';
import { format } from 'date-fns';

interface CostRow {
  billable_cost: string | null;
  exclusion_cost: string | null;
  exception_count: string | null;
}

interface RevenueRow {
  recognised_revenue: string | null;
}

interface NameRow {
  client_name: string;
  project_name: string;
}

interface ProfitabilityMetricRow {
  month: Date;
  client_name: string;
  project_name: string;
  billable_cost: string;
  exclusion_cost: string;
  recognised_revenue: string;
  margin: string;
  margin_percentage: string;
  exceptions_count: number;
}

export class ProfitabilityService {
  async calculateProfitability(
    clientId: string,
    projectId: string,
    month: Date
  ): Promise<ProfitabilityMetric> {
    const monthStr = format(month, 'yyyy-MM');
    
    // Get time entries for the month
    const timeEntriesResult = await query<CostRow>(
      `SELECT 
        SUM(CASE WHEN t.category = 'billable' THEN te.cost_amount ELSE 0 END) as billable_cost,
        SUM(CASE WHEN t.category = 'exclusion' THEN te.cost_amount ELSE 0 END) as exclusion_cost,
        COUNT(DISTINCT e.id) as exception_count
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      LEFT JOIN exceptions e ON e.entry_id = te.id AND e.status = 'pending'
      WHERE te.client_id = $1 
        AND te.project_id = $2 
        AND DATE_TRUNC('month', te.date) = DATE_TRUNC('month', $3::date)`,
      [clientId, projectId, month]
    );

    const { billable_cost, exclusion_cost, exception_count } =
      timeEntriesResult.rows[0];

    // Get recognised revenue
    const revenueResult = await query<RevenueRow>(
      `SELECT recognised_revenue 
      FROM sft_revenue 
      WHERE client_id = $1 
        AND project_id = $2 
        AND month = DATE_TRUNC('month', $3::date)`,
      [clientId, projectId, month]
    );

    const recognisedRevenue = parseFloat(
      revenueResult.rows[0]?.recognised_revenue ?? '0'
    );

    // Calculate margin (Q-review formula)
    // Margin = Recognised Revenue - (Billable Service Time Cost + Attributable Exclusion Cost)
    const totalCost =
      parseFloat(billable_cost ?? '0') + parseFloat(exclusion_cost ?? '0');
    const margin = recognisedRevenue - totalCost;
    const marginPercentage = recognisedRevenue > 0 ? (margin / recognisedRevenue) * 100 : 0;

    // Get client and project names
    const namesResult = await query<NameRow>(
      `SELECT c.name as client_name, p.name as project_name
      FROM clients c
      JOIN projects p ON p.client_id = c.id
      WHERE c.id = $1 AND p.id = $2`,
      [clientId, projectId]
    );

    const nameRow = namesResult.rows[0];

    if (!nameRow) {
      const error = new Error('Client or project not found') as AppError;
      error.status = 404;
      throw error;
    }

    const { client_name, project_name } = nameRow;

    const metric: ProfitabilityMetric = {
      month: monthStr,
      client: client_name,
      project: project_name,
      billableCost: parseFloat(billable_cost ?? '0'),
      exclusionCost: parseFloat(exclusion_cost ?? '0'),
      recognisedRevenue,
      margin,
      marginPercentage,
      exceptionsCount: parseInt(exception_count ?? '0', 10),
    };

    // Store the calculated metric
    await this.storeProfitabilityMetric(clientId, projectId, month, metric);

    return metric;
  }

  private async storeProfitabilityMetric(
    clientId: string,
    projectId: string,
    month: Date,
    metric: ProfitabilityMetric
  ): Promise<void> {
    await query(
      `INSERT INTO profitability_metrics 
        (month, client_id, project_id, billable_cost, exclusion_cost, 
         recognised_revenue, margin, margin_percentage, exceptions_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (month, client_id, project_id) 
      DO UPDATE SET
        billable_cost = $4,
        exclusion_cost = $5,
        recognised_revenue = $6,
        margin = $7,
        margin_percentage = $8,
        exceptions_count = $9,
        calculated_at = CURRENT_TIMESTAMP`,
      [
        month,
        clientId,
        projectId,
        metric.billableCost,
        metric.exclusionCost,
        metric.recognisedRevenue,
        metric.margin,
        metric.marginPercentage,
        metric.exceptionsCount,
      ]
    );
  }

  async getPortfolioProfitability(month: Date): Promise<ProfitabilityMetric[]> {
    const result = await query<ProfitabilityMetricRow>(
      `SELECT 
        pm.*,
        c.name as client_name,
        p.name as project_name
      FROM profitability_metrics pm
      JOIN clients c ON pm.client_id = c.id
      JOIN projects p ON pm.project_id = p.id
      WHERE DATE_TRUNC('month', pm.month) = DATE_TRUNC('month', $1::date)
      ORDER BY pm.margin DESC`,
      [month]
    );

    return result.rows.map(row => ({
      month: format(row.month, 'yyyy-MM'),
      client: row.client_name,
      project: row.project_name,
      billableCost: parseFloat(row.billable_cost),
      exclusionCost: parseFloat(row.exclusion_cost),
      recognisedRevenue: parseFloat(row.recognised_revenue),
      margin: parseFloat(row.margin),
      marginPercentage: parseFloat(row.margin_percentage),
      exceptionsCount: row.exceptions_count,
    }));
  }

  async getClientProfitabilityTrend(
    clientId: string,
    months: number = 6
  ): Promise<ProfitabilityMetric[]> {
    const result = await query<ProfitabilityMetricRow>(
      `SELECT 
        pm.*,
        c.name as client_name,
        p.name as project_name
      FROM profitability_metrics pm
      JOIN clients c ON pm.client_id = c.id
      JOIN projects p ON pm.project_id = p.id
      WHERE pm.client_id = $1
        AND pm.month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL $2)
      ORDER BY pm.month DESC`,
      [clientId, `${months} months`]
    );

    return result.rows.map(row => ({
      month: format(row.month, 'yyyy-MM'),
      client: row.client_name,
      project: row.project_name,
      billableCost: parseFloat(row.billable_cost),
      exclusionCost: parseFloat(row.exclusion_cost),
      recognisedRevenue: parseFloat(row.recognised_revenue),
      margin: parseFloat(row.margin),
      marginPercentage: parseFloat(row.margin_percentage),
      exceptionsCount: row.exceptions_count,
    }));
  }

  /**
   * Compare expected margin with calculated margin.
   * Variance is set to Infinity if expectedMargin is 0 to avoid division by zero.
   */
  async backTestAccuracy(
    clientId: string,
    projectId: string,
    month: Date,
    expectedMargin: number
  ): Promise<{ variance: number; withinTolerance: boolean; calculatedMargin: number }> {
    // Calculate WITHOUT persisting (read-only for back-testing)
    const calculated = await this.calculateProfitabilityReadOnly(clientId, projectId, month);
    // Avoid division by zero when the expected margin is 0
    const variance =
      expectedMargin === 0
        ? Infinity
        : (Math.abs(calculated.margin - expectedMargin) / Math.abs(expectedMargin)) * 100;
    const withinTolerance = variance <= 1; // ±1% tolerance

    return {
      variance,
      withinTolerance,
      calculatedMargin: calculated.margin,
    };
  }

  // Read-only version for back-testing that doesn't persist
  private async calculateProfitabilityReadOnly(
    clientId: string,
    projectId: string,
    month: Date
  ): Promise<ProfitabilityMetric> {
    const monthStr = format(month, 'yyyy-MM');
    
    // Get cost data
    const costResult = await query<CostRow>(
      `SELECT 
        SUM(CASE WHEN t.category = 'billable' THEN te.hours * te.cost_rate ELSE 0 END) as billable_cost,
        SUM(CASE WHEN t.category = 'exclusion' THEN te.hours * te.cost_rate ELSE 0 END) as exclusion_cost,
        COUNT(DISTINCT e.id) as exception_count
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      LEFT JOIN exceptions e ON e.entity_id = te.id AND e.entity_type = 'time_entry'
      WHERE te.client_id = $1 
        AND te.project_id = $2
        AND DATE_TRUNC('month', te.date) = DATE_TRUNC('month', $3::date)`,
      [clientId, projectId, month]
    );

    // Get revenue data
    const revenueResult = await query<RevenueRow>(
      `SELECT recognised_revenue 
       FROM sft_revenue 
       WHERE client_id = $1 
         AND project_id = $2 
         AND month = DATE_TRUNC('month', $3::date)`,
      [clientId, projectId, month]
    );

    // Get names
    const namesResult = await query<NameRow>(
      `SELECT c.name as client_name, p.name as project_name
       FROM clients c, projects p
       WHERE c.id = $1 AND p.id = $2`,
      [clientId, projectId]
    );

    const { billable_cost, exclusion_cost, exception_count } =
      costResult.rows[0] || {};
    const recognisedRevenue = parseFloat(
      revenueResult.rows[0]?.recognised_revenue ?? '0'
    );
    const { client_name, project_name } = namesResult.rows[0] || {};

    // Calculate margin (Q-review formula)
    const totalCost =
      parseFloat(billable_cost ?? '0') + parseFloat(exclusion_cost ?? '0');
    const margin = recognisedRevenue - totalCost;
    const marginPercentage = recognisedRevenue > 0 ? (margin / recognisedRevenue) * 100 : 0;

    // Return WITHOUT persisting
    return {
      month: monthStr,
      client: client_name || '',
      project: project_name || '',
      billableCost: parseFloat(billable_cost ?? '0'),
      exclusionCost: parseFloat(exclusion_cost ?? '0'),
      recognisedRevenue,
      margin,
      marginPercentage,
      exceptionsCount: parseInt(exception_count ?? '0', 10),
    };
  }
}
