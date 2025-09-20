import { NextRequest, NextResponse } from "next/server";

// Initiate OAuth flow - redirect user to HubSpot authorization
export async function GET(req: NextRequest) {
  const clientId = process.env.HUBSPOT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "HubSpot Client ID not configured" },
      { status: 500 }
    );
  }

  // Build redirect URI (must match what's configured in HubSpot app)
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hubspot/oauth/callback`;

  // Scopes we're requesting
  const scopes = [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write'
  ].join(' ');

  // Optional state parameter for security
  const state = Math.random().toString(36).substring(7);

  // Build HubSpot authorization URL
  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  // Store state in cookie for verification (optional but recommended)
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('hubspot_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  });

  return response;
}