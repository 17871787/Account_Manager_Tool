# API Documentation

Base path: `/api`

This document details the available API endpoints, their request/response schemas, and example usages.

## Health

### `GET /api/health`
Checks service availability.

**Response Schema**
```json
{
  "status": "ok",
  "timestamp": "string (ISO date)"
}
```

**Example**
```bash
curl https://example.com/api/health
# => {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

## Profitability

### `POST /api/profitability/calculate`
Calculate profitability for a project in a given month.

**Request Schema**
```json
{
  "clientId": "string",
  "projectId": "string",
  "month": "string (YYYY-MM)"
}
```

**Response Schema** (`ProfitabilityMetric`)
```json
{
  "month": "string",
  "client": "string",
  "project": "string",
  "billableCost": 0,
  "exclusionCost": 0,
  "recognisedRevenue": 0,
  "margin": 0,
  "marginPercentage": 0,
  "exceptionsCount": 0
}
```

**Example**
```bash
curl -X POST https://example.com/api/profitability/calculate \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"c1","projectId":"p1","month":"2024-05"}'
```

### `GET /api/profitability/portfolio/:month`
Get profitability metrics for all projects in a given month.

**Response**: Array of `ProfitabilityMetric` objects.

### `GET /api/profitability/trend/:clientId`
Return the profitability trend for a client.

**Query Params**
- `months` (optional, default `6`): number of months to include.

**Response**: Array of `ProfitabilityMetric` objects ordered by month.

## Clients

### `GET /api/clients`
List active clients.

**Response**: Array of client records.

## Projects

### `GET /api/projects/:clientId`
List active projects for a client.

**Response**: Array of project records.

## Sync

### `POST /api/sync/harvest`
Sync time entries from Harvest.

#### Rate limiting

Sync routes share a rate limiter that allows 60 requests per minute by default. The
thresholds can be overridden with the `SYNC_RATE_LIMIT` (number of requests) and
`SYNC_RATE_WINDOW_MS` (window size in milliseconds) environment variables if your
deployment needs a different throughput.

**Request Schema**
```json
{
  "fromDate": "string (YYYY-MM-DD)",
  "toDate": "string (YYYY-MM-DD)",
  "clientId": "string?"
}
```

**Response Schema**
```json
{
  "success": true,
  "entriesProcessed": 0,
  "period": {"fromDate": "string", "toDate": "string"},
  "source": "harvest"
}
```

### `POST /api/sync/hubspot`
Trigger HubSpot revenue sync.

**Response Schema**
```json
{
  "success": true,
  "recordsProcessed": 0,
  "source": "hubspot",
  "message": "string"
}
```

### `POST /api/sync/sft`
Sync monthly revenue from Sales Forecast Tracker.

**Request Schema**
```json
{
  "month": "string? (YYYY-MM)"
}
```

**Response Schema**
```json
{
  "success": true,
  "recordsProcessed": 0,
  "source": "sft",
  "month": "string",
  "message": "string"
}
```

## HubSpot Deals Upload Storage

The `/app/api/hubspot/upload` routes persist uploaded deal files to the
`hubspot_deal_imports` table in PostgreSQL. Each record stores the parsed deal
payload as JSON (`data` column) along with a deterministic `sort_order` so the
API can return the deals in the same order they were imported.

- Storage is transactional: existing rows are removed and the new snapshot is
  inserted inside a single transaction to avoid partially written uploads.
- Re-importing the same deal updates the existing row and refreshes the
  `updated_at` timestamp.
- Clearing the cache (`DELETE /app/api/hubspot/upload`) simply truncates the
  table, ensuring durability across deployments and server restarts.

## Exceptions

### `GET /api/exceptions/pending`
Fetch pending exceptions.

**Query Params**
- `clientId` (optional): filter by client.

**Response**: Array of exception records.

### `POST /api/exceptions/:id/review`
Approve or reject an exception.

**Request Schema**
```json
{
  "action": "approve" | "reject",
  "userId": "string",
  "helpdeskTicketId": "string?"
}
```

**Response Schema**
```json
{
  "success": true,
  "exceptionId": "string",
  "action": "approve" | "reject"
}
```

## Export

### `POST /api/export/invoice`
Generate invoice data for a project and period.

**Request Schema**
```json
{
  "clientId": "string",
  "projectId": "string",
  "startDate": "string (YYYY-MM-DD)",
  "endDate": "string (YYYY-MM-DD)",
  "userId": "string"
}
```

**Response** (`InvoiceExport`)
```json
{
  "client": "string",
  "project": "string",
  "period": "string",
  "billableLines": [
    {"task": "string", "hours": 0, "rate": 0, "amount": 0, "notes": "string"}
  ],
  "exclusionsSummary": {
    "totalHours": 0,
    "totalCost": 0,
    "coveredBySubscription": false,
    "details": [
      {"task": "string", "hours": 0, "cost": 0}
    ]
  },
  "totalBillable": 0,
  "generatedAt": "string",
  "generatedBy": "string"
}
```

### `POST /api/export/csv`
Convert invoice data to CSV.

**Request Schema**
```json
{
  "invoiceExport": {}
}
```

**Response**: CSV file.

### `GET /api/budget/:projectId`
Retrieve budget vs burn information for a project.

**Query Params**
- `month` (optional, format `YYYY-MM`)

**Response Schema** (`BudgetVsBurn`)
```json
{
  "budget": 0,
  "budgetHours": 0,
  "actualHours": 0,
  "actualCost": 0,
  "monthProgress": 0,
  "hoursUtilization": 0,
  "costUtilization": 0,
  "burnRate": 0,
  "forecastToCompletion": 0,
  "status": "over-budget" | "at-risk" | "on-track"
}
```

### `GET /api/report/monthly/:clientId`
Generate a monthly report for a client.

**Query Params**
- `month` (optional, format `YYYY-MM`)

**Response Schema** (`MonthlyReport`)
```json
{
  "clientId": "string",
  "month": "string",
  "projects": [
    {
      "projectName": "string",
      "profitability": { /* ProfitabilityMetric */ },
      "budgetVsBurn": { /* BudgetVsBurn */ }
    }
  ],
  "generatedAt": "string"
}
```

