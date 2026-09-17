import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { googleTokenService } from "@/services/google-token.service";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "ai-document-assistant-super-secret-jwt-key-2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get("returnTo") || "/assistant";
    const shouldRedirect = searchParams.get("redirect") !== "false";

    // Encode state with userId and return destination signed with JWT
    const statePayload = {
      userId: session?.userId || "anonymous",
      returnTo,
      timestamp: Date.now(),
    };

    const state = await new SignJWT(statePayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secretKey);

    const consentUrl = googleTokenService.generateConsentUrl(state);

    if (shouldRedirect && !req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.redirect(consentUrl);
    }

    return NextResponse.json({ url: consentUrl });
  } catch (error: any) {
    console.error("[API: /api/auth/google] Error generating consent URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate Google consent URL" },
      { status: 500 }
    );
  }
}
