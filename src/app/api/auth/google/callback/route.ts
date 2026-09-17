import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { googleTokenService } from "@/services/google-token.service";
import { jwtVerify } from "jose";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "ai-document-assistant-super-secret-jwt-key-2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  let returnTo = "/assistant";
  let targetUserId: string | null = null;

  // 1. Decode state if provided
  if (state) {
    try {
      const { payload } = await jwtVerify(state, secretKey);
      if (typeof payload.returnTo === "string") {
        returnTo = payload.returnTo;
      }
      if (typeof payload.userId === "string" && payload.userId !== "anonymous") {
        targetUserId = payload.userId;
      }
    } catch (stateErr) {
      console.warn("[Google Callback] Could not verify state token:", stateErr);
    }
  }

  // 2. Fall back to active session cookie if state didn't have user
  if (!targetUserId) {
    const session = await getCurrentSession(req);
    targetUserId = session?.userId || null;
  }

  // 3. Handle Google OAuth errors (e.g. user cancelled)
  if (error) {
    console.error("[Google Callback] Google OAuth returned error:", error);
    const redirectUrl = new URL(returnTo, req.url);
    redirectUrl.searchParams.set("drive_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL(returnTo, req.url);
    redirectUrl.searchParams.set("drive_error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 4. Exchange authorization code for tokens
    const tokens = await googleTokenService.exchangeCode(code);

    // Fetch user's Google email if possible for metadata
    let userEmail: string | undefined;
    if (tokens.access_token) {
      try {
        const oauth2Client = googleTokenService.getOAuth2Client();
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        userEmail = userInfo.data.email || undefined;
      } catch {
        // Non-fatal if userinfo read fails
      }
    }

    // Default to 'default-user' if user is not logged in yet
    const resolvedUserId = targetUserId || "default-user";

    // 5. Store tokens securely
    await googleTokenService.saveUserTokens(resolvedUserId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      email: userEmail,
    });

    console.log(`[Google Callback] Successfully connected Google Drive for user: ${resolvedUserId}`);

    const redirectUrl = new URL(returnTo, req.url);
    redirectUrl.searchParams.set("drive_connected", "true");
    if (userEmail) {
      redirectUrl.searchParams.set("drive_email", userEmail);
    }
    return NextResponse.redirect(redirectUrl);
  } catch (exchangeErr: any) {
    console.error("[Google Callback] Failed to exchange code for tokens:", exchangeErr);
    const redirectUrl = new URL(returnTo, req.url);
    redirectUrl.searchParams.set("drive_error", encodeURIComponent(exchangeErr.message || "exchange_failed"));
    return NextResponse.redirect(redirectUrl);
  }
}
