import { prisma } from "../lib/prisma";

/**
 * ask_question — sends a question to the n8n RAG webhook and returns the AI answer.
 * Falls back to a local document-aware response if the webhook is unavailable.
 */
export async function askQuestion(params: {
  userId: string;
  question: string;
  conversationId?: string;
}) {
  const { userId, question, conversationId } = params;

  const webhookUrl = process.env.N8N_USER_MESSAGE_QUESTION_API;

  // Fetch user's document names for context
  const docs = await prisma.document.findMany({
    where: { userId, status: { in: ["READY", "UPLOADED"] } },
    select: { originalFileName: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const docNames = docs.map((d) => d.originalFileName);

  // Try the n8n RAG webhook first
  if (webhookUrl) {
    try {
      const payload: Record<string, any> = {
        userId,
        question,
        chatInput: question,
        sessionId: conversationId ?? `mcp-${userId}`,
        documents: docNames,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      if (response.ok) {
        const data = await response.json();

        // Handle various n8n response shapes
        const answer =
          data?.output ??
          data?.answer ??
          data?.message ??
          data?.text ??
          (typeof data === "string" ? data : null);

        if (answer) {
          return {
            answer,
            sources: data?.sources ?? data?.documents ?? [],
            via: "n8n-rag-webhook",
          };
        }
      }

      throw new Error(`Webhook responded with status ${response.status}`);
    } catch (err: any) {
      // Webhook failed — fall through to local response
      console.error("[MCP ask_question] Webhook error:", err?.message ?? err);
    }
  }

  // Local fallback: summarise available documents and give a context-aware response
  if (docNames.length === 0) {
    return {
      answer:
        "No documents are available in your workspace yet. Please upload some documents first using the AI Document Assistant, then I can answer questions about them.",
      sources: [],
      via: "local-fallback",
    };
  }

  return {
    answer: `I found ${docNames.length} document(s) in your workspace: ${docNames.slice(0, 5).join(", ")}${docNames.length > 5 ? ` and ${docNames.length - 5} more` : ""}. However, the RAG pipeline (n8n) is not reachable right now, so I cannot search the document contents. Please ensure n8n is running at ${webhookUrl ?? "N8N_USER_MESSAGE_QUESTION_API (not set)"}.`,
    sources: [],
    via: "local-fallback",
  };
}
