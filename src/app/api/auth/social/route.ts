import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { extractClientDetails } from "@/lib/tracking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, email, name, avatarUrl, clientDetails } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required (google, github, demo)." },
        { status: 400 }
      );
    }

    const trackingData = extractClientDetails(req, clientDetails);

    const user = await userService.loginWithSocial(
      { provider, email, name, avatarUrl },
      trackingData
    );

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
    });

    const response = NextResponse.json(
      { user, message: `Signed in with ${provider} successfully.` },
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
    console.error("[API: /api/auth/social] Error:", error);
    return NextResponse.json(
      { error: error.message || "Social login failed." },
      { status: 400 }
    );
  }
}
