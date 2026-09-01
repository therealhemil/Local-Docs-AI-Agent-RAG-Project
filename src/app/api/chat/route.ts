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
    let { conversationId, message, name } = body;

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
    // console.log('USer question message', userMsg);


    //Record User Message for content
    const UserMessageAPI = process.env.N8N_USER_MESSAGE_QUESTION_API
    const UserMesssage = await fetch(`${UserMessageAPI}`,{
      method : "POST",
      body : JSON.stringify({
        action: 'sendMessage',
        role : 'USER',
        sessionid : conversationId,
        message: cleanMessage,
        userName : name
      })
    })


    const AiResult = await UserMesssage.text()

    console.log('User Question msg', UserMesssage);
    




    // 2. Call AI Service (n8n pipeline / structured mock)
    // const aiResult = await aiService.askQuestion({
    //   userId: session.userId,
    //   conversationId,
    //   question: cleanMessage,
    // });
    // console.log('Ai Result', aiResult);

    


    // 3. Record assistant's response with sources
    // const assistantMsg = await conversationService.addMessage({
    //   conversationId,
    //   role: "ASSISTANT",
    //   content: aiResult.answer,
    //   sources: aiResult.sources,
    // });


    // console.log('ai assiatnt message', assistantMsg);
    

    return NextResponse.json(
      {
        conversationId,
        userMessage: userMsg,
        assistantMessage: AiResult,
        // sources: aiResult.sources,
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
