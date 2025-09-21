import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../middleware/auth";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const response = await fetch("https://api.harvestapp.com/v2/users/me", {
        headers: {
          Authorization: `Bearer ${process.env.HARVEST_ACCESS_TOKEN}`,
          "Harvest-Account-Id": process.env.HARVEST_ACCOUNT_ID!,
          "User-Agent": process.env.USER_AGENT || "VibeApp (joe@mapof.ag)",
        },
        cache: "no-store",
      });

      const responseText = await response.text();

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
  });
}
