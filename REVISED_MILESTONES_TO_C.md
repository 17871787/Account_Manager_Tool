# Revised Milestones to C Grade - Based on Reality

## Critical Findings from Analysis
**The codebase already has session-based auth partially wired. The problem isn't missing auth - it's that it's incomplete and fighting with itself.**

---

## 🔍 What Actually Exists vs What's Claimed

### Already Have (Surprising Discoveries):
✅ Session cookies with SESSION_SECRET
✅ requireAuth and requireExpressAuth middleware
✅ Health endpoint (/api/health)
✅ Crash detection (Sentry configured)
✅ Optimized Harvest connector with batching

### Still Broken (Real Problems):
❌ NEXT_PUBLIC_API_KEY is mostly unused (housekeeping)
❌ Login flow incomplete (no Express equivalent)
❌ HubSpot OAuth lives only in Next.js routes
❌ Memory maps unbounded (4 separate caches)
❌ Build wrapper is the problem, not the command

---

# 🚀 REVISED MILESTONE 1: COMPLETE THE AUTH (Days 1-3)
**Goal: Finish what's half-built, not rebuild**

## Real Tasks:
### Day 1: Wire Session Flow End-to-End
```javascript
□ Configure SESSION_SECRET properly
  - Generate real secret: openssl rand -base64 32
  - Add to .env: SESSION_SECRET=<generated>
  - Verify both Next and Express use same secret

□ Fix login endpoint
  - Check if /api/auth/login exists
  - Ensure it sets session cookie correctly
  - Test cookie transport to Express

□ Remove NEXT_PUBLIC_API_KEY references (housekeeping)
  - It's not actually protecting anything
  - Just confusing the architecture
```

### Day 2: Migrate Critical Next.js Routes to Express
```javascript
□ Port login flow FIRST (before deleting Next routes!)
  // Express: src/api/auth/login.ts
  router.post('/auth/login', async (req, res) => {
    // Validate credentials
    // Set session cookie (same format as Next)
    // Return success
  });

□ Port HubSpot OAuth handlers
  // These MUST exist before removing Next.js routes:
  - /auth/hubspot/initiate
  - /auth/hubspot/callback
  - Preserve state-cookie handling

□ Test both auth flows work
  - Login creates session
  - HubSpot OAuth completes
  - Session recognized by both APIs
```

### Day 3: Fix Memory Leaks in OptimizedHarvestConnector
```javascript
□ Add size limits to ALL FOUR maps
  // Current problem:
  private globalIdCache: {
    clients: new Map(),    // Grows forever
    projects: new Map(),   // Grows forever
    tasks: new Map(),      // Grows forever
    people: new Map(),     // Grows forever
  };

  // Fix with shared eviction:
  private evictIfNeeded(cache: Map, maxSize = 10000) {
    if (cache.size > maxSize) {
      // Keep the batching benefits
      const toDelete = Math.floor(maxSize * 0.2);
      const keys = Array.from(cache.keys()).slice(0, toDelete);
      keys.forEach(k => cache.delete(k));
    }
  }
```

## Verification:
```bash
# Session auth works
curl -X POST localhost:3001/auth/login -c cookies.txt
curl -b cookies.txt localhost:3001/api/profitability
# Should return data, not 401

# Memory doesn't explode
# Run 20000 Harvest syncs
# Check heap usage stays under 400MB
```

---

# 🔧 REVISED MILESTONE 2: UNIFY THE APIS (Days 4-10)
**Goal: Stop the dual-API fight, but carefully**

## Real Tasks:
### Days 4-5: Proxy Strategy (Not Delete-First)
```javascript
□ Make Next proxy to Express for /api/*
  // next.config.js
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  }

□ Verify all endpoints work through proxy
  - Test from browser
  - Cookies forward correctly
  - CORS not needed (same origin)

□ THEN delete Next.js /app/api folder
  - Only after proxy works
  - Keep the proxy, delete the routes
```

