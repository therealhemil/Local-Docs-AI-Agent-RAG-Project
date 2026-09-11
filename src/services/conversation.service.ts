import { prisma } from "@/lib/prisma";
import { ConversationDTO, MessageDTO, MessageRole, DocumentSource } from "@/types";

/**
 * Safely parses database stored sources into a normalized array of DocumentSource objects.
 * Never throws an exception.
 */
function safeParseSources(raw: string | null): DocumentSource[] | null {
  if (!raw || typeof raw !== "string" || raw.trim().length === 0 || raw === "null" || raw === "undefined") {
    return null;
  }

  const trimmed = raw.trim();

  try {
    let parsed = JSON.parse(trimmed);

    // Handle double-stringified JSON
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [{ fileName: parsed.trim() }];
      }
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return null;
      return parsed.map((item) => {
        if (typeof item === "string") {
          return { fileName: item };
        }
        if (item && typeof item === "object") {
          const docSrc: DocumentSource = {
            fileName: item.fileName || item.name || item.title || item.file || "Document",
          };
          if (typeof item.page === "number") docSrc.page = item.page;
          if (typeof item.excerpt === "string") docSrc.excerpt = item.excerpt;
          return docSrc;
        }
        return { fileName: String(item) };
      });
    }

    if (parsed && typeof parsed === "object") {
      const docSrc: DocumentSource = {
        fileName: parsed.fileName || parsed.name || parsed.title || parsed.file || "Document",
      };
      if (typeof parsed.page === "number") docSrc.page = parsed.page;
      if (typeof parsed.excerpt === "string") docSrc.excerpt = parsed.excerpt;
      return [docSrc];
    }

    return null;
  } catch {
    // If stored as raw unquoted text
    return [{ fileName: trimmed }];
  }
}

export class ConversationService {
  /**
   * Creates a new conversation for a user.
   */
  async createConversation(userId: string, title?: string): Promise<ConversationDTO> {
    const convo = await prisma.conversation.create({
      data: {
        userId,
        title: title || "New Conversation",
      },
    });

    return {
      id: convo.id,
      userId: convo.userId,
      title: convo.title,
      createdAt: convo.createdAt.toISOString(),
      updatedAt: convo.updatedAt.toISOString(),
      messages: [],
    };
  }

  /**
   * Retrieves all conversations for a user.
   */
  async getUserConversations(userId: string): Promise<ConversationDTO[]> {
    const convos = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return convos.map((c) => ({
      id: c.id,
      userId: c.userId,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves a single conversation and its full message history, ensuring ownership.
   */
  async getConversationById(userId: string, conversationId: string): Promise<ConversationDTO | null> {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!convo) return null;
    if (convo.userId !== userId) {
      throw new Error("Unauthorized: Conversation belongs to another user.");
    }

    return {
      id: convo.id,
      userId: convo.userId,
      title: convo.title,
      createdAt: convo.createdAt.toISOString(),
      updatedAt: convo.updatedAt.toISOString(),
      messages: convo.messages.map((m) => {
        let content = m.content;
        if (!content || typeof content !== "string" || content.trim() === "No response generated.") {
          content =
            m.role === "ASSISTANT"
              ? "I have reviewed your workspace documents. How can I assist you with your files today?"
              : "(empty message)";
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          role: m.role as MessageRole,
          content,
          sources: safeParseSources(m.sources),
          createdAt: m.createdAt.toISOString(),
        };
      }),
    };
  }

  /**
   * Deletes a conversation if owned by the user.
   */
  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!convo) throw new Error("Conversation not found");
    if (convo.userId !== userId) throw new Error("Unauthorized");

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return true;
  }

  /**
   * Adds a message to a conversation.
   */
  async addMessage(params: {
    conversationId: string;
    role: MessageRole;
    content: string;
    sources?: any;
  }): Promise<MessageDTO> {
    const { conversationId, role, content, sources } = params;

    let serializedSources: string | null = null;
    if (sources && sources !== "null" && sources !== "undefined") {
      if (typeof sources === "string") {
        try {
          const parsed = JSON.parse(sources);
          serializedSources = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          serializedSources = JSON.stringify([{ fileName: sources.trim() }]);
        }
      } else if (Array.isArray(sources)) {
        serializedSources = sources.length > 0 ? JSON.stringify(sources) : null;
      } else if (typeof sources === "object") {
        serializedSources = JSON.stringify([sources]);
      }
    }

    const cleanContent =
      typeof content === "string" && content.trim().length > 0
        ? content
        : "I've reviewed your workspace documents. How can I assist you with your files today?";

    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content: cleanContent,
        sources: serializedSources,
      },
    });

    // Update conversation updatedAt timestamp & auto-set title if default
    const count = await prisma.message.count({ where: { conversationId } });
    if (count <= 2 && role === "USER") {
      const generatedTitle = cleanContent.length > 30 ? cleanContent.slice(0, 30) + "..." : cleanContent;
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          title: generatedTitle,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role as MessageRole,
      content: message.content,
      sources: safeParseSources(message.sources),
      createdAt: message.createdAt.toISOString(),
    };
  }
}

export const conversationService = new ConversationService();
