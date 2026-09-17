/**
 * mcp-server/lib/ai.ts
 *
 * AI answering layer for the MCP server.
 * Strategy:
 *   1. Try n8n RAG webhook (if configured)
 *   2. Fall back to Gemini API (if GEMINI_API_KEY set)
 *   3. Final fallback: return raw extracted text with instructions
 */

interface AiAnswer {
  answer: string;
  via: "n8n" | "gemini" | "raw-text";
}

/**
 * Answer a question using the provided document text as context.
 */
export async function answerWithContext(params: {
  question: string;
  context: string;        // extracted text from Drive file(s)
  fileNames: string[];    // for citation
  userId?: string;
  conversationId?: string;
}): Promise<AiAnswer> {
  const { question, context, fileNames, userId, conversationId } = params;

  // ── 1. Try n8n RAG webhook ─────────────────────────────────────────────────
  const n8nUrl = process.env.N8N_USER_MESSAGE_QUESTION_API;
  if (n8nUrl) {
    try {
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId ?? "mcp-user",
          question,
          chatInput: question,
          sessionId: conversationId ?? `mcp-drive-${Date.now()}`,
          context,
          documents: fileNames,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (res.ok) {
        const data = await res.json();
        const answer =
          data?.output ?? data?.answer ?? data?.message ?? data?.text ??
          (typeof data === "string" ? data : null);
        if (answer) return { answer, via: "n8n" };
      }
    } catch (err) {
      console.error("[MCP AI] n8n webhook failed:", err);
    }
  }

  // ── 2. Try Gemini API ──────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a helpful document assistant. Answer the user's question based ONLY on the provided document content.

Documents: ${fileNames.join(", ")}

Document Content:
${context}

User Question: ${question}

Provide a clear, accurate answer based on the document content above. If the answer is not in the documents, say so.`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text();
      if (answer) return { answer, via: "gemini" };
    } catch (err) {
      console.error("[MCP AI] Gemini failed:", err);
    }
  }

  // ── 3. Raw text fallback ───────────────────────────────────────────────────
  return {
    answer: `I found the following content in your documents (${fileNames.join(", ")}), but no AI backend is configured to summarize it. Add GEMINI_API_KEY or ensure n8n is running.\n\n---\n\n${context.slice(0, 3000)}${context.length > 3000 ? "\n\n[... content truncated ...]" : ""}`,
    via: "raw-text",
  };
}
