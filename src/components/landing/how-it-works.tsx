"use client";

import React from "react";
import { UserCheck, FileUp, Sparkles, MessageSquareCode } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: <UserCheck className="w-5 h-5 text-sky-500" />,
      title: "Enter Your Name",
      description: "Smart username detection checks PostgreSQL to instantly link or create your personal workspace.",
    },
    {
      step: "02",
      icon: <FileUp className="w-5 h-5 text-cyan-500" />,
      title: "Upload Documents",
      description: "Drop PDFs, contracts, notes, and reports. Files are synced to Google Drive with metadata in Postgres.",
    },
    {
      step: "03",
      icon: <Sparkles className="w-5 h-5 text-teal-500" />,
      title: "Automatic Sync & Ready",
      description: "Your document workspace is configured for future n8n vector indexing, chunking, and embeddings.",
    },
    {
      step: "04",
      icon: <MessageSquareCode className="w-5 h-5 text-indigo-500" />,
      title: "Ask via Text or Voice",
      description: "Interact through ChatGPT-style text chat or voice conversations with sourced citations.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-3">
          Workflow
        </h2>
        <p className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Simple 4-Step Process
        </p>
        <p className="text-base text-slate-600 dark:text-slate-400 mt-4">
          From first click to comprehensive document interrogation in under a minute.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="relative p-6 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center border border-slate-200/60 dark:border-slate-700">
                  {step.icon}
                </div>
                <span className="font-mono text-2xl font-black text-slate-300 dark:text-slate-700">
                  {step.step}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
