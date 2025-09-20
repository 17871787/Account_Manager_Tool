# HubSpot OAuth Setup Guide

## Complete OAuth Integration Setup

### Step 1: Create a HubSpot App

1. **Go to HubSpot Developers Portal**
   - Visit: https://developers.hubspot.com/
   - Sign in with your HubSpot account

2. **Create a New App**
   - Click "Create app" or "Manage apps" → "Create app"
   - App name: "Account Manager Tool"
   - Description: "OAuth integration for Account Manager Tool"

3. **Configure App Settings**

   **Basic Info Tab:**
   - App name: Account Manager Tool
   - App logo: (optional)

   **Auth Tab:**
   - Find your **App ID** (Client ID)
   - Find your **Client secret**
   - Add Redirect URL:
     - For local development: `http://localhost:3000/api/hubspot/oauth/callback`
     - For production: `https://am-copilot.vercel.app/api/hubspot/oauth/callback`

   **Scopes Tab - Select these permissions:**
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.companies.read`
   - `crm.objects.companies.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`

### Step 2: Add Credentials to Your Project

Add to your `.env.local` file:

```env
# HubSpot OAuth Configuration
HUBSPOT_CLIENT_ID=your-app-id-here
HUBSPOT_CLIENT_SECRET=your-client-secret-here
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/oauth/callback

# Optional: Set your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update the redirect URI:
```env
HUBSPOT_REDIRECT_URI=https://am-copilot.vercel.app/api/hubspot/oauth/callback
NEXT_PUBLIC_APP_URL=https://am-copilot.vercel.app
```

### Step 3: Connect Your HubSpot Account

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Go to the Connect page**:
   http://localhost:3000/hubspot/connect

3. **Click "Connect with HubSpot"**
   - You'll be redirected to HubSpot
   - Approve the permissions
   - You'll be redirected back with your tokens

4. **Success!**
   - Your tokens will be automatically saved to `.env.local`
   - You can now access the dashboard at `/hubspot`

## OAuth Flow Explained

1. **Authorization**: User clicks connect → Redirected to HubSpot
2. **Consent**: User approves permissions on HubSpot
3. **Callback**: HubSpot redirects back with authorization code
4. **Token Exchange**: We exchange the code for access/refresh tokens
5. **Storage**: Tokens are saved and used for API calls

## Available Endpoints

### OAuth Endpoints:
- `GET /api/hubspot/oauth/authorize` - Starts OAuth flow
- `GET /api/hubspot/oauth/callback` - Handles OAuth callback
- `POST /api/hubspot/oauth/refresh` - Refresh expired token (optional)

### API Endpoints (after authentication):
- `GET /api/hubspot/contacts` - Fetch contacts
- `POST /api/hubspot/contacts` - Create contact
- `GET /api/hubspot/companies` - Fetch companies
- `GET /api/hubspot/deals` - Fetch deals
- `GET /api/hubspot/test` - Test connection

## Token Management

### Access Token:
- Expires after 6 hours
- Used for all API requests
- Format: `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Refresh Token:
- Used to get new access tokens
- Never expires (unless revoked)
- Should be stored securely

### Automatic Token Refresh (Optional):
```typescript
// Example token refresh logic
if (tokenExpired) {
  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      refresh_token: process.env.HUBSPOT_REFRESH_TOKEN,
    }),
  });
}
```

## Testing the Integration

1. **Test Connection**:
   ```bash
   curl http://localhost:3000/api/hubspot/test
   ```

2. **View Dashboard**:
   http://localhost:3000/hubspot

3. **Direct API Test**:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://api.hubapi.com/crm/v3/objects/contacts?limit=1
   ```

## Troubleshooting

### "Client ID not configured"
- Add `HUBSPOT_CLIENT_ID` to `.env.local`
- Restart the dev server

### "Invalid grant"
- The authorization code expired (they're only valid for a few minutes)
- Start the OAuth flow again

### "Invalid redirect URI"
- Make sure the redirect URI in your app matches exactly
- Check for http vs https
- Check for trailing slashes

### "Insufficient scopes"
- Go back to your app settings
- Add the required scopes
- Reconnect your account

## Security Best Practices

1. **Never commit tokens to git**
   - Keep `.env.local` in `.gitignore`

2. **Use environment variables**
   - Different tokens for dev/staging/production

3. **Implement token refresh**
   - Don't let access tokens expire during use

4. **Validate state parameter**
   - Prevents CSRF attacks

5. **Use HTTPS in production**
   - OAuth requires secure connections

## Production Deployment

For Vercel deployment:

1. **Add environment variables**:
   ```bash
   vercel env add HUBSPOT_CLIENT_ID
   vercel env add HUBSPOT_CLIENT_SECRET
   vercel env add HUBSPOT_REDIRECT_URI
   ```

2. **Update redirect URI** in HubSpot app settings:
   ```
   https://am-copilot.vercel.app/api/hubspot/oauth/callback
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## Quick Links

- HubSpot Developers: https://developers.hubspot.com/
- OAuth Documentation: https://developers.hubspot.com/docs/api/oauth-quickstart-guide
- API Documentation: https://developers.hubspot.com/docs/api/crm/contacts
- Your Apps: https://app.hubspot.com/developer/[YOUR_ACCOUNT_ID]/applications