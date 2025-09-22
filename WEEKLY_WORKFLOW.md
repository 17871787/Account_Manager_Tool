# Weekly Workflow Guide

## 📅 Monday Morning Data Update

### Step 1: Export Data (5 mins)

#### HubSpot Export
1. Log in to HubSpot
2. Go to Contacts → All Contacts
3. Click Actions → Export
4. Select fields:
   - Company name
   - Deal amount
   - Close date
   - Deal stage
5. Download as CSV

#### Finance Forecast Export
1. Open your forecast spreadsheet
2. Save As → CSV format
3. Include columns:
   - Client name
   - Budgeted hours
   - Target revenue
   - Expected costs

### Step 2: Upload to Dashboard (2 mins)

1. Visit: https://am-copilot.vercel.app
2. Log in with:
   - Username: `joe`
   - Password: `demo2025`
3. Navigate to `/upload`
4. Drag & drop your CSV files:
   - HubSpot export → "CRM Data" box
   - Finance forecast → "Forecast Data" box
5. Click "Process Data"
6. Wait for confirmation message

### Step 3: Review Dashboard (10 mins)

1. Go to main dashboard
2. Check key metrics:
   - Total profitability %
   - Accounts below target
   - Hours vs budget
3. Review exceptions tab for:
   - Over-budget projects
   - Low margin accounts
   - Missing time entries
4. Export report if needed (PDF/CSV)

### Step 4: Share with Boss

#### Option A: Live Demo
- Share screen in Teams/Zoom
- Walk through dashboard
- Highlight key wins/concerns

#### Option B: Email Link
```
Subject: Weekly Profitability Update

Hi [Boss],

This week's profitability dashboard is ready:
https://am-copilot.vercel.app

Key highlights:
- Overall margin: X%
- Top performer: [Client]
- Needs attention: [Client]

Best,
Joe
```

## 🔄 Harvest API (Automatic)

The Harvest time tracking data syncs automatically every hour. No manual action needed unless you see a sync error.

### If Harvest Sync Fails:
1. Check `/api/health` for status
2. Verify Harvest token is valid
3. Manual sync: Click "Sync Now" button

## 📊 Monthly Tasks

### First Monday of Month
1. Export full month's data
2. Create monthly report
3. Archive previous month's CSVs
4. Update forecast spreadsheet

### Quarterly Review
1. Export 3-month trends
2. Compare to forecast
3. Adjust targets as needed

## 🚨 Troubleshooting

### CSV Upload Issues
- **"Invalid format"**: Check column headers match expected names
- **"Duplicate data"**: Clear previous upload first
- **"Missing required field"**: Ensure all columns have data

### Data Not Updating
1. Hard refresh: Ctrl+F5
2. Check upload timestamp
3. Re-upload if older than today

### Can't Access Dashboard
1. Check internet connection
2. Try incognito/private browser
3. Clear browser cache
4. Contact IT if Vercel is down

## 💡 Pro Tips

### Save Time
- Create Excel macros for exports
- Schedule calendar reminder for Monday upload
- Bookmark dashboard URL
- Save login in password manager

### Better Reports
- Add notes to exceptions before boss meeting
- Screenshot key charts for presentations
- Export PDF for email attachments
- Compare week-over-week trends

### Data Quality
- Clean client names (consistent spelling)
- Remove test data before upload
- Verify totals match source systems
- Keep backup of uploaded CSVs

## 📁 File Organization

Suggested folder structure:
```
/AM_Copilot_Data
  /2025
    /September
      - hubspot_2025-09-22.csv
      - forecast_2025-09-22.csv
      - notes.txt
    /October
      ...
```

## 🔐 Security Notes

- Never share your password
- Log out when done (especially on shared computers)
- Don't upload sensitive client data
- Use company VPN when possible

---

**Questions?** Check `/PROJECT_STATUS_SUMMARY.md` or message Joe

*Last updated: September 22, 2025*