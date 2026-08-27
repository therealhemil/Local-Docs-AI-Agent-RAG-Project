import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

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

    const user = await userService.createUser(name);

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
    });

    const response = NextResponse.json(
      { user, message: "User workspace ready." },
      { status: 201 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[API: /api/users] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user." },
      { status: 500 }
    );
  }
}
