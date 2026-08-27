import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { conversationService } from "@/services/conversation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversation = await conversationService.getConversationById(
      session.userId,
      params.id
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/conversations/[id] GET] Error:", error);
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to retrieve conversation." },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await conversationService.deleteConversation(session.userId, params.id);
    return NextResponse.json(
      { success: true, message: "Conversation deleted successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API: /api/conversations/[id] DELETE] Error:", error);
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to delete conversation." },
      { status }
    );
  }
}
