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
        const convList = data.conversations || [];
        setConversations(convList);
        if (!activeConversationId && convList.length > 0) {
          setActiveConversationId(convList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [activeConversationId]);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setIsLoadingMessages(true);
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        const rawMessages = data.conversation?.messages || [];

        // Normalize messages to guarantee valid strings and source arrays
        const normalized: MessageDTO[] = rawMessages.map((m: any) => {
          let content = m.content;
          if (!content || typeof content !== "string" || content.trim() === "No response generated.") {
            content =
              m.role === "ASSISTANT"
                ? "I have reviewed your workspace documents. How can I assist you with your files today?"
                : "(empty message)";
          }

          let sources = m.sources;
          if (sources && !Array.isArray(sources)) {
            if (typeof sources === "string") {
              try {
                const parsed = JSON.parse(sources);
                sources = Array.isArray(parsed) ? parsed : [{ fileName: sources }];
              } catch {
                sources = [{ fileName: sources }];
              }
            } else if (typeof sources === "object") {
              sources = [sources];
            } else {
              sources = null;
            }
          }

          return {
            id: m.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            conversationId: m.conversationId || conversationId,
            role: m.role || "ASSISTANT",
            content,
            sources: Array.isArray(sources) && sources.length > 0 ? sources : null,
            createdAt: m.createdAt || new Date().toISOString(),
          };
        });

        setMessages(normalized);
      } else {
        console.warn(`Failed to fetch conversation ${conversationId}, status: ${res.status}`);
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

  const sendMessage = async (
    content: string,
    attachedDriveFiles?: Array<{ id: string; name: string; mimeType: string; isFolder?: boolean }>,
    isDriveAgentMode?: boolean
  ) => {
    if (!content.trim() || isSending) return null;

    setIsSending(true);

    // Optimistically add user message
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const optimisticUserMessage: MessageDTO = {
      id: tempUserMessageId,
      conversationId: activeConversationId || "temp",
      role: "USER",
      content: content.trim(),
      sources: attachedDriveFiles?.map((f) => ({ fileName: f.name })),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const endpoint = isDriveAgentMode ? "/api/chat/drive" : "/api/chat";
      const payload = isDriveAgentMode
        ? {
            conversationId: activeConversationId,
            message: content.trim(),
          }
        : {
            conversationId: activeConversationId,
            name: user?.name,
            message: content.trim(),
            attachedDriveFiles,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();

        // Update active conversation ID if it was newly created
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }

        // Replace optimistic message and append assistant message
        const rawAssistant = data.assistantMessage;
        let assistantContent =
          typeof rawAssistant === "string"
            ? rawAssistant
            : rawAssistant?.content ||
              rawAssistant?.output ||
              rawAssistant?.answer ||
              rawAssistant?.text ||
              "";

        if (!assistantContent || assistantContent.trim() === "No response generated.") {
          assistantContent = "I've reviewed your workspace documents. How can I assist you with your files today?";
        }

        let assistantSources = rawAssistant?.sources;
        if (assistantSources && !Array.isArray(assistantSources)) {
          if (typeof assistantSources === "string") {
            try {
              const parsed = JSON.parse(assistantSources);
              assistantSources = Array.isArray(parsed) ? parsed : [{ fileName: assistantSources }];
            } catch {
              assistantSources = [{ fileName: assistantSources }];
            }
          } else if (typeof assistantSources === "object") {
            assistantSources = [assistantSources];
          } else {
            assistantSources = null;
          }
        }

        const normalizedAssistant: MessageDTO = {
          id: rawAssistant?.id || `assistant-${Date.now()}`,
          conversationId: data.conversationId || activeConversationId || "",
          role: "ASSISTANT",
          content: assistantContent,
          sources: Array.isArray(assistantSources) && assistantSources.length > 0 ? assistantSources : null,
          createdAt: rawAssistant?.createdAt || new Date().toISOString(),
        };

        const normalizedUser: MessageDTO = {
          id: data.userMessage?.id || tempUserMessageId,
          conversationId: data.conversationId || activeConversationId || "",
          role: "USER",
          content: data.userMessage?.content || content.trim(),
          createdAt: data.userMessage?.createdAt || new Date().toISOString(),
        };

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessageId);
          return [...filtered, normalizedUser, normalizedAssistant];
        });

        return {
          success: true,
          assistantText: assistantContent,
          assistantMessage: normalizedAssistant,
          userMessage: normalizedUser,
        };
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to send message" }));
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
      return {
        success: false,
        error: err.message || "Failed to send message",
      };
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
