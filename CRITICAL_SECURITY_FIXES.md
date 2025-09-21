# CRITICAL SECURITY & STABILITY FIXES REQUIRED

## ⚠️ PRODUCTION DEPLOYMENT BLOCKED UNTIL THESE ARE FIXED

### 1. 🔴 CRITICAL: Unauthenticated API Endpoints

**Issue**: All Harvest and HubSpot API routes expose sensitive data without authentication.

**Fix Required in these files**:
- `app/api/harvest/time-entries/route.ts`
- `app/api/harvest/users/me/route.ts`
- `app/api/hubspot/deals/route.ts`
- `app/api/hubspot/contacts/route.ts`
- `app/api/hubspot/companies/route.ts`

**Add this to each route**:
```typescript
import { requireAuth } from "@/src/middleware/auth";

export async function GET(req: NextRequest) {
  // Add authentication check
  const authResponse = await requireAuth(req);
  if (authResponse) return authResponse;

  // ... rest of the code
}
```

### 2. 🔴 CRITICAL: PostgreSQL INTERVAL Bug

**Issue**: Invalid parameterization will crash in production

**File**: `src/services/profitability.service.ts` (line 190)

**Current (BROKEN)**:
```sql
AND pm.month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL $2)
```

**Fix to**:
```sql
AND pm.month >= DATE_TRUNC('month', CURRENT_DATE - ($2::integer * INTERVAL '1 month'))
```

**Also change line 192**:
```typescript
[clientId, months]  // Not `${months} months`
```

### 3. 🟡 HIGH: TLS Verification Disabled

**File**: `src/models/database.ts` (line 13)

**Current (INSECURE)**:
```typescript
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

**Fix to**:
```typescript
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true }
  : false
```

### 4. 🟡 HIGH: HubSpot Storage Deadlock

**File**: `app/api/hubspot/upload/storage.ts` (lines 21-42)

**Fix**:
```typescript
async function ensureStorageTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      try {
        await query(`CREATE TABLE IF NOT EXISTS ...`);
        await query(`CREATE INDEX IF NOT EXISTS ...`);
      } catch (error) {
        ensureTablePromise = null; // Reset on failure!
        throw error;
      }
    })();
  }
  return ensureTablePromise;
}
```

### 5. 🟡 HIGH: Missing Pagination in Harvest

**File**: `src/connectors/harvest.connector.ts`

**Fix getProjects, getClients, getTasks, getUsers**:
```typescript
async getProjects(isActive = true): Promise<HarvestProject[]> {
  const allProjects: HarvestProject[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await this.client.get('/projects', {
      params: { is_active: isActive, per_page: 100, page },
    });

    allProjects.push(...response.data.projects.map(/* mapping */));
    hasMore = response.data.next_page !== null;
    page++;
  }

  return allProjects;
}
```

### 6. 🟡 HIGH: Rate Limiting Missing

**File**: `src/connectors/harvest.connector.ts`

**Add to getTimeEntries**:
```typescript
// Handle rate limiting
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'];
  const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
  await new Promise(resolve => setTimeout(resolve, delay));
  continue; // Retry the request
}
```

## Environment Variables Required

Add these to `.env.local`:
```bash
# API Authentication
INTERNAL_API_KEY=your-secure-api-key-here
VALID_SESSION_TOKEN=your-session-token-here
```

## Testing Commands

```bash
# Test authentication
curl -H "x-api-key: wrong-key" http://localhost:3000/api/harvest/time-entries
# Should return 401 Unauthorized

# Test with correct key
curl -H "x-api-key: your-secure-api-key-here" http://localhost:3000/api/harvest/time-entries
# Should return data
```

## Deployment Checklist

- [ ] All API routes have authentication
- [ ] PostgreSQL INTERVAL query fixed
- [ ] TLS verification enabled
- [ ] HubSpot storage initialization fixed
- [ ] Harvest pagination implemented
- [ ] Rate limiting added
- [ ] Environment variables set
- [ ] Tests passing
- [ ] CI/CD green

## DO NOT DEPLOY TO PRODUCTION UNTIL ALL ITEMS ARE CHECKED ✅