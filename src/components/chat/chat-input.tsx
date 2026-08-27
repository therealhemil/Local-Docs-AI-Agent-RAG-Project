"use client";

import React, { useRef, useState, useEffect } from "react";
import { Mic, Send, CornerDownLeft, Sparkles, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onOpenVoice: () => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onOpenVoice, isSending, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending || disabled) return;

    onSendMessage(input.trim());
    setInput("");

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

  return (
    <div className="p-4 sm:p-6 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/90 shadow-sm focus-within:border-sky-500 dark:focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all p-2 gap-2"
        >
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
            placeholder="Ask anything about your documents... (Enter to send, Shift+Enter for new line)"
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
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-sky-500" />
          <span>AI answers using your indexed documents & Google Drive storage.</span>
        </p>
      </div>
    </div>
  );
}
