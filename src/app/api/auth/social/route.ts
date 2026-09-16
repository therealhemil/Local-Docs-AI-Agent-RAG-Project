import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { extractClientDetails } from "@/lib/tracking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, email, name, avatarUrl, clientDetails } = body;

    if (!provider) {
      return NextResponse.json({ error: "Provider is required (google, github, demo)." }, { status: 400 });
    }

    const trackingData = extractClientDetails(req, clientDetails);

    const user = await userService.loginWithSocial({ provider, email, name, avatarUrl }, trackingData);


    const userNamefolder = `${user.name.trim().replace(/\s+/g, '_')}_${user.id.slice(0, 8)}`;
  
    // Call n8n workflow if configured
    const webhookFolderUrl = process.env.N8N_CREATE_FOLDER_WEBHOOK_URL;

    if (webhookFolderUrl) {
      try {
        console.log("Calling n8n folder webhook:", webhookFolderUrl);

        const n8nResponse = await fetch(webhookFolderUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: userNamefolder,
            userId: user.id,
            tracking: trackingData,
          }),
        });

        const n8nText = await n8nResponse.text();
        console.log("n8n status:", n8nResponse.status, "response:", n8nText);
      } catch (err: unknown) {
        console.warn("n8n Folder Webhook Warning:", err);
      }
    }

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
    });

    const response = NextResponse.json({ user, message: `Signed in with ${provider} successfully.` }, { status: 200 });

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
    return NextResponse.json({ error: error.message || "Social login failed." }, { status: 400 });
  }
}
