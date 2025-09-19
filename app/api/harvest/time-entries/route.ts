import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../rate-limit";

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Get query parameters
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const page = req.nextUrl.searchParams.get("page") ?? "1";

  // Build Harvest API URL
  const url = new URL("https://api.harvestapp.com/v2/time_entries");
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  url.searchParams.set("page", page);

  try {
    // Make request to Harvest API
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.HARVEST_ACCESS_TOKEN}`,
        "Harvest-Account-Id": process.env.HARVEST_ACCOUNT_ID!,
        "User-Agent": process.env.USER_AGENT || "VibeApp (joe@mapof.ag)",
      },
      cache: "no-store",
    });

    // Get response text
    const responseText = await response.text();

    // Return response with same status and content type
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Harvest API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}
