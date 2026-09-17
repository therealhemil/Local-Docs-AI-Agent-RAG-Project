import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { conversationService } from "@/services/conversation.service";
import { aiService } from "@/services/ai.service";
import { mcpDriveClient } from "../../../../mcp-server/lib/google-drive";
import { answerWithContext } from "../../../../mcp-server/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Safely parses string responses that may be direct JSON or stringified JSON.
 */
function parsePossibleJson(input: string): any {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    // Handle cases where n8n returned a double-stringified JSON payload
    if (typeof parsed === "string") {
      const innerTrimmed = parsed.trim();
      if (innerTrimmed.startsWith("{") || innerTrimmed.startsWith("[")) {
        try {
          return JSON.parse(innerTrimmed);
        } catch {
          return parsed;
        }
      }
    }
    return parsed;
  } catch {
    // If standard JSON.parse fails (e.g. single quotes), attempt simple sanitize
    try {
      const sanitized = trimmed.replace(/'/g, '"');
      return JSON.parse(sanitized);
    } catch {
      return trimmed;
    }
  }
}

/**
 * Robust recursive extractor that extracts assistant text from any n8n, LangChain, or LLM payload shape.
 */
function extractAssistantContent(data: any): string {
  if (!data) return "";

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        const extracted = extractAssistantContent(parsed);
        if (extracted) return extracted;
      } catch {
        // Return raw text if not valid JSON
      }
    }
    return trimmed;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const extracted = extractAssistantContent(item);
      if (extracted) return extracted;
    }
    return "";
  }

  if (typeof data === "object") {
    // 1. Direct n8n Respond to Webhook structure: { status: "success", role: "ASSISTANT", content: "..." }
    if (typeof data.content === "string" && data.content.trim().length > 0) {
      return data.content.trim();
    }

    // 2. n8n item node wrapper: item.json
    if (data.json) {
      const extracted = extractAssistantContent(data.json);
      if (extracted) return extracted;
    }

    // 3. Common LLM & Agent keys
    const priorityKeys = [
      "content",
      "output",
      "text",
      "response",
      "reply",
      "answer",
      "message",
      "result",
      "data",
    ];

    for (const key of priorityKeys) {
      const val = data[key];
      if (val !== undefined && val !== null) {
        if (typeof val === "string" && val.trim().length > 0) {
          return val.trim();
        }
        if (typeof val === "object") {
          const nested = extractAssistantContent(val);
          if (nested) return nested;
        }
      }
    }

    // 4. LangChain message format: data.kwargs.content
    if (data.kwargs?.content) {
      return extractAssistantContent(data.kwargs.content);
    }

    // 5. OpenAI choices format
    if (Array.isArray(data.choices) && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice?.message?.content) return extractAssistantContent(choice.message.content);
      if (choice?.text) return extractAssistantContent(choice.text);
    }

    // 6. Google Gemini candidates format
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        const text = candidate.content.parts.map((p: any) => p.text || "").join("");
        if (text.trim().length > 0) return text.trim();
      }
    }
  }

  return "";
}

/**
 * Extracts and normalizes sources/citations from n8n or AI payload.
 */
