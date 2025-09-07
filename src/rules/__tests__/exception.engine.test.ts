import { ExceptionRule } from '../exception.engine';

interface RuleContext {
  expectedRate?: number;
  actualRate?: number;
  hoursUsed?: number;
  budgetTotal?: number;
  taskCategory?: string;
  isBillable?: boolean;
}

describe('ExceptionEngine', () => {
  describe('Exception Rules', () => {
    it('should detect rate mismatches correctly', async () => {
      const rateRule: ExceptionRule = {
        id: 'rate-mismatch',
        name: 'Rate Mismatch Detection',
        check: async (context: RuleContext) => {
          const { expectedRate, actualRate } = context;
          if (expectedRate !== actualRate) {
            return {
              type: 'rate-mismatch',
              severity: 'high',
              description: 'Expected rate differs from actual',
              suggestedAction: 'Review and update rate policy',
            };
          }
          return null;
        },
      };

      const context: RuleContext = { expectedRate: 150, actualRate: 100 };
      const result = await rateRule.check(context);
      expect(result).not.toBeNull();
    });

    it('should detect budget breaches at 90% threshold', async () => {
      const budgetRule: ExceptionRule = {
        id: 'budget-breach',
        name: 'Budget Breach Detection',
        check: async (context: RuleContext) => {
          const { hoursUsed, budgetTotal } = context;
          const percentage = (hoursUsed / budgetTotal) * 100;
          if (percentage >= 90) {
            return {
              type: 'budget-breach',
              severity: 'high',
              description: 'Project exceeds 90% of budget',
              suggestedAction: 'Alert PM and review scope',
            };
          }
          return null;
        },
      };

      const overBudget: RuleContext = { hoursUsed: 95, budgetTotal: 100 };
      const underBudget: RuleContext = { hoursUsed: 80, budgetTotal: 100 };

      await expect(budgetRule.check(overBudget)).resolves.not.toBeNull();
      await expect(budgetRule.check(underBudget)).resolves.toBeNull();
    });

    it('should detect billable/non-billable conflicts', async () => {
      const conflictRule: ExceptionRule = {
        id: 'billable-conflict',
        name: 'Billable Conflict Detection',
        check: async (context: RuleContext) => {
          const { taskCategory, isBillable } = context;
          if (taskCategory === 'non-billable' && isBillable) {
            return {
              type: 'billable-conflict',
              severity: 'medium',
              description: 'Task category conflicts with billable flag',
              suggestedAction: 'Correct task categorization',
            };
          }
          if (taskCategory === 'billable' && !isBillable) {
            return {
              type: 'billable-conflict',
              severity: 'medium',
              description: 'Task category conflicts with billable flag',
              suggestedAction: 'Correct task categorization',
            };
          }
          return null;
        },
      };

      const conflict1: RuleContext = { taskCategory: 'non-billable', isBillable: true };
      const conflict2: RuleContext = { taskCategory: 'billable', isBillable: false };
      const noConflict: RuleContext = { taskCategory: 'billable', isBillable: true };

      await expect(conflictRule.check(conflict1)).resolves.not.toBeNull();
      await expect(conflictRule.check(conflict2)).resolves.not.toBeNull();
      await expect(conflictRule.check(noConflict)).resolves.toBeNull();
    });
  });
});