### Days 6-7: Fix Frontend Service Configuration
```javascript
□ Update apiService to handle unified API
  // Don't need to change every component!
  // Just fix the service:

  class ApiService {
    constructor(config) {
      // If running in browser, use relative URLs
      // If running in Node, use Express directly
      this.baseUrl = typeof window !== 'undefined'
        ? '' // Browser: use Next proxy
        : 'http://localhost:3001'; // SSR: direct to Express
    }
  }

□ Ensure cookies forward in all contexts
  - Browser → Next → Express (via proxy)
  - SSR → Express (direct)
  - Both use same session
```

### Days 8-10: Stabilize the Unified Architecture
```javascript
□ Remove all /api/* references from Next.js code
  - Delete middleware API matchers
  - Remove API route configs
  - Clean up unused imports

□ Verify every feature still works
  - Login flow
  - Data fetching
  - HubSpot OAuth
  - File uploads
  - Harvest sync

□ Document the final architecture
  Browser → Next.js (UI only) → Express (all APIs)
              ↓
          (proxy /api/*)
```

## Verification:
```bash
# No Next.js API routes exist
ls app/api/
# Should fail - directory deleted

# But /api/* still works (via proxy)
curl localhost:3000/api/health
# Returns OK from Express

# Frontend still works
# Click through every page
# No 404s, no 401s
```

---

# ✅ REVISED MILESTONE 3: STABILIZE FOR DEPLOY (Days 11-15)
**Goal: Fix real problems, not imaginary ones**

## Real Tasks:
### Days 11-12: Fix the Build Wrapper
```javascript
□ Debug scripts/run-next-build.js
  - It's setting lockfile env vars
  - Find out WHY it fails
  - Either fix it or bypass safely

□ Stabilize TypeScript/Webpack inputs
  - Fix type errors (there are some)
  - Resolve webpack warnings
  - Make build deterministic

□ Get CI green with REAL fixes
  - Don't skip all tests
  - Fix the actual failures
  - Keep the working tests
```

### Days 13-14: Add Integration Tests (Not Unit)
```javascript
□ Test the ACTUAL integration points:

// Test 1: Session flow works end-to-end
test('login creates usable session', async () => {
  const login = await request.post('/auth/login')
    .send({ username: 'test', password: 'test' });
  const cookie = login.headers['set-cookie'];

  const data = await request.get('/api/profitability')
    .set('Cookie', cookie);
  expect(data.status).toBe(200);
});

// Test 2: Harvest sync doesn't leak memory
test('harvest sync with 1000 entries', async () => {
  const before = process.memoryUsage().heapUsed;
  await syncHarvest(1000);
  const after = process.memoryUsage().heapUsed;
  expect(after - before).toBeLessThan(50_000_000); // 50MB max
});

// Test 3: HubSpot OAuth completes
// Test 4: Database pooling works
// Test 5: Circuit breaker triggers
```

### Day 15: Production Readiness Checklist
```bash
□ Verify Sentry actually reports (it's configured)
  - Check DSN is valid
  - Trigger test error
  - Confirm it appears in dashboard

□ Document the unified architecture
  - How auth really works
  - How APIs are routed
  - How to add new endpoints

□ Create honest runbook
  ## Known Issues (Real Ones)
  - Memory grows to ~400MB after 10k requests
  - HubSpot OAuth tokens expire without refresh
  - Rate limiting too strict (3 req/5 min)

  ## How to Deploy
  1. Set SESSION_SECRET (required!)
  2. Run migrations
  3. Start Express first
  4. Start Next with proxy config
```

---

# 🛡️ REVISED MILESTONE 4: OPERATIONAL REALITY (Days 16-21)
**Goal: Make it survivable in production**

