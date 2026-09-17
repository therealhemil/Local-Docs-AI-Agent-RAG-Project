import { prisma } from "../lib/prisma";
import type { DocumentSource } from "../../src/types/index";

function parseSources(raw: string | null): DocumentSource[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return [{ fileName: raw }];
  }
}

/**
 * list_conversations — returns all conversations for the given user.
 */
export async function listConversations(userId: string) {
  const convos = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, role: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  if (convos.length === 0) {
    return { conversations: [], total: 0, message: "No conversations found." };
  }

  return {
    total: convos.length,
    conversations: convos.map((c) => ({
      id: c.id,
      title: c.title ?? "Untitled conversation",
      messageCount: c._count.messages,
      lastMessage: c.messages[0]
        ? {
            role: c.messages[0].role,
            preview:
              c.messages[0].content.length > 120
                ? c.messages[0].content.slice(0, 120) + "…"
                : c.messages[0].content,
            at: c.messages[0].createdAt.toISOString(),
          }
        : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}

/**
 * get_conversation — returns a conversation with its full message history.
 */
export async function getConversation(userId: string, conversationId: string) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!convo) throw new Error(`Conversation not found: ${conversationId}`);
  if (convo.userId !== userId)
    throw new Error("Unauthorized: conversation belongs to another user.");

  return {
    id: convo.id,
    title: convo.title ?? "Untitled conversation",
    createdAt: convo.createdAt.toISOString(),
    updatedAt: convo.updatedAt.toISOString(),
    messages: convo.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: parseSources(m.sources),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
