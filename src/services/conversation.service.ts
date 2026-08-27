import { prisma } from "@/lib/prisma";
import { ConversationDTO, MessageDTO, MessageRole } from "@/types";

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
      messages: convo.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role as MessageRole,
        content: m.content,
        sources: m.sources ? JSON.parse(m.sources) : null,
        createdAt: m.createdAt.toISOString(),
      })),
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

    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        sources: sources ? JSON.stringify(sources) : null,
      },
    });

    // Update conversation updatedAt timestamp & auto-set title if default
    const count = await prisma.message.count({ where: { conversationId } });
    if (count <= 2 && role === "USER") {
      const generatedTitle = content.length > 30 ? content.slice(0, 30) + "..." : content;
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
      sources: sources || null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}

export const conversationService = new ConversationService();
