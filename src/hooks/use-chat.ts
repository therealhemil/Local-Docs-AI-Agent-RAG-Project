"use client";

import { useState, useEffect, useCallback } from "react";
import { ConversationDTO, MessageDTO } from "@/types";
import { useAuth } from "./use-auth";

export function useChat() {
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (!activeConversationId && data.conversations?.length > 0) {
          setActiveConversationId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [activeConversationId]);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.conversation?.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadConversationMessages]);

  const createNewChat = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConversationId(data.conversation.id);
        setMessages([]);
        return data.conversation;
      }
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    }
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            setActiveConversationId(remaining[0].id);
          } else {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);

    // Optimistically add user message
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const optimisticUserMessage: MessageDTO = {
      id: tempUserMessageId,
      conversationId: activeConversationId || "temp",
      role: "USER",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          name: user?.name,
          message: content.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Update active conversation ID if it was newly created
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }

        // Replace optimistic message and append assistant message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessageId);
          return [...filtered, data.userMessage, data.assistantMessage];
        });
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message");
      }
    } catch (err: any) {
      console.error("Error in chat send:", err);
      // Append an error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversationId: activeConversationId || "",
          role: "ASSISTANT",
          content: `⚠️ Error: ${err.message || "Failed to receive response. Please try again."}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    createNewChat,
    selectConversation,
    deleteConversation,
    sendMessage,
    reloadMessages: () => (activeConversationId ? loadConversationMessages(activeConversationId) : undefined),
  };
}
