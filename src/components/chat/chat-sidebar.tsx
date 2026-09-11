"use client";

import React from "react";
import Link from "next/link";
import { ConversationDTO, DocumentDTO } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { formatRelativeDate } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Plus,
  MessageSquare,
  FileText,
  Trash2,
  Sparkles,
  LogOut,
  UploadCloud,
  ChevronRight,
  FolderOpen,
  PanelLeftClose,
  X,
} from "lucide-react";

interface ChatSidebarProps {
  conversations: ConversationDTO[];
  activeConversationId: string | null;
  documents: DocumentDTO[];
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClose?: () => void;
  onCloseMobile?: () => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  documents,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClose,
  onCloseMobile,
}: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const handleClose = onClose || onCloseMobile;

  return (
    <aside className="h-full flex flex-col justify-between bg-slate-50/90 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 w-72 sm:w-80 shrink-0 shadow-lg md:shadow-none">
      {/* Top Header & New Chat */}
      <div className="p-4 space-y-3">
        {/* Brand & Close Drawer Button */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white dark:text-slate-950 shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              AI Assistant
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {handleClose && (
              <button
                accessKey="b"
                onClick={handleClose}
                title="Close drawer (ALT + B)"
                aria-label="Close drawer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* New Chat Button */}
        <button
          accessKey="n"
          title="New Chat (Alt + N)"
          onClick={() => {
            onNewChat();
            if (handleClose && typeof window !== "undefined" && window.innerWidth < 768) {
              handleClose();
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        {/* Conversations List */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Conversations</span>
            <span className="font-mono">{conversations.length}</span>
          </div>

          <div className="space-y-1">
            {conversations.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No conversations yet.
              </div>
            ) : (
              conversations.map((convo) => {
                const isActive = convo.id === activeConversationId;
                return (
                  <div
                    key={convo.id}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                    onClick={() => {
                      onSelectConversation(convo.id);
                      if (handleClose && typeof window !== "undefined" && window.innerWidth < 768) {
                        handleClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-sky-500" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{convo.title || "Conversation"}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(convo.id);
                      }}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Documents Drawer Section */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Documents</span>
            <Link
              href="/upload"
              className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 text-[10px] normal-case"
            >
              <UploadCloud className="w-3 h-3" />
              <span>Upload</span>
            </Link>
          </div>

          <div className="space-y-1">
            {documents.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <span>No documents synced. </span>
                <Link href="/upload" className="text-sky-500 font-medium hover:underline block mt-1">
                  Upload files
                </Link>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 truncate"
                  title={doc.originalFileName}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="truncate flex-1">{doc.originalFileName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                {user?.name || "Workspace"}
              </span>
              <span className="text-[10px] text-slate-400 truncate block font-mono">
                {user?.normalizedName || "active session"}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log out / Switch User"
            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
