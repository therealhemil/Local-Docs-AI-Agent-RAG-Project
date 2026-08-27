"use client";

import React from "react";
import { FileUp, MessageSquare, Mic, SearchCheck, Layers, HardDrive } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <FileUp className="w-6 h-6 text-sky-500" />,
      title: "📄 Upload Documents",
      description:
        "Upload PDFs, DOCX, TXT, and other supported documents with drag & drop simplicity and multi-file tracking.",
      tag: "Multi-Format",
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-cyan-500" />,
      title: "💬 Ask Questions",
      description:
        "Ask questions naturally using a ChatGPT-style conversational interface with full Markdown formatting.",
      tag: "Conversational",
    },
    {
      icon: <Mic className="w-6 h-6 text-teal-500" />,
      title: "🎙️ Talk Naturally",
      description:
        "Use your voice to ask questions and hear AI responses. Voice and text seamlessly share the same session.",
      tag: "Voice Assistant",
    },
    {
      icon: <SearchCheck className="w-6 h-6 text-indigo-500" />,
      title: "🔎 Document-Based Answers",
      description:
        "Your future RAG and vector pipeline answers accurately with exact page citations and excerpts from your files.",
      tag: "RAG & Citations",
    },
    {
      icon: <HardDrive className="w-6 h-6 text-blue-500" />,
      title: "☁️ Google Drive Sync",
      description:
        "Securely stores document files inside designated Google Drive workspaces, mapped directly in PostgreSQL.",
      tag: "Cloud Storage",
    },
    {
      icon: <Layers className="w-6 h-6 text-emerald-500" />,
      title: "⚡ Seamless Identity",
      description:
        "Normalized username recognition guarantees returning users instantly access their previous workspace and chats.",
      tag: "Zero Re-entry",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-3">
            Core Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Designed for Instant Knowledge Retrieval
          </p>
          <p className="text-base text-slate-600 dark:text-slate-400 mt-4">
            Everything you need to organize your documents, interrogate data, and collaborate with voice intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="relative group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-800/60 p-8 shadow-sm hover:shadow-xl hover:border-sky-500/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-700">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                    {feature.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
