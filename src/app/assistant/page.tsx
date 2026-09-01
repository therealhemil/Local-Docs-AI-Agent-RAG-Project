"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { useChat } from "@/hooks/use-chat";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { VoiceModal } from "@/components/voice/voice-modal";
import { Menu, X, Sparkles, FileText, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AssistantPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { documents } = useDocuments();
  const {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isSending,
    createNewChat,
    selectConversation,
    deleteConversation,
    sendMessage,
  } = useChat();

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/onboarding");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  const activeConvo = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50/50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          documents={documents}
          onSelectConversation={selectConversation}
          onNewChat={createNewChat}
          onDeleteConversation={deleteConversation}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-4/5 max-w-xs h-full animate-in slide-in-from-left duration-200">
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              documents={documents}
              onSelectConversation={selectConversation}
              onNewChat={createNewChat}
              onDeleteConversation={deleteConversation}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50/30 dark:bg-slate-950/60">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between glass">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg md:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                {activeConvo?.title || "New Chat Session"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 font-mono">
                <FileText className="w-3 h-3 text-sky-500" />
                <span>{documents.length} docs</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>+ Add Documents</span>
            </Link>
          </div>
        </header>

        {/* Message Thread */}
        <ChatMessageList
          messages={messages}
          isSending={isSending}
          onSendPrompt={sendMessage}
        />

        {/* Bottom Input */}
        <ChatInput
          onSendMessage={sendMessage}
          onOpenVoice={() => setIsVoiceOpen(true)}
          isSending={isSending}
        />


      </div>

      {/* Voice Assistant Modal */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSendVoiceMessage={(question) => sendMessage(question)}
      />
    </div>
  );
}
