import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../rate-limit";

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Make request to Harvest API for current user
    const response = await fetch("https://api.harvestapp.com/v2/users/me", {
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
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
