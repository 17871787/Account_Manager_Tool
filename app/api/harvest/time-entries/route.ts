import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../middleware/auth";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authedReq) => {
    const from = authedReq.nextUrl.searchParams.get("from") ?? "";
    const to = authedReq.nextUrl.searchParams.get("to") ?? "";
    const page = authedReq.nextUrl.searchParams.get("page") ?? "1";

    const url = new URL("https://api.harvestapp.com/v2/time_entries");
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);
    url.searchParams.set("page", page);

    try {
      const response = await fetch(url.toString(), {
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
        { error: "Failed to fetch time entries" },
        { status: 500 }
      );
    }
  });
}
