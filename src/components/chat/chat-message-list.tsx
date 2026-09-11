"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageDTO } from "@/types";
import { MarkdownRenderer } from "./markdown-renderer";
import {
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  FileText,
  HelpCircle,
  ArrowUpRight,
  Bot,
  UploadCloud,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ChatMessageListProps {
  messages: MessageDTO[];
  isSending: boolean;
  onSendPrompt: (prompt: string) => void;
  documentsCount?: number;
}

export function ChatMessageList({
  messages,
  isSending,
  onSendPrompt,
  documentsCount = 0,
}: ChatMessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: "up" | "down") => {
    setFeedback((prev) => ({
      ...prev,
      [id]: prev[id] === type ? undefined : (type as any),
    }));
  };

  const promptSuggestions = [
    {
      title: "Termination Clause",
      desc: "What is the termination clause in my contract?",
      tag: "Contract",
    },
    {
      title: "Summary & Deliverables",
      desc: "Summarize the main provisions and key deliverables.",
      tag: "Overview",
    },
    {
      title: "Payment Deadlines",
      desc: "What are the payment deadlines, penalties, and terms?",
      tag: "Finance",
    },
    {
      title: "Signatories & Roles",
      desc: "Who are the key signatories and responsible stakeholders?",
      tag: "Roles",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 py-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 via-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-sky-500/25">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
              ✓
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              👋 Hello, {user?.name || "there"}!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your AI Document Assistant is ready. Upload files or select an AI suggestion below to start asking questions.
            </p>
          </div>

          {/* Quick upload prompt for new users */}
          {documentsCount === 0 && (
            <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-sky-100/50 to-cyan-50 dark:from-slate-900 dark:via-slate-850 dark:to-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Upload your first document
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Sync PDFs, DOCX, TXT or spreadsheets to ask questions with citations.
                  </p>
                </div>
              </div>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0"
              >
                <span>+ Add Documents</span>
              </Link>
            </div>
          )}

          {/* Upgraded AI Suggestion Chips */}
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Suggestions</span>
              </span>
              <span className="text-[11px] text-slate-400">Click to ask instantly</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {promptSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendPrompt(item.desc)}
                  className="group relative p-4 rounded-2xl text-left transition-all duration-200 bg-gradient-to-br from-sky-50/80 via-white to-cyan-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-sky-950/30 border border-sky-200/80 dark:border-sky-500/30 hover:border-sky-500 dark:hover:border-sky-400 shadow-sm hover:shadow-md hover:shadow-sky-500/10 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                      {item.title}
                    </span>
                    <span className="p-1 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    &ldquo;{item.desc}&rdquo;
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === "USER";
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-600 via-cyan-600 to-teal-500 dark:from-sky-500 dark:via-cyan-400 dark:to-teal-300 text-white dark:text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative max-w-2xl rounded-2xl p-4 sm:p-5 leading-relaxed transition-all ${
                    isUser
                      ? "bg-gradient-to-r from-sky-600 via-sky-600 to-cyan-600 dark:from-sky-500 dark:to-cyan-500 text-white dark:text-slate-950 rounded-tr-none text-sm font-medium shadow-md shadow-sky-600/15"
                      : "bg-gradient-to-b from-white to-slate-50/90 dark:from-slate-900 dark:to-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-tl-none text-sm shadow-md shadow-slate-200/50 dark:shadow-black/20"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Assistant Header Tag */}
                      <div className="flex items-center gap-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 border-b border-slate-100 dark:border-slate-800">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Assistant Reply</span>
                      </div>

                      <MarkdownRenderer content={msg.content} />

                      {/* Upgraded Source Citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 mt-3">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                            Cited Sources:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-xs font-semibold text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 font-mono shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-500" />
                                <span>
                                  {src.fileName}
                                  {src.page ? ` — Page ${src.page}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="flex items-center gap-3 pt-2 text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy text"
                          className="hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            const lastUserMsg = [...messages].reverse().find((m) => m.role === "USER");
                            if (lastUserMsg?.content) {
                              onSendPrompt(lastUserMsg.content);
                            }
                          }}
                          title="Regenerate"
                          className="hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Regenerate</span>
                        </button>

                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => handleFeedback(msg.id, "up")}
                            title="Helpful"
                            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              feedback[msg.id] === "up" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : "hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleFeedback(msg.id, "down")}
                            title="Not helpful"
                            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              feedback[msg.id] === "down" ? "text-rose-500 bg-rose-50 dark:bg-rose-950/40" : "hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5 border border-sky-200 dark:border-slate-700">
                    {user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Generating Animation */}
          {isSending && (
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 animate-pulse border border-sky-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Interrogating documents & synthesizing reply...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
