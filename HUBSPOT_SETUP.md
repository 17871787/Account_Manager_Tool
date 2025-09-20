# HubSpot API Setup Guide

## Getting Your HubSpot Private App Access Token

1. **Log in to HubSpot** with your demo account
2. **Navigate to Settings** (gear icon in the top right)
3. **Go to Integrations → Private Apps** in the left sidebar
4. **Create a Private App**:
   - Click "Create a private app"
   - Give it a name (e.g., "Account Manager Tool")
   - Add a description

5. **Set Scopes** - Enable these permissions:
   - **CRM**:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.companies.read`
     - `crm.objects.companies.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`
   - **Optional** (for full functionality):
     - `crm.objects.owners.read`
     - `crm.schemas.contacts.read`
     - `crm.schemas.companies.read`
     - `crm.schemas.deals.read`

6. **Create the App** and copy the **Access Token**

## Adding Credentials to Your Project

Add the following to your `.env.local` file:

```env
# HubSpot API Configuration
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

Replace `pat-na1-xxxxxxxx...` with your actual access token.

## Testing the Integration

1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to HubSpot Dashboard**:
   - Open http://localhost:3000/hubspot
   - Click the "Refresh" button to load data
   - Switch between Contacts, Companies, and Deals tabs

## API Endpoints Available

- **GET /api/hubspot/contacts** - Fetch contacts
- **POST /api/hubspot/contacts** - Create a new contact
- **GET /api/hubspot/companies** - Fetch companies
- **GET /api/hubspot/deals** - Fetch deals

## Query Parameters

All GET endpoints support:
- `limit` - Number of records to fetch (default: 10, max: 100)
- `after` - Pagination cursor for next page
- `properties` - Comma-separated list of properties to include

Example:
```
/api/hubspot/contacts?limit=50&properties=email,firstname,lastname,company
```

## Troubleshooting

1. **401 Unauthorized Error**: Check that your access token is correct
2. **403 Forbidden**: Ensure your private app has the required scopes
3. **Rate Limiting**: HubSpot has rate limits (100 requests per 10 seconds)
4. **No Data Showing**: Make sure you have data in your HubSpot demo account

## Adding Sample Data to HubSpot

If your demo account is empty:
1. Go to HubSpot → Contacts
2. Click "Create contact" or "Import"
3. Add sample contacts, companies, and deals
4. Or use HubSpot's sample data generator if available

## Next Steps

- Customize the dashboard layout
- Add filtering and search capabilities
- Implement create/edit functionality
- Add data export features
- Integrate with other parts of the Account Manager Tool