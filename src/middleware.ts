import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0-client";

/**
 * Middleware mounts Auth0's built-in auth routes:
 *   /auth/login   – initiates the OAuth flow
 *   /auth/logout  – ends the Auth0 session
 *   /auth/callback – receives the OAuth callback from Auth0
 *   /auth/profile  – returns current Auth0 session user
 *
 * All other routes are passed through untouched — the existing
 * email/password and demo auth flows continue to work as before.
 */
export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    // Run on every path except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
