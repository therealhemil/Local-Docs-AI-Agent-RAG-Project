import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { conversationService } from "@/services/conversation.service";
import { aiService } from "@/services/ai.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { conversationId, message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();

    // Auto-create conversation if none supplied
    if (!conversationId) {
      const convo = await conversationService.createConversation(
        session.userId,
        cleanMessage.length > 30 ? cleanMessage.slice(0, 30) + "..." : cleanMessage
      );
      conversationId = convo.id;
    } else {
      // Verify conversation ownership
      const existing = await conversationService.getConversationById(session.userId, conversationId);
      if (!existing) {
        return NextResponse.json(
          { error: "Conversation not found or unauthorized." },
          { status: 404 }
        );
      }
    }

    // 1. Record user's question
    const userMsg = await conversationService.addMessage({
      conversationId,
      role: "USER",
      content: cleanMessage,
    });

    // 2. Call AI Service (n8n pipeline / structured mock)
    const aiResult = await aiService.askQuestion({
      userId: session.userId,
      conversationId,
      question: cleanMessage,
    });

    // 3. Record assistant's response with sources
    const assistantMsg = await conversationService.addMessage({
      conversationId,
      role: "ASSISTANT",
      content: aiResult.answer,
      sources: aiResult.sources,
    });

    return NextResponse.json(
      {
        conversationId,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        sources: aiResult.sources,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API: /api/chat] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat message." },
      { status: 500 }
    );
  }
}
