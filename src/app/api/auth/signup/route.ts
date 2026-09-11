import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { extractClientDetails } from "@/lib/tracking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, clientDetails } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const trackingData = extractClientDetails(req, clientDetails);

    const user = await userService.signupWithCredentials({ name, email, password }, trackingData);

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
            name: user.name,
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

    const response = NextResponse.json({ user, message: "Account created successfully." }, { status: 201 });

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
    console.error("[API: /api/auth/signup] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create account." }, { status: 400 });
  }
}
