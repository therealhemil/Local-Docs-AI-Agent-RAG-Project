import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "ai-document-assistant-super-secret-jwt-key-2026-safe";
const secretKey = new TextEncoder().encode(JWT_SECRET);
export const SESSION_COOKIE_NAME = "ai_doc_session";

export interface SessionPayload {
  userId: string;
  name: string;
  normalizedName: string;
}

/**
 * Creates a signed JWT session token valid for 30 days.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

/**
 * Verifies a JWT session token and returns the payload if valid.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      normalizedName: payload.normalizedName as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extracts and verifies the current session from incoming request headers or cookie store.
 */
export async function getCurrentSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Not in Server Component / Route Handler context
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}
