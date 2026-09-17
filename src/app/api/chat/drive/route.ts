import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { conversationService } from "@/services/conversation.service";
import { googleTokenService } from "@/services/google-token.service";
import { driveAgentService } from "@/services/drive-agent.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    const userId = session?.userId || "default-user";

    // 1. Verify user's Google Drive connection
    const isConnected = await googleTokenService.isUserConnected(userId);
    if (!isConnected) {
      return NextResponse.json(
        {
          error: "Google Drive is not connected. Please connect your Google Drive to query your files.",
          driveConnected: false,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    let { message, conversationId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();

    // 2. Auto-create or verify conversation
    if (!conversationId) {
      const convo = await conversationService.createConversation(
        userId,
        cleanMessage.length > 30 ? cleanMessage.slice(0, 30) + "..." : cleanMessage
      );
      conversationId = convo.id;
    } else {
      const existing = await conversationService.getConversationById(userId, conversationId);
      if (!existing) {
        return NextResponse.json(
          { error: "Conversation not found or unauthorized." },
          { status: 404 }
        );
      }
    }

    // 3. Save User message to conversation history
    const userMsg = await conversationService.addMessage({
      conversationId,
      role: "USER",
      content: cleanMessage,
    });

    // 4. Run the Google Drive AI Agent with tool calling
    const agentResult = await driveAgentService.runDriveAgent({
      userId,
      message: cleanMessage,
    });

    // 5. Save Assistant response to conversation history
    const assistantMsg = await conversationService.addMessage({
      conversationId,
      role: "ASSISTANT",
      content: agentResult.answer,
      sources: agentResult.sources,
    });

    return NextResponse.json({
      conversationId,
      answer: agentResult.answer,
      sources: agentResult.sources,
      toolCalls: agentResult.toolCalls,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (error: any) {
    console.error("[API: /api/chat/drive] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process Drive AI agent query." },
      { status: 500 }
    );
  }
}
