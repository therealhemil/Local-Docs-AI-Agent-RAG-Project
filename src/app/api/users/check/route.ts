import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const checkResult = await userService.checkUser(name);
    return NextResponse.json(checkResult, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/users/check] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check username." },
      { status: 500 }
    );
  }
}