function extractAssistantSources(data: any): any[] | null {
  if (!data) return null;
  const item = Array.isArray(data) ? data[0] : data;
  if (!item || typeof item !== "object") return null;

  const rawSources =
    item.sources ||
    item.citations ||
    item.documents ||
    (item.json && (item.json.sources || item.json.citations));

  if (!rawSources || rawSources === "Default") return null;

  if (Array.isArray(rawSources)) {
    return rawSources.length > 0 ? rawSources : null;
  }

  if (typeof rawSources === "string" && rawSources.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawSources);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return [{ fileName: rawSources.trim() }];
    } catch {
      return [{ fileName: rawSources.trim() }];
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { conversationId, message, name, attachedDriveFiles } = body;

    console.log('user name ', name);

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();

    // Extract text from any attached Google Drive files / folders
    let driveContext = "";
    const driveSources: any[] = [];
    const attachedNames: string[] = [];

    if (Array.isArray(attachedDriveFiles) && attachedDriveFiles.length > 0) {
      console.log(`[API: /api/chat] Reading ${attachedDriveFiles.length} attached Google Drive items...`);
      for (const item of attachedDriveFiles) {
        if (item.isFolder) {
          try {
            const folderFiles = await mcpDriveClient.extractFolderText(item.id);
            for (const ff of folderFiles) {
              driveContext += `\n\n=== [Google Drive Folder: ${item.name} / File: ${ff.fileName}] ===\n${ff.text}\n`;
              driveSources.push({ fileName: `${item.name}/${ff.fileName}` });
              attachedNames.push(`${item.name}/${ff.fileName}`);
            }
          } catch (err) {
            console.warn(`[API: /api/chat] Error extracting folder ${item.name}:`, err);
          }
        } else {
          try {
            const text = await mcpDriveClient.extractText(item.id, item.mimeType || "application/octet-stream");
            if (text) {
              driveContext += `\n\n=== [Google Drive Document: ${item.name}] ===\n${text}\n`;
              driveSources.push({ fileName: item.name });
              attachedNames.push(item.name);
            }
          } catch (err) {
            console.warn(`[API: /api/chat] Error extracting file ${item.name}:`, err);
          }
        }
      }
    }

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

    // 1. Record user's question in PostgreSQL
    const userMsg = await conversationService.addMessage({
      conversationId,
      role: "USER",
      content: cleanMessage,
      sources: driveSources.length > 0 ? driveSources : undefined,
    });

    // 2. Call n8n webhook API
    const userMessageAPI = process.env.N8N_USER_MESSAGE_QUESTION_API || process.env.N8N_CHAT_WEBHOOK_URL;
    let assistantContent = "";
    let assistantSources: any = null;

    if (userMessageAPI) {
      try {
        console.log(`[API: /api/chat] Dispatching prompt to n8n webhook: ${userMessageAPI}`);
        const n8nPayload: any = {
          action: "sendMessage",
          role: "USER",
          sessionid: conversationId,
          sessionId: conversationId,
          conversationId: conversationId,
          message: driveContext
            ? `${cleanMessage}\n\n[Context from attached Google Drive files (${attachedNames.join(", ")}):\n${driveContext}]`
            : cleanMessage,
          userName: name || session.name,
          userId: session.userId,
        };
        if (driveContext) {
          n8nPayload.context = driveContext;
          n8nPayload.driveFiles = attachedNames;
        }

        const n8nResponse = await fetch(userMessageAPI, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(n8nPayload),
        });

        console.log('user name sending in chat', name || session.name);

        const rawText = await n8nResponse.text();
        console.log("[n8n Response Status]:", n8nResponse.status);
        console.log("[n8n Response Raw Body]:", rawText || "(empty body)");

        if (n8nResponse.ok && rawText.trim().length > 0) {
          const parsedData = parsePossibleJson(rawText);
          assistantContent = extractAssistantContent(parsedData);
          assistantSources = extractAssistantSources(parsedData);
          console.log("[API: /api/chat] Successfully extracted assistant content from n8n response.");
        } else if (!n8nResponse.ok) {
          console.warn(`[API: /api/chat] n8n responded with non-200 status ${n8nResponse.status}: ${rawText}`);
        }
      } catch (err: any) {
        console.error("[API: /api/chat] Failed to reach n8n webhook:", err);
      }
    }

    // 3. Fallback to Drive context AI answering or local workspace AI fallback
    if (!assistantContent || assistantContent.trim().length === 0) {
      if (driveContext) {
        console.log("[API: /api/chat] Answering directly using attached Google Drive context...");
        const aiAnswer = await answerWithContext({
          question: cleanMessage,
          context: driveContext,
          fileNames: attachedNames,
          userId: session.userId,
          conversationId,
        });
        assistantContent = aiAnswer.answer;
      } else {
        console.log("[API: /api/chat] n8n output empty or unavailable. Triggering intelligent document AI fallback...");
        const aiResult = await aiService.askQuestion({
          userId: session.userId,
          conversationId,
          question: cleanMessage,
        });
        assistantContent = aiResult.answer;
        if (!assistantSources || (Array.isArray(assistantSources) && assistantSources.length === 0)) {
          assistantSources = aiResult.sources;
        }
      }
    }

    // Merge Google Drive sources with any n8n sources
    if (driveSources.length > 0) {
      const existing = Array.isArray(assistantSources) ? assistantSources : [];
      assistantSources = [...driveSources, ...existing];
    }

    // Ensure we always have valid text
    if (!assistantContent || typeof assistantContent !== "string" || assistantContent.trim().length === 0) {
      assistantContent = "I've reviewed your workspace documents. How can I assist you with your files today?";
    }

    // 4. Save assistant's response to database
    const assistantMsg = await conversationService.addMessage({
      conversationId,
      role: "ASSISTANT",
      content: assistantContent,
      sources: assistantSources,
    });

    return NextResponse.json(
      {
        conversationId,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
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
