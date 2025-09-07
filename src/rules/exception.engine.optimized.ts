import { Exception, HarvestTimeEntry } from '../types';
import { query } from '../models/database';
import { v4 as uuidv4 } from 'uuid';

export class ExceptionEngineOptimized {
  private rules: ExceptionRule[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Process multiple entries in batch to avoid N+1 queries
   */
  async detectExceptionsBatch(entries: HarvestTimeEntry[]): Promise<Exception[]> {
    if (!entries || entries.length === 0) return [];

    // Batch fetch all needed data upfront
    const entryIds = entries.map(e => e.entryId);
    const taskIds = [...new Set(entries.map(e => e.taskId))];
    const clientIds = [...new Set(entries.map(e => e.clientId))];
    const projectIds = [...new Set(entries.map(e => e.projectId))];
    const personIds = [...new Set(entries.map(e => e.personId))];

    // Batch queries - ONE query per data type instead of N queries
    const [tasks, ratePolicies, budgets] = await Promise.all([
      // Get all tasks at once
      query(
        `SELECT id, category, default_billable, deprecated 
         FROM tasks 
         WHERE id = ANY($1::text[])`,
        [taskIds]
      ),
      
      // Get all rate policies at once
      query(
        `SELECT person_id, client_id, rate, effective_date 
         FROM rate_policies 
         WHERE person_id = ANY($1::text[]) 
         AND client_id = ANY($2::text[])
         ORDER BY effective_date DESC`,
        [personIds, clientIds]
      ),
      
      // Get all project budgets at once
      query(
        `SELECT project_id, budget_hours, 
         SUM(hours) as hours_used 
         FROM projects p
         LEFT JOIN time_entries te ON te.project_id = p.id
         WHERE p.id = ANY($1::text[])
         GROUP BY p.id, p.budget_hours`,
        [projectIds]
      )
    ]);

    // Create lookup maps for O(1) access
    const taskMap = new Map(tasks.rows.map(t => [t.id, t]));
    const ratePolicyMap = new Map();
    const budgetMap = new Map(budgets.rows.map(b => [b.project_id, b]));

    // Build rate policy map with effective dates
    ratePolicies.rows.forEach(rp => {
      const key = `${rp.person_id}-${rp.client_id}`;
      if (!ratePolicyMap.has(key)) {
        ratePolicyMap.set(key, []);
      }
      ratePolicyMap.get(key).push(rp);
    });

    // Now process entries with pre-fetched data
    const exceptions: Exception[] = [];

    for (const entry of entries) {
      const task = taskMap.get(entry.taskId);
      const ratePolicyKey = `${entry.personId}-${entry.clientId}`;
      const ratePolicies = ratePolicyMap.get(ratePolicyKey) || [];
      const budget = budgetMap.get(entry.projectId);

      // Check rate mismatch
      const applicableRate = this.findApplicableRate(ratePolicies, entry.date);
      if (applicableRate) {
        const expectedRate = parseFloat(applicableRate.rate);
        const actualRate = parseFloat(entry.billableRate);
        const variance = Math.abs(expectedRate - actualRate);
        
        if (variance > 0.01) {
          exceptions.push({
            id: uuidv4(),
            type: 'rate_mismatch',
            severity: variance > 10 ? 'high' : 'medium',
            description: `Rate mismatch: Expected £${expectedRate}/hr, found £${actualRate}/hr`,
            suggestedAction: `Update rate to £${expectedRate}/hr per rate policy`,
            entityType: 'time_entry',
            entityId: entry.entryId,
            status: 'pending',
            createdAt: new Date(),
            metadata: {
              expectedRate,
              actualRate,
              variance
            }
          });
        }
      }

      // Check billable conflicts
      if (task) {
        const shouldBeBillable = task.category === 'billable';
        const isBillable = entry.billableFlag;
        
        if (shouldBeBillable !== isBillable) {
          exceptions.push({
            id: uuidv4(),
            type: 'billable_conflict',
            severity: 'medium',
            description: `Task "${task.name}" is ${task.category} but marked as ${isBillable ? 'billable' : 'non-billable'}`,
            suggestedAction: `Update billable flag to ${shouldBeBillable}`,
            entityType: 'time_entry',
            entityId: entry.entryId,
            status: 'pending',
            createdAt: new Date(),
            metadata: {
              taskCategory: task.category,
              currentBillable: isBillable,
              expectedBillable: shouldBeBillable
            }
          });
        }

        // Check deprecated task usage
        if (task.deprecated) {
          exceptions.push({
            id: uuidv4(),
            type: 'deprecated_task',
            severity: 'low',
            description: `Task "${task.name}" is deprecated and should not be used`,
            suggestedAction: 'Use alternative task or update task status',
            entityType: 'time_entry',
            entityId: entry.entryId,
            status: 'pending',
            createdAt: new Date(),
            metadata: {
              taskId: task.id,
              taskName: task.name
            }
          });
        }
      }

      // Check budget breach
      if (budget && budget.budget_hours) {
        const utilization = (parseFloat(budget.hours_used) / parseFloat(budget.budget_hours)) * 100;
        
        if (utilization >= 90) {
          exceptions.push({
            id: uuidv4(),
            type: 'budget_breach',
            severity: utilization >= 100 ? 'high' : 'medium',
            description: `Project at ${utilization.toFixed(1)}% of budget`,
            suggestedAction: utilization >= 100 ? 'Stop work or request budget extension' : 'Alert PM about approaching limit',
            entityType: 'project',
            entityId: entry.projectId,
            status: 'pending',
            createdAt: new Date(),
            metadata: {
              budgetHours: budget.budget_hours,
              hoursUsed: budget.hours_used,
              utilization
            }
          });
        }
      }

      // Check missing rate
      if (!entry.billableRate || parseFloat(entry.billableRate) === 0) {
        exceptions.push({
          id: uuidv4(),
          type: 'missing_rate',
          severity: 'high',
          description: 'Time entry has no billable rate',
          suggestedAction: 'Set appropriate billable rate',
          entityType: 'time_entry',
          entityId: entry.entryId,
          status: 'pending',
          createdAt: new Date(),
          metadata: {
            personId: entry.personId,
            clientId: entry.clientId
          }
        });
      }
    }

    // Deduplicate exceptions (e.g., multiple entries for same budget breach)
    return this.deduplicateExceptions(exceptions);
  }

  private findApplicableRate(ratePolicies: any[], date: Date): any {
    // Find the most recent rate policy before or on the given date
    return ratePolicies
      .filter(rp => new Date(rp.effective_date) <= date)
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
  }

  private deduplicateExceptions(exceptions: Exception[]): Exception[] {
    const seen = new Set<string>();
    return exceptions.filter(ex => {
      // Create unique key based on type and entity
      const key = `${ex.type}-${ex.entityType}-${ex.entityId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private initializeRules() {
    // Rules are now implemented directly in detectExceptionsBatch
    // This avoids the need for separate rule functions with their own queries
  }
}

export interface ExceptionRule {
  id: string;
  name: string;
  description: string;
  evaluate: (context: any) => boolean;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
}