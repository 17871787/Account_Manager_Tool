# Business Logic

## Overview
Account Manager Tool calculates client profitability by combining revenue data from HubSpot with cost data from Finance spreadsheets.

## Core Formula
```
Profit = Revenue - Costs
Margin % = (Profit / Revenue) × 100
```

## Data Processing Flow

### 1. CSV Upload
- User uploads 2 CSV files weekly:
  - **HubSpot CSV**: Contains revenue/deals data
  - **Finance CSV**: Contains cost/expense data

### 2. Client Matching
The system matches clients between both files by name:
- Exact name matching (case-sensitive)
- Unmatched clients are still shown:
  - Revenue without costs = 100% margin
  - Costs without revenue = negative profit

### 3. Column Mapping

#### HubSpot CSV (Revenue)
```javascript
Client Name: "Company name" || "Client" || "Account"
Revenue: "Deal amount" || "Revenue"
```

#### Finance CSV (Costs)
```javascript
Client Name: "Client name" || "Client" || "Account"
Costs: "Costs" || "Expected costs"
```

### 4. Calculations

#### Per Client
- **Revenue**: Sum of all deals/revenue for that client
- **Costs**: Sum of all costs for that client
- **Profit**: Revenue - Costs
- **Margin %**: (Profit / Revenue) × 100

#### Portfolio Totals
- **Total Revenue**: Sum of all client revenues
- **Total Costs**: Sum of all client costs
- **Total Profit**: Total Revenue - Total Costs
- **Overall Margin %**: (Total Profit / Total Revenue) × 100

### 5. Display Rules

#### Margin Color Coding
- **Green**: Margin > 50%
- **Orange**: Margin 25-50%
- **Red**: Margin < 25%

#### Sorting
- Clients sorted by profit (highest to lowest)
- Negative profit clients appear at bottom

## Edge Cases

1. **Missing Revenue**: Client shows with 0 revenue, negative profit
2. **Missing Costs**: Client shows with 0 costs, 100% margin
3. **Zero Revenue**: Margin shows as 0% (avoiding division by zero)
4. **Duplicate Names**: Last entry overwrites previous
5. **Invalid Numbers**: Defaults to 0

## Business Rules

1. **Weekly Cadence**: New data uploaded every Monday
2. **Historical Data**: Previous uploads stored but not aggregated
3. **Manual Process**: No automatic sync, user controls timing
4. **Simple Matching**: No fuzzy matching or AI - exact names only
5. **No Projections**: Actual data only, no forecasting

## Use Cases

### Primary: Weekly Executive Review
1. Joe uploads CSVs Monday morning
2. Views dashboard showing client profitability
3. Shares URL with boss for review
4. Discusses low-margin clients

### Secondary: Ad-hoc Analysis
1. Mid-week check on specific clients
2. Month-end profitability review
3. Quick profit verification before client meetings

## Data Retention

- Latest upload always available at `/dashboard`
- Historical files stored in `/data` folder
- No automatic cleanup or archiving
- Simple JSON storage (no database)

## Future Considerations

Intentionally kept simple for personal use:
- No multi-user support needed
- No complex permissions
- No automated alerts
- No integrations beyond manual CSV
- No data validation beyond basic parsing