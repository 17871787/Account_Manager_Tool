# HubSpot Quick Setup Guide

## Fastest Way to Get Your API Credentials

### Option 1: Get API Key from HubSpot Settings (Easiest)

1. **Log into HubSpot**: https://app.hubspot.com/

2. **Go to Settings** → Click the gear icon (⚙️) in the top navigation

3. **Find API Key**:
   - Look in the left sidebar for **"Integrations"**
   - Click on **"API Key"**
   - Or try: **Account Defaults → Integrations → API Key**

4. **Get Your Key**:
   - Click **"Show"** if a key exists
   - Or click **"Generate API key"** if none exists
   - Copy the key (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

5. **Add to `.env.local`**:
   ```env
   HUBSPOT_API_KEY=paste-your-key-here
   HUBSPOT_API_BASE_URL=https://api.hubapi.com
   ```

### Option 2: Create Developer Account (More Features)

1. **Go to**: https://developers.hubspot.com/
2. **Sign in** with your HubSpot account
3. **Create an app**:
   - Click "Create app"
   - Name: "Account Manager Tool"
4. **Get credentials**:
   - Go to "Auth" tab
   - Copy the test access token

### Option 3: Use HubSpot CLI (If Installed)

```bash
# Initialize HubSpot CLI
npx hs init

# Authenticate
npx hs auth

# List accounts
npx hs accounts list
```

## Test Your Connection

### Quick Test in Browser:
Once you have your API key, test it by visiting:
```
http://localhost:3000/api/hubspot/test
```

This will show:
- ✅ Success message if connected
- ❌ Error details if something's wrong

### Manual Test with API Key:
Test your API key directly in the browser:
```
https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=YOUR_API_KEY&count=1
```

## If You Can't Find API Key in Settings

Some accounts show different options:

1. **Look for "Developers"** section in settings
2. **Check "Account Setup"** → "Integrations"
3. **Try "Marketing"** → "Settings" → "Integrations"

## Quick Troubleshooting

### "API token not configured" error:
- Make sure `.env.local` file has your key
- Restart the dev server: `Ctrl+C` then `npm run dev`

### "401 Unauthorized" error:
- Your API key might be wrong
- Try regenerating it in HubSpot

### No data showing:
- Add test contacts in HubSpot first
- Go to Contacts → Create contact → Add a few test entries

## Working Example

Your `.env.local` should look like:
```env
# Other settings...
HARVEST_ACCOUNT_ID=2043425
HARVEST_ACCESS_TOKEN=4090366.pt...

# Add your HubSpot API Key here:
HUBSPOT_API_KEY=eu1-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

## Ready to Test?

1. Add your API key to `.env.local`
2. Restart dev server if needed
3. Visit: http://localhost:3000/hubspot
4. Click "Refresh" to load your data

That's it! The integration will automatically use your API key.