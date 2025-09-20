import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Handle OAuth callback from HubSpot
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code received" },
        { status: 400 }
      );
    }

    // Verify state if we're using it
    const storedState = req.cookies.get('hubspot_oauth_state')?.value;
    if (storedState && state !== storedState) {
      return NextResponse.json(
        { error: "State mismatch - possible CSRF attack" },
        { status: 400 }
      );
    }

    // Exchange code for access token
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hubspot/oauth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "HubSpot OAuth credentials not configured" },
        { status: 500 }
      );
    }

    // Make token exchange request
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Failed to exchange code for token", details: errorText },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    // Save tokens to .env.local (for development)
    // In production, you'd save this to a database or secure storage
    if (process.env.NODE_ENV === 'development') {
      const envPath = path.join(process.cwd(), '.env.local');
      try {
        let envContent = await fs.readFile(envPath, 'utf-8');

        // Update or add tokens
        const updates = {
          'HUBSPOT_ACCESS_TOKEN': tokenData.access_token,
          'HUBSPOT_REFRESH_TOKEN': tokenData.refresh_token,
        };

        for (const [key, value] of Object.entries(updates)) {
          const regex = new RegExp(`^${key}=.*$`, 'gm');
          if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
          } else {
            envContent += `\n${key}=${value}`;
          }
        }

        await fs.writeFile(envPath, envContent);
      } catch (error) {
        console.error("Failed to update .env.local:", error);
      }
    }

    // Create success HTML page
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>HubSpot OAuth Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .success-card {
              background: white;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            .success-icon {
              font-size: 60px;
              margin-bottom: 20px;
            }
            h1 {
              color: #2d3748;
              margin-bottom: 10px;
            }
            p {
              color: #718096;
              margin-bottom: 30px;
            }
            .token-info {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
              font-family: monospace;
              font-size: 12px;
              word-break: break-all;
            }
            .button {
              display: inline-block;
              background: #4299e1;
              color: white;
              padding: 12px 30px;
              border-radius: 5px;
              text-decoration: none;
              margin: 10px;
            }
            .button:hover {
              background: #3182ce;
            }
          </style>
        </head>
        <body>
          <div class="success-card">
            <div class="success-icon">✅</div>
            <h1>HubSpot Connected Successfully!</h1>
            <p>Your HubSpot account has been connected. You can now access your CRM data.</p>

            <div class="token-info">
              <strong>Access Token:</strong> ${tokenData.access_token.substring(0, 20)}...<br><br>
              <strong>Refresh Token:</strong> ${tokenData.refresh_token ? tokenData.refresh_token.substring(0, 20) + '...' : 'N/A'}<br><br>
              <strong>Expires In:</strong> ${tokenData.expires_in} seconds
            </div>

            <p style="color: #48bb78; font-weight: bold;">
              ✓ Tokens have been saved to your .env.local file
            </p>

            <a href="/hubspot" class="button">Go to HubSpot Dashboard</a>
            <a href="/api/hubspot/test" class="button">Test Connection</a>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      {
        error: "OAuth callback failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}