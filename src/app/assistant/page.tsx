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
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Set initial drawer state based on screen size
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsDrawerOpen(false);
    }
  }, []);

  // Keyboard shortcut: Escape to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

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
      {/* Desktop Collapsible Drawer Sidebar */}
      <div
        className={`hidden md:flex h-full transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
          isDrawerOpen ? "w-72 sm:w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          documents={documents}
          onSelectConversation={selectConversation}
          onNewChat={createNewChat}
          onDeleteConversation={deleteConversation}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>

      {/* Mobile Drawer Menu & Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isDrawerOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
            isDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsDrawerOpen(false)}
        />

        {/* Sliding Drawer Sheet */}
        <div
          className={`relative z-10 w-4/5 max-w-xs h-full bg-slate-50 dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            documents={documents}
            onSelectConversation={(id) => {
              selectConversation(id);
              setIsDrawerOpen(false);
            }}
            onNewChat={() => {
              createNewChat();
              setIsDrawerOpen(false);
            }}
            onDeleteConversation={deleteConversation}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      </div>

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50/30 dark:bg-slate-950/60">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between glass">
          <div className="flex items-center gap-3 min-w-0">
            {!isDrawerOpen ? (
              <button
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200/80 dark:border-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title={isDrawerOpen ? "Collapse drawer menu (Alt + B)" : "Open drawer menu (Alt + B)"}
              accessKey="b"
              aria-label="Toggle drawer menu"
              aria-expanded={isDrawerOpen}
            >
                <Menu className="w-4 h-4 text-sky-500" />
                <span className="hidden sm:inline font-medium">Menu</span>            
            </button>
            ): ("")}

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
          documentsCount={documents.length}
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
