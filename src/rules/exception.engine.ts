import { Exception, TimeEntryRecord, RatePolicyRow } from '../types';
import { query } from '../models/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * ExceptionEngine processes time-entry records and applies a series of
 * database-backed rules to detect inconsistencies. Each rule performs its own
 * query which keeps the implementation straightforward and easy to extend, but
 * also means that processing large batches of entries can result in a high
 * number of database calls (an "N+1" pattern). Use this engine for smaller
 * workloads or interactive scenarios where clarity and rule isolation are more
 * important than raw throughput.
 */
export class ExceptionEngine {
  private rules: ExceptionRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // Rate mismatch detection
    this.rules.push({
      id: 'rate_mismatch',
      name: 'Rate Mismatch Detection',
      check: async (entry: TimeEntryRecord) => {
        const ratePolicy = await this.getApplicableRate(
          entry.person_id,
          entry.client_id,
          entry.date
        );
        
        if (!ratePolicy) return null;

        const expectedRate = ratePolicy.rate;
        const actualRate = entry.billable_rate;
        const variance = Math.abs(expectedRate - actualRate);
        
        if (variance > 0.01) {
          return {
            type: 'rate_mismatch',
            severity: variance > 10 ? 'high' : 'medium',
            description: `Rate mismatch: Expected £${expectedRate}/hr, found £${actualRate}/hr`,
            suggestedAction: `Update rate to £${expectedRate}/hr per rate policy`,
            metadata: {
              expectedRate,
              actualRate,
              variance,
            },
          };
        }
        return null;
      },
    });

    // Billable flag conflict detection
    this.rules.push({
      id: 'billable_conflict',
      name: 'Billable Flag Conflict',
      check: async (entry: TimeEntryRecord) => {
        const taskResult = await query(
          'SELECT category, default_billable FROM tasks WHERE id = $1',
          [entry.task_id]
        );
        
        if (!taskResult.rows[0]) return null;
        
        const task = taskResult.rows[0];
        const expectedBillable = task.category === 'billable';
        
        if (entry.billable_flag !== expectedBillable) {
          return {
            type: 'billable_conflict',
            severity: 'high',
            description: `Billable flag conflict: Task "${entry.task_name}" is ${task.category} but marked as ${entry.billable_flag ? 'billable' : 'non-billable'}`,
            suggestedAction: `Change billable flag to ${expectedBillable}`,
            metadata: {
              taskCategory: task.category,
              expectedBillable,
              entryBillableFlag: entry.billable_flag,
            },
          };
        }
        return null;
      },
    });

    // Budget breach detection
    this.rules.push({
      id: 'budget_breach',
      name: 'Budget Breach Detection',
      check: async (entry: TimeEntryRecord) => {
        const budgetResult = await query(
          `SELECT 
            p.budget,
            p.budget_hours,
            SUM(te.hours) as total_hours,
            SUM(te.cost_amount) as total_cost
          FROM projects p
          LEFT JOIN time_entries te ON te.project_id = p.id
          WHERE p.id = $1
            AND DATE_TRUNC('month', te.date) = DATE_TRUNC('month', $2::date)
          GROUP BY p.id, p.budget, p.budget_hours`,
          [entry.project_id, entry.date]
        );
        
        if (!budgetResult.rows[0]) return null;

        const budget = budgetResult.rows[0];
        const budgetHours = parseFloat(budget.budget_hours);
        const totalHours = parseFloat(budget.total_hours ?? '0');
        const totalCost = parseFloat(budget.total_cost ?? '0');
        const utilizationRate = budgetHours ? (totalHours / budgetHours) * 100 : 0;
        
        if (utilizationRate > 90) {
          return {
            type: 'budget_breach',
            severity: utilizationRate > 100 ? 'high' : 'medium',
            description: `Budget utilization at ${utilizationRate.toFixed(1)}% for project`,
            suggestedAction: utilizationRate > 100 ?
              'Project over budget - review with Finance' :
              'Approaching budget limit - monitor closely',
            metadata: {
              utilizationRate,
              budgetHours,
              totalHours,
              totalCost,
            },
          };
        }
        return null;
      },
    });

    // Deprecated task usage
    this.rules.push({
      id: 'deprecated_task',
      name: 'Deprecated Task Usage',
      check: async (entry: TimeEntryRecord) => {
        const taskResult = await query(
          'SELECT is_active, name FROM tasks WHERE id = $1',
          [entry.task_id]
        );
        
        if (!taskResult.rows[0]) return null;
        
        const task = taskResult.rows[0];
        if (!task.is_active) {
          return {
            type: 'deprecated_task',
            severity: 'medium',
            description: `Time logged to deprecated task: "${task.name}"`,
            suggestedAction: 'Reclassify to active task category',
            metadata: {
              taskName: task.name,
            },
          };
        }
        return null;
      },
    });

