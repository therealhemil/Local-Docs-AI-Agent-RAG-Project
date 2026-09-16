import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0-client";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { extractClientDetails } from "@/lib/tracking";

/**
 * GET /api/auth/auth0-callback
 *
 * Bridge route called after Auth0 finishes its OAuth flow.
 *
 * Flow:
 *  1. User clicks Google/GitHub button → redirected to /auth/login?connection=...&returnTo=/api/auth/auth0-callback
 *  2. Auth0 processes the OAuth callback (/auth/callback) and sets its own session cookie
 *  3. Auth0 redirects the browser here (returnTo)
 *  4. We read the Auth0 session, upsert the user in our Prisma DB, set our own JWT session cookie
 *  5. Redirect to /assistant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session) {
      // Auth0 session missing — send back to onboarding
      return NextResponse.redirect(new URL("/onboarding?error=no_session", req.url));
    }

    const { user: auth0User } = session;

    // Detect provider from Auth0 sub claim:
    //   Google:  "google-oauth2|<id>"
    //   GitHub:  "github|<id>"
    const sub = auth0User.sub ?? "";
    const provider: "google" | "github" = sub.startsWith("github") ? "github" : "google";

    const email =
      auth0User.email ??
      `${provider}-${sub.split("|")[1] ?? "user"}@${provider}.com`;
    const name =
      auth0User.name ??
      auth0User.nickname ??
      (provider === "google" ? "Google User" : "GitHub Developer");
    const avatarUrl = auth0User.picture ?? undefined;

    const trackingData = extractClientDetails(req, {});

    // Upsert user in our Prisma database using the existing service
    const user = await userService.loginWithSocial(
      { provider, email, name, avatarUrl },
      trackingData
    );

    // Trigger n8n folder creation webhook if configured
    const webhookFolderUrl = process.env.N8N_CREATE_FOLDER_WEBHOOK_URL;
    if (webhookFolderUrl) {
      try {
        // const userNamefolder = `${user.name.trim().replace(/\s+/g, "_")}_${user.id.slice(0, 8)}`;
        await fetch(webhookFolderUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user.name,
            userId: user.id,
            tracking: trackingData,
          }),
        });
      } catch (err) {
        console.warn("[Auth0 Callback] n8n folder webhook warning:", err);
      }
    }

    // Issue our own JWT session cookie (keeps the rest of the app working as-is)
    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
    });

    const response = NextResponse.redirect(new URL("/assistant", req.url));
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
    console.error("[Auth0 Callback] Error:", error);
    return NextResponse.redirect(
      new URL(`/onboarding?error=auth_failed`, req.url)
    );
  }
}
