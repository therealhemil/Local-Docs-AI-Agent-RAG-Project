import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { userService } from "@/services/user.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const logs = await userService.getUserTrackingLogs(session.userId);
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/users/tracking] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve tracking logs." },
      { status: 500 }
    );
  }
}
