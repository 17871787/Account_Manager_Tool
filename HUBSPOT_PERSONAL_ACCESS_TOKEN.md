# HubSpot Personal Access Token Setup

## Getting a Personal Access Token (Easier than API Key!)

### Step 1: Create a Developer Account (Free)

1. **Go to HubSpot Developers**:
   https://developers.hubspot.com/

2. **Sign in** with your existing HubSpot account

3. **You'll get access to**:
   - Developer dashboard
   - Ability to create apps
   - Test accounts with full API access

### Step 2: Create a Personal Access Token

1. **In the Developer Account**, go to:
   - **Settings** → **Personal Access Tokens**
   - Or visit: https://app.hubspot.com/developer-account/[YOUR_ID]/personal-access-tokens

2. **Create New Token**:
   - Click "Generate personal access token"
   - Name: "Account Manager Tool"
   - Select scopes:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.companies.read`
     - `crm.objects.companies.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`

3. **Copy the Token**:
   - It will look like: `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Save it immediately (you can't view it again!)

### Step 3: Update Your Configuration

Replace your API key with the Personal Access Token:

```env
# In .env.local
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

Remove or comment out the old API key:
```env
# HUBSPOT_API_KEY=eu1-808f-afd2-4f27-9a16-239889a88454
```

### Step 4: Test the Connection

1. Restart your dev server (Ctrl+C, then `npm run dev`)
2. Visit: http://localhost:3001/api/hubspot/test
3. You should see: "HubSpot connection successful!"

## Why Personal Access Tokens are Better

- ✅ **More permissions** than API keys
- ✅ **Granular scopes** - only request what you need
- ✅ **Works with v3 API** (modern endpoints)
- ✅ **Better security** - can be revoked anytime
- ✅ **No plan restrictions** - works with developer accounts

## Alternative: Use a Test Account

If you can't create a Personal Access Token:

1. **Create a test account**:
   - In Developer dashboard → "Test accounts"
   - Click "Create test account"
   - This gives you a full HubSpot account for testing

2. **Get API key from test account**:
   - Log into the test account
   - Settings → Integrations → API Key
   - This key will have full permissions

## Quick Test URLs

Once configured, test these:
- Connection test: http://localhost:3001/api/hubspot/test
- Dashboard: http://localhost:3001/hubspot
- Contacts API: http://localhost:3001/api/hubspot/contacts
- Companies API: http://localhost:3001/api/hubspot/companies
- Deals API: http://localhost:3001/api/hubspot/deals

## Troubleshooting

### Still getting 403 Forbidden?
- Make sure you selected all the CRM scopes when creating the token
- Try creating a new token with all available scopes
- Use a test account instead of your production account

### Can't find Personal Access Tokens?
- You need a developer account (free to create)
- Visit: https://developers.hubspot.com/get-started
- Sign up with your existing HubSpot login

### Token not working?
- Make sure you're using `HUBSPOT_ACCESS_TOKEN` not `HUBSPOT_API_KEY`
- The token should start with `pat-`
- Restart the dev server after changing .env.local