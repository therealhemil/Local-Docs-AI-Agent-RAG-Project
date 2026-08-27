import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { userService } from "@/services/user.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);

    if (!session) {
      return NextResponse.json(
        { user: null, message: "No active session found." },
        { status: 401 }
      );
    }

    const user = await userService.getUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { user: null, message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/users/me] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve user." },
      { status: 500 }
    );
  }
}
