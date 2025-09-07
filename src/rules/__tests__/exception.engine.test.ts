import { ExceptionRule, ExceptionEngine } from '../exception.engine';

describe('ExceptionEngine', () => {
  describe('Exception Rules', () => {
    it('should detect rate mismatches correctly', () => {
      const rateRule: ExceptionRule = {
        id: 'rate-mismatch',
        name: 'Rate Mismatch Detection',
        description: 'Expected rate differs from actual',
        evaluate: (context: any) => {
          const expectedRate = 150;
          const actualRate = 100;
          return actualRate !== expectedRate;
        },
        severity: 'high',
        suggestedAction: 'Review and update rate policy'
      };

      const context = { expectedRate: 150, actualRate: 100 };
      expect(rateRule.evaluate(context)).toBe(true);
    });

    it('should detect budget breaches at 90% threshold', () => {
      const budgetRule: ExceptionRule = {
        id: 'budget-breach',
        name: 'Budget Breach Detection',
        description: 'Project exceeds 90% of budget',
        evaluate: (context: any) => {
          const budgetUsed = context.hoursUsed;
          const budgetTotal = context.budgetTotal;
          const percentage = (budgetUsed / budgetTotal) * 100;
          return percentage >= 90;
        },
        severity: 'high',
        suggestedAction: 'Alert PM and review scope'
      };

      const overBudget = { hoursUsed: 95, budgetTotal: 100 };
      const underBudget = { hoursUsed: 80, budgetTotal: 100 };
      
      expect(budgetRule.evaluate(overBudget)).toBe(true);
      expect(budgetRule.evaluate(underBudget)).toBe(false);
    });

    it('should detect billable/non-billable conflicts', () => {
      const conflictRule: ExceptionRule = {
        id: 'billable-conflict',
        name: 'Billable Conflict Detection',
        description: 'Task category conflicts with billable flag',
        evaluate: (context: any) => {
          const taskCategory = context.taskCategory;
          const isBillable = context.isBillable;
          
          // Non-billable tasks marked as billable
          if (taskCategory === 'non-billable' && isBillable) return true;
          // Billable tasks marked as non-billable  
          if (taskCategory === 'billable' && !isBillable) return true;
          
          return false;
        },
        severity: 'medium',
        suggestedAction: 'Correct task categorization'
      };

      const conflict1 = { taskCategory: 'non-billable', isBillable: true };
      const conflict2 = { taskCategory: 'billable', isBillable: false };
      const noConflict = { taskCategory: 'billable', isBillable: true };
      
      expect(conflictRule.evaluate(conflict1)).toBe(true);
      expect(conflictRule.evaluate(conflict2)).toBe(true);
      expect(conflictRule.evaluate(noConflict)).toBe(false);
    });
  });
});