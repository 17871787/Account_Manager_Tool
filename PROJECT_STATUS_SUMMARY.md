# Project Status Summary - Account Manager Tool

## Executive Summary
Personal profitability dashboard for tracking dairy account performance. Designed for weekly data uploads (HubSpot CSV, Harvest API, Finance spreadsheets) with a Vercel-hosted dashboard for demonstrating to management.

## Current Status: Development/Proof of Concept
Working infrastructure ready for simplified single-user workflow.

## Use Case
- **User**: Single account manager (Joe)
- **Data Sources**:
  - Weekly HubSpot CSV exports
  - Harvest API (time tracking)
  - Finance forecast spreadsheets
- **Purpose**: Track account profitability and demonstrate to boss via Vercel URL

## Work Completed Today (Sept 22, 2025)

### 1. Fixed Missing API Routes ✅
- Added `/api/profitability/portfolio/[month]`
- Added `/api/clients`, `/api/projects`, `/api/exceptions/pending`
- Eliminated 404 errors in production

### 2. Fixed Deployment Pipeline ✅
- Vercel deployments working again
- Manual deployment successful
- Production URL accessible: https://am-copilot.vercel.app

### 3. Environment Configuration ✅
- Set AUTH_USERNAME, AUTH_PASSWORD, SESSION_SECRET in Vercel
- Created health check endpoint to verify env vars
- Authentication system configured (pending simplified credentials)

### 4. Infrastructure Status ✅
- Build passing
- Routes responding
- Deployment automated via GitHub push

## Current Architecture

### Simplified Data Flow
```
Weekly CSV Upload → Parse → Store → Dashboard → Share with Boss
        ↑                      ↓
   HubSpot Data          PostgreSQL/JSON
   Finance Data

Harvest API → Direct Integration
```

### Key Files
- `/app/api/auth/login/route.ts` - Authentication (to be simplified)
- `/app/api/health/route.ts` - System health check
- `/app/api/upload/*` - CSV upload endpoints (to be created)
- `/middleware.ts` - Auth middleware

## Next Steps for Personal Use

### Immediate (Make It Work)
1. Hardcode simple login credentials
2. Create CSV upload pages
3. Test with real data

### This Week
1. Upload page for HubSpot CSV
2. Upload page for Finance spreadsheet
3. Simple dashboard showing key metrics
4. Remove unnecessary complexity

### Nice to Have
1. Automated Harvest sync
2. Weekly email summary
3. Trend charts

## Deployment Commands

### Local Development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Deploy to Vercel
```bash
git add .
git commit -m "Update"
git push origin main
# Or manual deploy:
npx vercel --prod --yes
```

### Environment Variables (Vercel)
```bash
# Add env var
echo "value" | npx vercel env add VAR_NAME production

# List env vars
npx vercel env ls production

# Remove env var
npx vercel env rm VAR_NAME production --yes
```

## Weekly Workflow

1. **Monday Morning**
   - Export HubSpot data to CSV
   - Export finance forecast to CSV
   - Visit am-copilot.vercel.app/upload

2. **Upload Data**
   - Drag & drop CSVs
   - Verify data loaded

3. **Review Dashboard**
   - Check profitability metrics
   - Note any exceptions

4. **Share with Boss**
   - Send link: am-copilot.vercel.app
   - Dashboard shows latest data

## Repository Information
- **GitHub**: https://github.com/17871787/Account_Manager_Tool
- **Production**: https://am-copilot.vercel.app
- **Framework**: Next.js 14
- **Database**: PostgreSQL (or JSON files for simplicity)
- **Hosting**: Vercel

## Notes
- This is a personal tool, not enterprise software
- Optimized for weekly manual updates
- Simple authentication for demo purposes
- Focus on working quickly vs perfect architecture

---

*Last Updated: September 22, 2025*
*Purpose: Personal profitability tracking with boss-friendly dashboard*