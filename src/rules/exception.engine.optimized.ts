import { Exception, HarvestTimeEntry } from "../types";
import { query } from "../models/database";
import { v4 as uuidv4 } from "uuid";

export class ExceptionEngineOptimized {
  private rules: ExceptionRule[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Process multiple entries in batch to avoid N+1 queries
   */
  async detectExceptionsBatch(
    entries: HarvestTimeEntry[],
  ): Promise<Exception[]> {
    if (!entries || entries.length === 0) return [];

    // Batch fetch all needed data upfront
    const entryIds = entries.map((e) => e.entryId);
    const tasks = [...new Set(entries.map((e) => e.task))];
    const clients = [...new Set(entries.map((e) => e.client))];
    const projects = [...new Set(entries.map((e) => e.project))];
    const personNames = [
      ...new Set(entries.map((e) => `${e.firstName} ${e.lastName}`)),
    ];

    // Batch queries - ONE query per data type instead of N queries
    const [taskData, ratePolicies, budgets] = await Promise.all([
      // Get all tasks at once by name
      query(
        `SELECT name, category, default_billable, deprecated 
         FROM tasks 
         WHERE name = ANY($1::text[])`,
        [tasks],
      ),

      // Get all rate policies at once
      query(
        `SELECT p.first_name, p.last_name, c.name as client_name, rp.rate, rp.effective_from 
         FROM rate_policies rp
         JOIN persons p ON p.id = rp.person_id
         JOIN clients c ON c.id = rp.client_id
         WHERE c.name = ANY($1::text[])
         ORDER BY rp.effective_from DESC`,
        [clients],
      ),

      // Get all project budgets at once (with COALESCE for null safety)
      query(
        `SELECT p.name as project_name, p.budget_hours, 
         COALESCE(SUM(te.hours), 0) as hours_used 
         FROM projects p
         LEFT JOIN time_entries te ON te.project = p.name
         WHERE p.name = ANY($1::text[])
         GROUP BY p.name, p.budget_hours`,
        [projects],
      ),
    ]);

    // Create lookup maps for O(1) access
    const taskMap = new Map(taskData.rows.map((t) => [t.name, t]));
    const ratePolicyMap = new Map();
    const budgetMap = new Map(budgets.rows.map((b) => [b.project_name, b]));

    // Build rate policy map with effective dates
    ratePolicies.rows.forEach((rp) => {
      const key = `${rp.first_name} ${rp.last_name}-${rp.client_name}`;
      if (!ratePolicyMap.has(key)) {
        ratePolicyMap.set(key, []);
      }
      ratePolicyMap.get(key).push(rp);
    });

    // Now process entries with pre-fetched data
    const exceptions: Exception[] = [];

    for (const entry of entries) {
      const task = taskMap.get(entry.task);
      const ratePolicyKey = `${entry.firstName} ${entry.lastName}-${entry.client}`;
      const ratePolicies = ratePolicyMap.get(ratePolicyKey) || [];
      const budget = budgetMap.get(entry.project);

      // Check rate mismatch
      const applicableRate = this.findApplicableRate(ratePolicies, entry.date);
      if (applicableRate && applicableRate.rate) {
        const expectedRate = parseFloat(applicableRate.rate.toString());
        const actualRate = parseFloat(entry.billableRate.toString());
        const variance = Math.abs(expectedRate - actualRate);

        if (variance > 0.01) {
          exceptions.push({
            id: uuidv4(),
            type: "rate_mismatch",
            severity: variance > 10 ? "high" : "medium",
            description: `Rate mismatch: Expected £${expectedRate}/hr, found £${actualRate}/hr`,
            suggestedAction: `Update rate to £${expectedRate}/hr per rate policy`,
            entityType: "time_entry",
            entityId: entry.entryId,
            status: "pending",
            createdAt: new Date(),
            metadata: {
              expectedRate,
              actualRate,
              variance,
            },
          });
        }
      }

      // Check billable conflicts
      if (task) {
        const shouldBeBillable = task.category === "billable";
        const isBillable = entry.billableFlag;

        if (shouldBeBillable !== isBillable) {
          exceptions.push({
            id: uuidv4(),
            type: "billable_conflict",
            severity: "medium",
            description: `Task "${task.name}" is ${task.category} but marked as ${isBillable ? "billable" : "non-billable"}`,
            suggestedAction: `Update billable flag to ${shouldBeBillable}`,
            entityType: "time_entry",
            entityId: entry.entryId,
            status: "pending",
            createdAt: new Date(),
            metadata: {
              taskCategory: task.category,
              currentBillable: isBillable,
              expectedBillable: shouldBeBillable,
            },
          });
        }

        // Check deprecated task usage
        if (task.deprecated) {
          exceptions.push({
            id: uuidv4(),
            type: "deprecated_task",
            severity: "low",
            description: `Task "${task.name}" is deprecated and should not be used`,
            suggestedAction: "Use alternative task or update task status",
            entityType: "time_entry",
            entityId: entry.entryId,
            status: "pending",
            createdAt: new Date(),
            metadata: {
              taskId: task.id,
              taskName: task.name,
            },
          });
        }
      }

      // Check budget breach (with NaN protection)
      if (budget && budget.budget_hours) {
        const hoursUsed = parseFloat(budget.hours_used || "0");
        const budgetHours = parseFloat(budget.budget_hours || "0");

        // Skip if budget hours is 0 or invalid
        if (budgetHours <= 0 || isNaN(hoursUsed) || isNaN(budgetHours)) {
          continue;
        }

        const utilization = (hoursUsed / budgetHours) * 100;

        if (utilization >= 90) {
          exceptions.push({
            id: uuidv4(),
            type: "budget_breach",
            severity: utilization >= 100 ? "high" : "medium",
            description: `Project at ${utilization.toFixed(1)}% of budget`,
            suggestedAction:
              utilization >= 100
                ? "Stop work or request budget extension"
                : "Alert PM about approaching limit",
            entityType: "project",
            entityId: entry.project,
            status: "pending",
            createdAt: new Date(),
            metadata: {
              budgetHours: budget.budget_hours,
              hoursUsed: budget.hours_used,
              utilization,
            },
          });
        }
      }

      // Check missing rate
      if (
        !entry.billableRate ||
        parseFloat(entry.billableRate.toString()) === 0
      ) {
        exceptions.push({
          id: uuidv4(),
          type: "missing_rate",
          severity: "high",
          description: "Time entry has no billable rate",
          suggestedAction: "Set appropriate billable rate",
          entityType: "time_entry",
          entityId: entry.entryId,
          status: "pending",
          createdAt: new Date(),
          metadata: {
            person: `${entry.firstName} ${entry.lastName}`,
            client: entry.client,
          },
        });
      }
    }

    // Deduplicate exceptions (e.g., multiple entries for same budget breach)
    return this.deduplicateExceptions(exceptions);
  }

  private findApplicableRate(ratePolicies: any[], date: Date): any {
    // Find the most recent rate policy before or on the given date
    return ratePolicies
      .filter((rp) => new Date(rp.effective_from || rp.effective_date) <= date)
      .sort(
        (a, b) =>
          new Date(b.effective_from || b.effective_date).getTime() -
          new Date(a.effective_from || a.effective_date).getTime(),
      )[0];
  }

  private deduplicateExceptions(exceptions: Exception[]): Exception[] {
    const seen = new Set<string>();
    return exceptions.filter((ex) => {
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
  severity: "low" | "medium" | "high";
  suggestedAction: string;
}
