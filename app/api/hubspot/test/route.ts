import { NextRequest, NextResponse } from "next/server";

// Test endpoint to verify HubSpot connection
export async function GET(req: NextRequest) {
  try {
    // Check for HubSpot credentials
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;

    if (!hubspotToken && !hubspotApiKey) {
      return NextResponse.json({
        success: false,
        error: "No HubSpot credentials configured",
        help: "Please add either HUBSPOT_API_KEY or HUBSPOT_ACCESS_TOKEN to your .env.local file"
      }, { status: 500 });
    }

    const baseUrl = process.env.HUBSPOT_API_BASE_URL || "https://api.hubapi.com";

    // Try different authentication methods
    let response;
    let authMethod = "";

    // Try Access Token first (preferred method)
    if (hubspotToken) {
      authMethod = "Access Token";
      response = await fetch(`${baseUrl}/crm/v3/objects/contacts?limit=1`, {
        headers: {
          Authorization: `Bearer ${hubspotToken}`,
          "Content-Type": "application/json",
        },
      });
    }
    // Fall back to API Key (legacy method)
    else if (hubspotApiKey) {
      authMethod = "API Key";
      // For API key, it's added as a query parameter
      response = await fetch(`${baseUrl}/contacts/v1/lists/all/contacts/all?hapikey=${hubspotApiKey}&count=1`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    if (!response) {
      return NextResponse.json({
        success: false,
        error: "Failed to make request"
      }, { status: 500 });
    }

    const responseText = await response.text();

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      return NextResponse.json({
        success: true,
        message: "HubSpot connection successful!",
        authMethod,
        status: response.status,
        hasData: true,
        sampleResponse: data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `HubSpot API returned ${response.status}`,
        authMethod,
        details: responseText,
        help: response.status === 401
          ? "Invalid API key or token. Please check your credentials."
          : response.status === 403
          ? "Access forbidden. Your account might not have the required permissions."
          : "Unknown error. Check the details above."
      }, { status: response.status });
    }
  } catch (error) {
    console.error("HubSpot test error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to test HubSpot connection",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}