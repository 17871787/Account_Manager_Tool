import {
  ExceptionRule,
  ExceptionEngine,
  ExceptionCheckResult,
} from '../exception.engine';

describe('ExceptionEngine', () => {
  describe('Exception Rules', () => {
    it('should detect rate mismatches correctly', async () => {
      const rateRule: ExceptionRule = {
        id: 'rate-mismatch',
        name: 'Rate Mismatch Detection',
        check: async (
          context: { expectedRate: number; actualRate: number }
        ): Promise<ExceptionCheckResult | null> => {
          const { expectedRate, actualRate } = context;
          return actualRate !== expectedRate
            ? {
                type: 'rate_mismatch',
                severity: 'high',
                description: 'Expected rate differs from actual',
                suggestedAction: 'Review and update rate policy',
              }
            : null;
        },
      };

      const context = { expectedRate: 150, actualRate: 100 };
      expect(await rateRule.check(context)).not.toBeNull();
    });

    it('should detect budget breaches at 90% threshold', async () => {
      const budgetRule: ExceptionRule = {
        id: 'budget-breach',
        name: 'Budget Breach Detection',
        check: async (
          context: { hoursUsed: number; budgetTotal: number }
        ): Promise<ExceptionCheckResult | null> => {
          const percentage = (context.hoursUsed / context.budgetTotal) * 100;
          return percentage >= 90
            ? {
                type: 'budget_breach',
                severity: 'high',
                description: 'Project exceeds 90% of budget',
                suggestedAction: 'Alert PM and review scope',
              }
            : null;
        },
      };

      const overBudget = { hoursUsed: 95, budgetTotal: 100 };
      const underBudget = { hoursUsed: 80, budgetTotal: 100 };

      expect(await budgetRule.check(overBudget)).not.toBeNull();
      expect(await budgetRule.check(underBudget)).toBeNull();
    });

    it('should detect billable/non-billable conflicts', async () => {
      const conflictRule: ExceptionRule = {
        id: 'billable-conflict',
        name: 'Billable Conflict Detection',
        check: async (
          context: { taskCategory: string; isBillable: boolean }
        ): Promise<ExceptionCheckResult | null> => {
          const { taskCategory, isBillable } = context;
          if (taskCategory === 'non-billable' && isBillable) {
            return {
              type: 'billable_conflict',
              severity: 'medium',
              description: 'Task category conflicts with billable flag',
              suggestedAction: 'Correct task categorization',
            };
          }
          if (taskCategory === 'billable' && !isBillable) {
            return {
              type: 'billable_conflict',
              severity: 'medium',
              description: 'Task category conflicts with billable flag',
              suggestedAction: 'Correct task categorization',
            };
          }
          return null;
        },
      };

      const conflict1 = { taskCategory: 'non-billable', isBillable: true };
      const conflict2 = { taskCategory: 'billable', isBillable: false };
      const noConflict = { taskCategory: 'billable', isBillable: true };

      expect(await conflictRule.check(conflict1)).not.toBeNull();
      expect(await conflictRule.check(conflict2)).not.toBeNull();
      expect(await conflictRule.check(noConflict)).toBeNull();
    });
  });
});