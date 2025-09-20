# HubSpot API Key Setup Guide (Free/Starter Account)

## Method 1: Using API Key (for Free/Starter accounts)

### Getting Your HubSpot API Key

1. **Log in to HubSpot** with your demo account

2. **Navigate to Settings** (gear icon in the top right)

3. **Go to Integrations → API Key** in the left sidebar
   - If you don't see "API Key", look for:
     - "Integrations" → "API key"
     - "Account Setup" → "Integrations" → "API key"

4. **Generate or View API Key**:
   - If you see "Show key", click it to reveal your API key
   - If no key exists, click "Generate API key"
   - Copy the API key (it looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

⚠️ **Important**: The API key method is being deprecated by HubSpot but still works for existing integrations.

## Method 2: Create a Test App (Alternative)

1. **Go to HubSpot Developers**: https://developers.hubspot.com/
2. **Sign in** with your HubSpot account
3. **Create a Test App**:
   - Click "Manage apps" or "Create app"
   - Name it "Account Manager Tool Test"
4. **Get OAuth Credentials**:
   - Go to the "Auth" tab
   - Copy the "App ID" and "Client secret"
5. **Generate Access Token**:
   - In the "Testing" section
   - Click "Create test account" or use existing
   - Generate an access token for testing

## Adding Credentials to Your Project

### For API Key Method:
Add to your `.env.local` file:
```env
# HubSpot API Configuration (API Key method)
HUBSPOT_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

### For Access Token Method:
Add to your `.env.local` file:
```env
# HubSpot API Configuration (Access Token method)
HUBSPOT_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

## Testing Your Connection

1. **Verify the dev server is running**:
   ```bash
   npm run dev
   ```

2. **Open the HubSpot Dashboard**:
   http://localhost:3000/hubspot

3. **Click "Refresh"** on any tab to test the connection

## Troubleshooting

### If you get "API token not configured":
- Make sure you've added either `HUBSPOT_API_KEY` or `HUBSPOT_ACCESS_TOKEN` to `.env.local`
- Restart the dev server after adding environment variables

### If you get 401 Unauthorized:
- Check that your API key is correct
- Make sure you're using the right authentication method
- Try regenerating the API key in HubSpot

### If you get 403 Forbidden:
- Your account might not have access to certain features
- Try using basic endpoints first (contacts, companies)

### If no data appears:
1. Add sample data to your HubSpot account:
   - Go to Contacts → Create contact
   - Go to Companies → Create company
   - Go to Deals → Create deal
2. Or import sample data:
   - Contacts → Import → Download sample file

## API Limitations for Free Accounts

Free HubSpot accounts have:
- **Rate limits**: 100 requests per 10 seconds
- **Data limits**: Limited number of records
- **Feature limits**: Some advanced features unavailable

## Working Endpoints

Our integration uses these basic endpoints that work with free accounts:
- `/crm/v3/objects/contacts` - Contact management
- `/crm/v3/objects/companies` - Company data
- `/crm/v3/objects/deals` - Deal tracking

## Next Steps

1. Add your API key to `.env.local`
2. Test the connection at http://localhost:3000/hubspot
3. Add some sample data to your HubSpot account
4. Explore the dashboard functionality

## Need Help?

- HubSpot API Docs: https://developers.hubspot.com/docs/api/crm/contacts
- HubSpot Academy: https://academy.hubspot.com/
- Test your API key: https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=YOUR_API_KEY