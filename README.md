# Account Manager Tool - Personal Profitability Dashboard

Simple profitability tracking dashboard for dairy account management.

## 🚀 Live Demo

**Production URL**: [https://am-copilot.vercel.app](https://am-copilot.vercel.app)
- **Username**: joe
- **Password**: demo2025

## Overview

Personal tool for tracking account profitability with weekly CSV uploads (HubSpot exports, Finance forecasts) and Harvest time tracking integration.

## Use Case

- **User**: Single account manager (Joe)
- **Data Sources**:
  - Weekly HubSpot CSV exports
  - Harvest API (time tracking)
  - Finance forecast spreadsheets
- **Purpose**: Track account profitability and demonstrate to boss via Vercel URL

## Quick Start

### Weekly Workflow

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

## Tech Stack

- **Framework**: Next.js 14
- **Database**: PostgreSQL (or JSON for simplicity)
- **Hosting**: Vercel
- **Auth**: Simple session-based with hardcoded fallback

## Development

```bash
# Install
npm install

# Run locally
npm run dev
# Open http://localhost:3000

# Deploy
git push origin main
# Vercel auto-deploys
```

## Documentation

- [Weekly Workflow Guide](./WEEKLY_WORKFLOW.md) - Step-by-step Monday routine
- [Project Status](./PROJECT_STATUS_SUMMARY.md) - Current development status
- [Simon Willison Approach](./SIMON_WILLISON_APPROACH.md) - Alternative pragmatic architecture
- [Claude x Codex Collaboration](./CLAUDE_CODEX_COLLABORATION.md) - How AI tools work together

## Repository

- **GitHub**: https://github.com/17871787/Account_Manager_Tool
- **Production**: https://am-copilot.vercel.app

---

*Personal profitability tracking tool - not enterprise software*
