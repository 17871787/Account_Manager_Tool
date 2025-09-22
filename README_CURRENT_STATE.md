# Account Manager Tool - Current State (Sept 2025)

## ⚠️ Critical Status

**This codebase is undergoing emergency fixes and architectural overhaul.**

- **CI/CD Status**: ❌ 270+ consecutive failures
- **Security Status**: 🔥 CRITICAL - API keys exposed
- **Memory Status**: ✅ FIXED - Bounded caches implemented
- **Build Status**: ✅ WORKS - Use `npx next build`
- **Auth Status**: ✅ IMPLEMENTED - JWT system ready

---

## 🚨 Immediate Actions Required

### 1. Deploy Security Fixes (TODAY)
```bash
# Replace leaking connector
sed -i 's/OptimizedHarvestConnector/BoundedHarvestConnector/g' src/api/sync/routes.optimized.ts

# Deploy secure middleware
mv middleware.ts middleware.old.ts
mv middleware.secure.ts middleware.ts

# Run user table migration
psql $DATABASE_URL < scripts/migrations/002_create_users_table.sql

# Remove exposed API keys
grep -r "NEXT_PUBLIC_API_KEY" . --exclude-dir=node_modules
# Delete all occurrences
```

### 2. Environment Variables
```env
# REMOVE THESE (security vulnerability)
NEXT_PUBLIC_API_KEY=xxxx  # DELETE THIS LINE
INTERNAL_API_KEY=yyyy      # DELETE THIS LINE

# ADD THESE (required for auth)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production

# EXISTING (keep these)
HARVEST_ACCESS_TOKEN=xxx
HARVEST_ACCOUNT_ID=xxx
DATABASE_URL=postgresql://...
```

---

## 📦 Recent Fixes (Sept 2025)

### Memory Leak - FIXED ✅
- **Problem**: Unbounded caches causing crashes
- **Solution**: LRU cache with 10k limit and 1hr TTL
- **Files**:
  - `src/utils/lru-cache.ts`
  - `src/connectors/harvest.connector.bounded.ts`

### Authentication - IMPLEMENTED ✅
- **Problem**: API keys exposed in browser
- **Solution**: JWT auth with secure cookies
- **Files**:
  - `src/auth/jwt-auth.ts`
  - `app/api/auth/login/route.ts`
  - `middleware.secure.ts`

### Build Process - WORKING ✅
- **Problem**: npm run build fails on Windows
- **Workaround**: Use `npx next build`
- **Dependencies**: jsonwebtoken, bcrypt installed

---

## 🏗️ Architecture Issues

### Current Problems:
1. **Dual API Architecture**: Next.js and Express both handling /api/*
2. **No Real Tests**: 50 tests that only test mocks
3. **CI/CD Broken**: 270+ failures ignored
4. **Rate Limiting**: Too restrictive (3 req/5 min)

### Recommended Solution:
**Path 3: Parallel Development** (see `WHERE_DO_WE_GO_FROM_HERE.md`)
- Emergency fixes for current system (3 weeks)
- Build new system in parallel (8 weeks)
- Migrate when ready (2 weeks)

---

## 📚 Documentation Structure

### Critical Documents:
- `RESURRECTION_PLAN.md` - Original 5-week plan
- `FINAL_CODEBASE_ASSESSMENT.md` - Current state analysis
- `WHERE_DO_WE_GO_FROM_HERE.md` - Three paths forward
- `CODEX_ROADMAP.md` - Parallel development plan
- `FIXES_COMPLETED_SUMMARY.md` - What was just fixed

### Obsolete Documents:
- `CRITICAL_ISSUES_SUMMARY.md` - Superseded by FINAL_CODEBASE_ASSESSMENT.md
- `CODE_REVIEW_LESSONS.md` - Historical, see RECENT_PRS_ANALYSIS.md

---

## 🚀 Quick Start (Development)

```bash
# Clone repository
git clone https://github.com/17871787/Account_Manager_Tool.git
cd Account_Manager_Tool

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
npm run migrate

# Start development servers
npm run dev          # Next.js on :3000
npm run api-dev      # Express on :3001

# Build for production
npx next build       # Note: npm run build broken on Windows
```

---

## 🧪 Testing

```bash
# Run tests (WARNING: all mocked)
npm test

# Real integration test (manual)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
# Should return JWT token
```

---

## 📊 Metrics

### Code Quality: D+
- Security: F → C (after fixes deployed)
- Architecture: D (dual APIs)
- Testing: F (all mocked)
- Operations: F (CI broken)

### Technical Debt:
- 270+ CI failures
- Dual API architecture
- No real tests
- Memory leaks (fixed but not deployed)
- Auth system (built but not deployed)

---

## 🛣️ Roadmap

### Week 1: Emergency Fixes
- [ ] Deploy memory leak fix
- [ ] Deploy JWT authentication
- [ ] Remove API key exposure
- [ ] Make CI green (even if hacky)

### Week 2-3: Stabilization
- [ ] Unify to single API (Express)
- [ ] Add 5 real integration tests
- [ ] Fix rate limiting
- [ ] Document everything

### Week 4+: New System
- [ ] Start fresh codebase
- [ ] Proper architecture from day 1
- [ ] Real tests from day 1
- [ ] Migrate when ready

---

## ⚠️ Known Issues

### Critical:
1. **API keys in browser** - Use JWT auth instead
2. **Memory leaks** - Deploy BoundedHarvestConnector
3. **No real auth** - Deploy JWT system

### Important:
1. **CI/CD broken** - 270+ failures
2. **Dual APIs** - Conflicts and confusion
3. **Tests are fake** - All mocked

### Minor:
1. **npm build script** - Use npx on Windows
2. **Rate limiting** - Too restrictive
3. **HubSpot OAuth** - Tokens expire

---

## 👥 Contributors

- Joe Towers - Original development
- Codex - Attempted fixes (10+ PRs)
- Claude - Emergency fixes and analysis

---

## 📝 License

UNLICENSED - Proprietary

---

## 🆘 Help

- Issues: https://github.com/17871787/Account_Manager_Tool/issues
- CI/CD: https://github.com/17871787/Account_Manager_Tool/actions

---

*Last updated: September 22, 2025*
*Status: Under emergency repair*
*Recommendation: Deploy fixes, then rebuild*