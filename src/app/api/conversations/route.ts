import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { conversationService } from "@/services/conversation.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await conversationService.getUserConversations(session.userId);
    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/conversations GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve conversations." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let title: string | undefined;
    try {
      const body = await req.json();
      title = body.title;
    } catch {
      // Empty body allowed
    }

    const conversation = await conversationService.createConversation(session.userId, title);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error: any) {
    console.error("[API: /api/conversations POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create conversation." },
      { status: 500 }
    );
  }
}
