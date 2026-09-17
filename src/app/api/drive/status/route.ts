import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { googleTokenService } from "@/services/google-token.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    const userId = session?.userId || "default-user";

    const userTokens = await googleTokenService.getUserTokens(userId);
    const isUserConnected = Boolean(userTokens && (userTokens.accessToken || userTokens.refreshToken));

    const systemConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || isUserConnected)
    );

    return NextResponse.json({
      connected: isUserConnected || systemConfigured,
      userDriveConnected: isUserConnected,
      email: userTokens?.email || null,
      updatedAt: userTokens?.updatedAt || null,
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
    });
  } catch (error: any) {
    console.error("[API: /api/drive/status] Error checking drive status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check drive status", connected: false },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    const userId = session?.userId || "default-user";

    await googleTokenService.deleteUserTokens(userId);

    return NextResponse.json({
      success: true,
      message: "Google Drive disconnected successfully.",
      connected: false,
    });
  } catch (error: any) {
    console.error("[API: /api/drive/status] Disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect Google Drive" },
      { status: 500 }
    );
  }
}
