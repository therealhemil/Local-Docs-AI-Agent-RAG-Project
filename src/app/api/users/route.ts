import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/services/user.service";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const user = await userService.createUser(name);

    // Call n8n workflow
    const webhookFolderUrl = process.env.N8N_CREATE_FOLDER_WEBHOOK_URL;

    if (!webhookFolderUrl) {
      console.error("N8N_CREATE_FOLDER_WEBHOOK_URL is undefined");

      return NextResponse.json(
        {
          error: "n8n webhook URL is not configured.",
        },
        { status: 500 },
      );
    }

    try {
      console.log("Calling n8n:", webhookFolderUrl);
      
      const n8nResponse = await fetch(webhookFolderUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
        }),
      });

      // Read response as TEXT
      const n8nText = await n8nResponse.text();

      console.log("n8n status:", n8nResponse.status);
      console.log("n8n response:", n8nText);

      // Check HTTP status
      if (!n8nResponse.ok) {
        throw new Error(`n8n returned ${n8nResponse.status}: ${n8nText}`);
      }
    } catch (err: unknown) {
      console.error("n8n Error:", err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      return NextResponse.json(
        {
          error: "Failed to create Google Drive folder.",
          details: errorMessage,
        },
        { status: 500 },
      );
    }

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
    });

    const response = NextResponse.json({ user, message: "User workspace ready." }, { status: 201 });

    // Set secure HTTP-only cookie
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
    console.error("[API: /api/users] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user." }, { status: 500 });
  }
}
