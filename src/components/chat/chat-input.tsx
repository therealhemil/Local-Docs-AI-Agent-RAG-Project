"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Mic,
  Send,
  Sparkles,
  Loader2,
  Plus,
  Folder,
  X,
  FileText,
  FileSpreadsheet,
  File,
  Bot,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { DrivePickerModal, DriveItem } from "./drive-picker-modal";
import { DriveIcon } from "./drive-connect-button";
import { useDrive } from "@/hooks/use-drive";

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: DriveItem[], isDriveAgentMode?: boolean) => void;
  onOpenVoice: () => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onOpenVoice, isSending, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [attachedDriveItems, setAttachedDriveItems] = useState<DriveItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDriveAgentActive, setIsDriveAgentActive] = useState(false);

  const {
    connected: isDriveConnected,
    email: driveEmail,
    connectDrive,
    disconnectDrive,
  } = useDrive();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending || disabled) return;

    onSendMessage(
      input.trim(),
      attachedDriveItems.length > 0 ? attachedDriveItems : undefined,
      isDriveAgentActive
    );
    setInput("");
    setAttachedDriveItems([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedDriveItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="p-4 sm:p-6 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/90 shadow-sm focus-within:border-sky-500 dark:focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all"
        >
          {/* Active Drive Agent Mode Banner */}
          {isDriveAgentActive && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-sky-500/10 border-b border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 rounded-t-2xl animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-bold text-[11px] tracking-wide uppercase text-amber-600 dark:text-amber-400">
                  Drive AI Agent Active
                </span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[11px]">
                  — Queries search & read your Drive documents in-memory with citations
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDriveAgentActive(false)}
                className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-semibold"
              >
                Disable
              </button>
            </div>
          )}

          {/* Gemini-style Attached Drive Item Chips */}
          {attachedDriveItems.length > 0 && (
            <div className={`flex flex-wrap items-center gap-1.5 p-2.5 pb-1 bg-white/60 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-700/60 ${!isDriveAgentActive ? "rounded-t-2xl" : ""}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Folder className="w-3 h-3 text-amber-500" />
                <span>Drive Context:</span>
              </span>
              {attachedDriveItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-medium animate-in fade-in duration-150"
                >
                  {item.isFolder ? (
                    <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                  ) : item.mimeType.includes("spreadsheet") || item.mimeType.includes("csv") ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : item.mimeType.includes("pdf") ? (
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[150px]" title={item.name}>
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(item.id)}
                    className="text-amber-700/60 hover:text-amber-900 dark:text-amber-300/60 dark:hover:text-amber-100 ml-0.5 p-0.5 rounded-full hover:bg-amber-500/20"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Row */}
          <div className="flex items-end p-2 gap-1.5 sm:gap-2">
            {/* + Plus Add Button with Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                }}
                title="Add files or activate Drive AI Agent"
                className={`p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                  isMenuOpen || attachedDriveItems.length > 0 || isDriveAgentActive
                    ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 ring-1 ring-sky-500/30"
                    : "text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-700/80"
                }`}
              >
                <Plus
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isMenuOpen ? "rotate-45 text-sky-500" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-3 w-80 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-900/20 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Google Drive Status Banner inside Plus menu */}
                  {isDriveConnected ? (
                    <div className="p-2.5 mb-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <DriveIcon size={20} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <span>Google Drive Connected</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {driveEmail || "Authenticated via OAuth"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectDrive();
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                        title="Disconnect Google Drive"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <DriveIcon size={20} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            Google Drive Not Connected
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Connect to query Drive files in-memory
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          connectDrive();
                        }}
                        className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg shadow-sm transition-colors shrink-0"
                      >
                        Connect
                      </button>
                    </div>
                  )}

                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Drive AI Tools
                  </div>

                  {/* Toggle Drive Agent Mode */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      if (!isDriveConnected) {
                        connectDrive();
                      } else {
                        setIsDriveAgentActive((prev) => !prev);
                      }
                    }}
                    className="w-full text-left flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5 fill-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">Drive AI Agent Mode</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          In-memory tool querying & citations
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isDriveAgentActive
                        ? "bg-amber-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {isDriveAgentActive ? "ON" : "OFF"}
                    </span>
                  </button>

                  {/* Add from Google Drive */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      setIsDriveModalOpen(true);
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                      <DriveIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate">Add from Google Drive</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">
                        Attach files/folders to chat prompt
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Drive Agent Quick Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (!isDriveConnected) {
                  connectDrive();
                } else {
                  setIsDriveAgentActive(!isDriveAgentActive);
                }
              }}
              title={
                !isDriveConnected
                  ? "Connect Google Drive to enable Drive AI Agent"
                  : isDriveAgentActive
                  ? "Drive AI Agent mode active (click to turn off)"
                  : "Activate Drive AI Agent mode"
              }
              className={`p-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 text-xs font-semibold ${
                isDriveAgentActive
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <Zap className={`w-4 h-4 ${isDriveAgentActive ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
              <span className="text-[11px] font-semibold">Drive Agent</span>
              {isDriveConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Google Drive Connected" />
              )}
            </button>

            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={onOpenVoice}
              title="Start voice interaction"
              className="p-2.5 rounded-xl text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-700/80 transition-colors shrink-0"
            >
              <Mic className="w-5 h-5 text-sky-500 hover:scale-110 transition-transform" />
            </button>

            {/* Auto-resizing Text Input */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || disabled}
              placeholder={
                isDriveAgentActive
                  ? "Ask Drive AI Agent to search and analyze your Google Drive files in-memory..."
                  : attachedDriveItems.length > 0
                  ? `Ask a question about ${attachedDriveItems.length === 1 ? attachedDriveItems[0].name : `${attachedDriveItems.length} Drive items`}...`
                  : "Ask anything about your documents... (Enter to send, Shift+Enter for new line)"
              }
              className="flex-1 max-h-44 bg-transparent border-0 resize-none py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 leading-relaxed min-h-[40px]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isSending || disabled}
              className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 transition-all shrink-0 shadow-sm"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-sky-500" />
          <span>AI answers using your indexed documents & Google Drive storage.</span>
        </p>
      </div>

      {/* Google Drive Picker Modal */}
      <DrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        initialSelected={attachedDriveItems}
        onSelectItems={(items) => setAttachedDriveItems(items)}
      />
    </div>
  );
}
