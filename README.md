# MoA Account Manager AI (AM Copilot)

AI-assisted profitability and billing management system for Map of Ag Account Managers.

## Overview

This tool provides:
- Live profitability views per customer/project
- Automated exception detection and workflow
- Integration with Harvest time tracking and SFT revenue data
- Invoice-ready export generation
- Budget vs burn dashboards

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, TailwindCSS
- **Database**: PostgreSQL
- **Integrations**: Harvest API, Microsoft Graph API
- **AI**: OpenAI GPT-4 for narrative generation (Phase 2)

## Project Structure

```
/src
  /api         - API endpoints and controllers
  /connectors  - External API integrations (Harvest, SFT)
  /models      - Data models and schemas
  /services    - Business logic and calculations
  /rules       - Exception detection and rules engine
  /dashboard   - React dashboard components
  /utils       - Utility functions
/config        - Configuration files
/scripts       - Database setup and migration scripts
/tests         - Test files
```

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Run database migrations: `npm run migrate`
4. Start development server: `npm run dev`

## Phase 1 MVP Features

- Harvest data ingestion
- SFT revenue integration
- Profitability calculations
- Exception detection
- Budget vs burn dashboards
- Invoice-ready CSV exports
