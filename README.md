# AM Copilot - Account Manager Profitability Dashboard

AI-powered profitability tracking and billing management system for Map of Ag's dairy industry clients.

## 🚀 Live Demo

**Production URL**: [https://am-copilot.vercel.app](https://am-copilot-dp2gps1l8-joe-towers-projects.vercel.app)

## Overview

AM Copilot provides real-time profitability insights and automated exception management for account managers working with major dairy industry clients including Arla, Saputo, Aldi, Long Clawson, Crediton, Lactalis, and Leprino.

### Key Features

- 📊 **Live Profitability Tracking** - Real-time margin analysis per client/project
- 🚨 **Automated Exception Detection** - Intelligent alerts for budget breaches, rate mismatches, and unbilled hours
- 💰 **Revenue & Cost Analysis** - Comprehensive financial metrics with trend visualization
- 📈 **Interactive Dashboards** - Dynamic charts showing revenue trends, client distribution, and budget utilization
- 🔄 **API Integrations** - Seamless sync with Harvest (time tracking) and HubSpot (CRM)
- 📋 **Export Capabilities** - Invoice-ready reports and CSV exports
- 🎯 **Budget vs Actual Tracking** - Visual indicators for budget utilization and burn rates

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: Radix UI Themes
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **API Integrations**: 
  - Harvest API v2 (time tracking)
  - HubSpot API (CRM data)
  - Microsoft Graph API (SharePoint/Teams)
- **Error Tracking**: Sentry
- **Testing**: Jest

### Infrastructure
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions
- **Code Quality**: SonarCloud
- **Performance**: Lighthouse CI

## Project Structure

```
/app              - Next.js app router pages
  page.tsx        - Main dashboard with tabs for Overview, Profitability, Exceptions, Clients
  layout.tsx      - Root layout with Radix UI theme

/src
  /api            - Express API routes
    /sync         - Harvest/HubSpot sync endpoints
    /export       - Invoice and report generation
  /connectors     - External API integrations
    harvest.ts    - Harvest time tracking integration
    hubspot.ts    - HubSpot CRM integration
    sft.ts        - SharePoint/Teams integration
  /models         - Database models and schemas
  /services       - Business logic
    profitability.service.ts - Margin calculations
    export.service.ts        - Report generation
    mockData.ts              - Demo data for prototype
  /rules          - Exception detection engine
  /types          - TypeScript type definitions
  /utils          - Utility functions

/scripts          - Database setup and migrations
/tests            - Test suites
```

## Dashboard Views

### 1. Overview Tab
- Key metrics cards (Revenue, Profit, Margin, Hours)
- Revenue & profit trend chart (30-day view)
- Client revenue distribution pie chart

### 2. Profitability Tab
- Detailed client profitability table
- Budget utilization progress bars
- Color-coded margin indicators
- Average hourly rates per client

### 3. Exceptions Tab
- Active alerts with severity badges (High/Medium/Low)
- Approve/Reject actions for each exception
- Exception types: Budget breach, Rate mismatch, Unbilled hours, Low utilization

### 4. Clients Tab
- Individual client cards with key metrics
- Quick access to client details
- Profitability summary per client

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Harvest account with API access
- HubSpot account (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/17871787/Account_Manager_Tool.git
cd Account_Manager_Tool

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and database credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/am_copilot

# API Keys
HARVEST_ACCESS_TOKEN=your_harvest_token
HARVEST_ACCOUNT_ID=your_account_id
HUBSPOT_API_KEY=your_hubspot_key

# Optional
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development

```bash
# Run frontend and backend concurrently
npm run dev

# Run tests
npm test

# Watch tests on change
npm run test:watch

# Generate coverage reports
npm run test:coverage

# Type checking
npm run typecheck

# Check for lint issues
npm run lint

# Automatically fix lint problems
npm run lint:fix

# Build for production
npm run build
```

## Deployment

The application is configured for automatic deployment to Vercel:

1. Push to `main` branch triggers production deployment
2. Pull requests create preview deployments
3. GitHub Actions run tests and quality checks

## Current Status

✅ **Phase 1 Complete** - Core dashboard with mock data
- Interactive profitability dashboard
- Exception management system
- Client portfolio view
- Mock data integration

🚧 **Phase 2 In Progress** - API Integration
- Harvest API connector improvements
- HubSpot data synchronization
- Real-time data updates

📋 **Phase 3 Planned** - Advanced Features
- AI-powered insights with GPT-4
- Automated report generation
- Predictive profitability analysis
- Mobile responsive design

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - Map of Ag Internal Use Only

## Support

For questions or issues, contact the Map of Ag development team.
