# HubSpot Simple Setup - API Key Method

## Finding Your API Key in HubSpot (Free/Starter Plan)

### Method 1: Direct Link
Try this direct link to your API key settings:
**https://app.hubspot.com/integrations-settings/[YOUR_ACCOUNT_ID]/api-key**

(Replace [YOUR_ACCOUNT_ID] with your actual account ID from your HubSpot URL)

### Method 2: Navigate Through Settings

1. **Log into HubSpot**: https://app.hubspot.com/

2. **Look for API Key in these locations:**

   **Option A:**
   - Settings (⚙️) → Integrations → API Key

   **Option B:**
   - Settings (⚙️) → Account Setup → Integrations → API Key

   **Option C:**
   - Settings (⚙️) → Connected Apps → Look for "API Key" section

   **Option D (if you have Marketing Hub):**
   - Marketing → Settings → Integrations → API Key

3. **Once you find the API Key page:**
   - Click "Show" to reveal existing key
   - OR click "Generate API key" if none exists
   - Copy the key (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Method 3: Account Defaults
Sometimes it's hidden under:
- Settings → Properties & Data → Integrations
- Settings → Account Defaults → Integrations

## Add Your API Key

Once you have your API key, add it to `.env.local`:

```env
# HubSpot API Configuration
HUBSPOT_API_KEY=paste-your-key-here
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

Example:
```env
HUBSPOT_API_KEY=eu1-1234-5678-90ab-cdefghijklmn
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

## Test Your Connection

### Quick Test 1 - In Browser:
Visit this URL (with your dev server running):
```
http://localhost:3000/api/hubspot/test
```

You should see:
```json
{
  "success": true,
  "message": "HubSpot connection successful!",
  "authMethod": "API Key"
}
```

### Quick Test 2 - Direct API:
Test your API key directly by pasting this URL in your browser:
```
https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=YOUR_API_KEY&count=1
```
(Replace YOUR_API_KEY with your actual key)

## View Your Dashboard

Once connected:
1. Visit http://localhost:3000/hubspot
2. Click "Refresh" on any tab
3. Your data should load!

## If You Can't Find API Key

The API Key option might be:
- Disabled on some very new accounts
- Replaced with "Private Apps" on higher-tier plans
- Hidden under different menu names

### Alternative Options:

1. **Use HubSpot CLI** (if you have npm):
   ```bash
   npx @hubspot/cli auth
   ```
   This will guide you through authentication

2. **Contact HubSpot Support**:
   - Use the help button (?) in HubSpot
   - Ask them how to get API access for your plan

3. **Try the Test Portal**:
   - HubSpot offers test accounts for developers
   - Visit: https://developers.hubspot.com/get-started
   - Create a test account with full API access

## Common Issues & Fixes

### "API token not configured"
✅ Fix: Make sure you saved `.env.local` and restarted the dev server

### "401 Unauthorized"
✅ Fix: Your API key might be incorrect. Try regenerating it in HubSpot

### "403 Forbidden"
✅ Fix: Your plan might have API limitations. Try basic endpoints first

### No data showing
✅ Fix: Add some test data in HubSpot first:
- Go to Contacts → Create contact
- Add 2-3 test contacts
- Refresh the dashboard

## Working Code Example

Here's exactly what your `.env.local` should look like:

```env
# Your existing Harvest config
HARVEST_ACCOUNT_ID=2043425
HARVEST_ACCESS_TOKEN=4090366.pt.yqO3ghkJ_vFDTwgI-XjRNu9Kzssh6fwJvzqEHQtopbfe51H1eHV74plyZEO_WhLV-kN9GCpb0apWMRrqGoJLog

# Add your HubSpot API Key here
HUBSPOT_API_KEY=your-actual-api-key-here
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

## Still Need Help?

1. **Screenshot the error** you're seeing
2. **Check HubSpot's help docs**: https://knowledge.hubspot.com/
3. **Try HubSpot Academy**: Free courses on using HubSpot APIs

The integration will work with just the API key - no OAuth needed!