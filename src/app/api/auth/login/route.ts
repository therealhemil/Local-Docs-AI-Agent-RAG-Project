import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { extractClientDetails } from "@/lib/tracking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, clientDetails } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trackingData = extractClientDetails(req, clientDetails);

    const user = await userService.loginWithCredentials(
      { email, password },
      trackingData
    );

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
    });

    const response = NextResponse.json(
      { user, message: "Logged in successfully." },
      { status: 200 }
    );

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
    console.error("[API: /api/auth/login] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log in." },
      { status: 400 }
    );
  }
}