    // Missing rate detection
    this.rules.push({
      id: 'missing_rate',
      name: 'Missing Rate Detection',
      check: async (entry: TimeEntryRecord) => {
        if (!entry.billable_rate || entry.billable_rate === 0) {
          if (entry.billable_flag) {
            return {
              type: 'missing_rate',
              severity: 'high',
              description: 'Billable time entry missing rate',
              suggestedAction: 'Add rate from rate policy or set as non-billable',
              metadata: {
                rateType: 'billable_rate',
              },
            };
          }
        }
        if (!entry.cost_rate || entry.cost_rate === 0) {
          return {
            type: 'missing_rate',
            severity: 'medium',
            description: 'Time entry missing cost rate',
            suggestedAction: 'Add cost rate for accurate profitability',
            metadata: {
              rateType: 'cost_rate',
            },
          };
        }
        return null;
      },
    });
  }

  async detectExceptions(entries: TimeEntryRecord[]): Promise<Exception[]> {
    const exceptions: Exception[] = [];

    for (const entry of entries) {
      for (const rule of this.rules) {
        const exception = await rule.check(entry);
        if (exception) {
          exceptions.push({
            id: uuidv4(),
            entryId: entry.id,
            entityType: 'time_entry',
            entityId: entry.id,
            type: exception.type,
            severity: exception.severity,
            description: exception.description,
            suggestedAction: exception.suggestedAction,
            ...(exception.metadata ? { metadata: exception.metadata } : {}),
            createdAt: new Date(),
            status: 'pending',
          });
        }
      }
    }

    return exceptions;
  }

  async processTimeEntry(entryId: string): Promise<Exception[]> {
    const entryResult = await query(
      `SELECT 
        te.*,
        t.name as task_name,
        t.category as task_category,
        p.name as person_name
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN people p ON te.person_id = p.id
      WHERE te.id = $1`,
      [entryId]
    );

    if (!entryResult.rows[0]) return [];

    return this.detectExceptions([entryResult.rows[0] as TimeEntryRecord]);
  }

  async storeExceptions(exceptions: Exception[]): Promise<void> {
    for (const exception of exceptions) {
      await query(
        `INSERT INTO exceptions 
          (id, entry_id, type, severity, description, suggested_action, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (entry_id, type) DO UPDATE SET
          severity = $4,
          description = $5,
          suggested_action = $6,
          updated_at = CURRENT_TIMESTAMP`,
        [
          exception.id,
          exception.entryId,
          exception.type,
          exception.severity,
          exception.description,
          exception.suggestedAction,
          exception.status,
        ]
      );
    }
  }

  async getApplicableRate(
    personId: string,
    clientId: string,
    date: Date
  ): Promise<RatePolicyRow | null> {
    const result = await query<RatePolicyRow>(
      `SELECT rate
      FROM rate_policies
      WHERE person_id = $1
        AND client_id = $2
        AND effective_from <= $3
        AND (effective_to IS NULL OR effective_to >= $3)
      ORDER BY effective_from DESC
      LIMIT 1`,
      [personId, clientId, date]
    );

    if (!result.rows[0]) return null;
    return { rate: Number(result.rows[0].rate) };
  }

  async getPendingExceptions(clientId?: string): Promise<Exception[]> {
    let queryText = `
      SELECT 
        e.*,
        te.date as entry_date,
        te.hours,
        t.name as task_name,
        p.name as project_name,
        c.name as client_name
      FROM exceptions e
      JOIN time_entries te ON e.entry_id = te.id
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON te.project_id = p.id
      JOIN clients c ON te.client_id = c.id
      WHERE e.status = 'pending'`;

    const params: string[] = [];
    if (clientId) {
      queryText += ' AND te.client_id = $1';
      params.push(clientId);
    }

    queryText += ' ORDER BY e.severity DESC, e.created_at DESC';

    const result = await query<Exception>(queryText, params);
    return result.rows;
  }

  async approveException(
    exceptionId: string,
    userId: string,
    helpdeskTicketId?: string
  ): Promise<void> {
    await query(
      `UPDATE exceptions 
      SET status = 'approved',
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          helpdesk_ticket_id = $3
      WHERE id = $1`,
      [exceptionId, userId, helpdeskTicketId]
    );
  }

  async rejectException(
    exceptionId: string,
    userId: string
  ): Promise<void> {
    await query(
      `UPDATE exceptions 
      SET status = 'rejected',
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [exceptionId, userId]
    );
  }
}

export interface ExceptionRule<TMetadata = unknown> {
  id: string;
  name: string;
  check: (entry: TimeEntryRecord) => Promise<{
    type: Exception['type'];
    severity: Exception['severity'];
    description: string;
    suggestedAction: string;
    metadata?: TMetadata;
  } | null>;
}
