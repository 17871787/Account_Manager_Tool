import { NextRequest, NextResponse } from "next/server";

// HubSpot Companies API endpoint
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const limit = req.nextUrl.searchParams.get("limit") || "10";
    const after = req.nextUrl.searchParams.get("after") || "";
    const properties = req.nextUrl.searchParams.get("properties") ||
      "name,domain,industry,website,numberofemployees,annualrevenue,createdate,city,state,country";

    // Check for HubSpot token
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY;

    if (!hubspotToken) {
      return NextResponse.json(
        { error: "HubSpot API token not configured" },
        { status: 500 }
      );
    }

    // Build HubSpot API URL
    const baseUrl = process.env.HUBSPOT_API_BASE_URL || "https://api.hubapi.com";
    const url = new URL(`${baseUrl}/crm/v3/objects/companies`);

    url.searchParams.set("limit", limit);
    url.searchParams.set("properties", properties);
    if (after) {
      url.searchParams.set("after", after);
    }

    // Make request to HubSpot API
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${hubspotToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HubSpot API error:", errorText);
      return NextResponse.json(
        { error: `HubSpot API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("HubSpot Companies API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}