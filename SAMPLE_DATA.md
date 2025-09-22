# Sample CSV Data for Testing

## HubSpot CSV (Revenue Data)

Save this as `hubspot_sample.csv`:

```csv
Company name,Deal amount,Deal stage,Close date
Acme Corporation,50000,Closed Won,2025-09-15
TechStart Inc,35000,Closed Won,2025-09-10
Global Solutions Ltd,75000,Closed Won,2025-09-20
Innovation Labs,25000,Closed Won,2025-09-18
Enterprise Systems,90000,Closed Won,2025-09-12
Small Business Co,15000,Closed Won,2025-09-22
```

## Finance CSV (Cost Data)

Save this as `finance_sample.csv`:

```csv
Client name,Costs,Period,Notes
Acme Corporation,30000,September 2025,Development costs
TechStart Inc,28000,September 2025,Team allocation
Global Solutions Ltd,45000,September 2025,Full project
Innovation Labs,20000,September 2025,Consulting
Enterprise Systems,55000,September 2025,Large implementation
Small Business Co,8000,September 2025,Basic support
```

## Expected Results

When you upload both files, you should see:

### Summary Cards
- **Total Revenue**: £290,000
- **Total Costs**: £186,000
- **Total Profit**: £104,000
- **Overall Margin**: 35.9%

### Client Profitability Table

| Client | Revenue | Costs | Profit | Margin % |
|--------|---------|-------|--------|----------|
| Enterprise Systems | £90,000 | £55,000 | £35,000 | 38.9% (Orange) |
| Global Solutions Ltd | £75,000 | £45,000 | £30,000 | 40.0% (Orange) |
| Acme Corporation | £50,000 | £30,000 | £20,000 | 40.0% (Orange) |
| TechStart Inc | £35,000 | £28,000 | £7,000 | 20.0% (Red) |
| Small Business Co | £15,000 | £8,000 | £7,000 | 46.7% (Orange) |
| Innovation Labs | £25,000 | £20,000 | £5,000 | 20.0% (Red) |

## Testing Steps

1. Go to https://am-copilot.vercel.app/upload
2. Drag and drop both CSV files
3. Click "Process and View Dashboard"
4. Verify the calculations match expected results

## Column Variations to Test

The system should handle these column name variations:

### HubSpot Alternatives
- "Company name" → "Client" or "Account"
- "Deal amount" → "Revenue"

### Finance Alternatives
- "Client name" → "Client" or "Account"
- "Costs" → "Expected costs"

## Edge Cases to Test

1. **Client only in HubSpot**: Add a row to HubSpot CSV without matching Finance entry
   - Should show 100% margin (no costs)

2. **Client only in Finance**: Add a row to Finance CSV without matching HubSpot entry
   - Should show negative profit (costs but no revenue)

3. **Case sensitivity**: Change "Acme Corporation" to "ACME CORPORATION" in one file
   - Won't match (exact matching required)