## Real Tasks:
### Days 16-17: Smart Cache Management
```javascript
□ Preserve batching while adding limits
  // Don't break the optimization!
  class BoundedBatchCache {
    constructor(maxSize = 10000) {
      this.cache = new Map();
      this.maxSize = maxSize;
      this.hits = new Map(); // Track usage
    }

    set(key, value) {
      this.hits.set(key, Date.now());
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      this.cache.set(key, value);
    }

    evictLRU() {
      // Evict least recently used
      const sorted = Array.from(this.hits.entries())
        .sort((a, b) => a[1] - b[1]);
      const toEvict = sorted.slice(0, this.maxSize * 0.2);
      toEvict.forEach(([key]) => {
        this.cache.delete(key);
        this.hits.delete(key);
      });
    }
  }

□ Apply to all four Harvest caches
  - Maintain batching benefits
  - Prevent unbounded growth
  - Monitor cache performance
```

### Days 18-19: Production Safeguards
```javascript
□ Add circuit breaker to existing middleware
  // Use the rate limiter that exists:
  export const harvestCircuitBreaker =
    createCircuitBreaker(harvestConnector, {
      failureThreshold: 5,
      resetTimeout: 60000,
      fallback: () => ({ cached: true, data: lastKnownGood })
    });

□ Configure PM2 for auto-restart
  // ecosystem.config.js
  {
    apps: [{
      name: 'account-manager',
      script: 'npm',
      args: 'start',
      max_memory_restart: '500M',
      error_file: 'logs/error.log',
      out_file: 'logs/output.log'
    }]
  }

□ Add monitoring that matters
  - Memory usage over time
  - Cache hit/miss ratios
  - Session creation rate
  - API response times
```

### Days 20-21: Handoff Documentation
```markdown
□ Document what actually exists
  ## Architecture (Reality)
  - Next.js serves UI only
  - Express handles all APIs
  - Proxy forwards /api/* to Express
  - Session cookies for auth
  - Harvest connector with bounded cache

□ Migration guide for future
  ## To Add New API Endpoint
  1. Add to Express router only
  2. Will be available at /api/* via proxy
  3. Session auth automatic via middleware

  ## To Fix Memory Issues
  1. Check cache sizes first
  2. Clear if > 10000 entries
  3. Restart if > 500MB

□ Honest assessment
  ## What Works
  - Basic auth flow
  - Data fetching
  - Harvest sync (with limits)

  ## What's Fragile
  - HubSpot OAuth token refresh
  - Memory after extended use
  - Rate limiting (too strict)

  ## What Needs Rewrite
  - Entire auth system (for real JWT)
  - Frontend data flow (for SSR)
  - Test suite (for real coverage)
```

---

## 📊 Revised Success Metrics

### Week 1: Complete existing systems
- ✅ Session auth works end-to-end
- ✅ Memory bounded to 400MB
- ✅ Critical routes migrated to Express

### Week 2: Unify architecture
- ✅ Single API (Express via proxy)
- ✅ Frontend works unchanged
- ✅ HubSpot OAuth preserved

### Week 3: Stabilize for production
- ✅ Build passes (fixed wrapper)
- ✅ 5 integration tests (real ones)
- ✅ Auto-restart on high memory
- ✅ Honest documentation

---

## ⚠️ Critical Corrections from Analysis

1. **Don't rebuild auth** - Wire the existing session system
2. **Don't delete Next routes first** - Migrate, proxy, then delete
3. **Don't break Harvest batching** - Add smart eviction
4. **Don't skip all tests** - Fix the real failures
5. **Don't add new monitoring** - Configure existing Sentry

---

## 💊 The Reality-Based Truth

**This codebase is closer to C than it appears.**

It has:
- Partial session auth (finish it)
- Optimized connectors (add bounds)
- Health monitoring (verify it works)
- Error tracking (configure properly)

It needs:
- Complete the auth flow
- Unify the API layer
- Bound the memory usage
- Fix the build process

**Time to C: Still 3 weeks, but different work than imagined.**

---

*"The code is better than we thought, but also worse in different ways."*