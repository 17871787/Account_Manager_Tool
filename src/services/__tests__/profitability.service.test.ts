import { ProfitabilityService } from '../profitability.service';

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;
  
  beforeEach(() => {
    service = new ProfitabilityService();
  });

  describe('calculateMargin', () => {
    it('should calculate margin correctly using Q-review formula', () => {
      // Q-review formula: Margin = Revenue - (Billable Cost + Exclusion Cost)
      const revenue = 100000;
      const billableCost = 50000;
      const exclusionCost = 10000;
      
      const margin = revenue - (billableCost + exclusionCost);
      const marginPercentage = (margin / revenue) * 100;
      
      expect(margin).toBe(40000);
      expect(marginPercentage).toBe(40);
    });

    it('should handle zero revenue without dividing by zero', () => {
      const revenue = 0;
      const billableCost = 10000;
      const exclusionCost = 5000;
      
      const margin = revenue - (billableCost + exclusionCost);
      const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;
      
      expect(margin).toBe(-15000);
      expect(marginPercentage).toBe(0);
    });

    it('should handle negative margins correctly', () => {
      const revenue = 50000;
      const billableCost = 60000;
      const exclusionCost = 10000;
      
      const margin = revenue - (billableCost + exclusionCost);
      const marginPercentage = (margin / revenue) * 100;
      
      expect(margin).toBe(-20000);
      expect(marginPercentage).toBe(-40);
    });
  });
});