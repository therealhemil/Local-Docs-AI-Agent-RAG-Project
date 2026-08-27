"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileUp, Mic, MessageSquare, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Hero() {
  const { user } = useAuth();

  return (
    <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
      {/* Background glowing gradient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 text-xs font-semibold mb-8 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          <span>Next-Generation AI Document & Voice Hub</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
          Talk to Your Documents. <br />
          <span className="bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-400 bg-clip-text text-transparent">
            Ask Anything.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          Upload your documents and ask questions using text or voice. Your personal AI assistant
          helps you extract insights, cite exact pages, and find information in seconds.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href={user ? "/assistant" : "/onboarding"}>
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-sky-500/25">
              <span>{user ? "Open Workspace →" : "Get Started →"}</span>
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <span>See How It Works</span>
            </Button>
          </a>
        </div>

        {/* Interactive preview mock card */}
        <div className="relative mx-auto max-w-4xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3 mb-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-medium text-slate-600 dark:text-slate-400">AI Assistant Workspace Preview</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PostgreSQL & Google Drive Synced</span>
            </div>
          </div>

          <div className="space-y-3 text-left">
            {/* User message pill */}
            <div className="flex justify-end">
              <div className="bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950 px-4 py-2.5 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm max-w-md">
                What is the termination clause in my agreement?
              </div>
            </div>

            {/* Assistant response */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed max-w-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <p className="mb-2.5">
                  The termination clause states that either party may terminate the agreement by providing <strong>30 days&apos; written notice</strong> without penalty.
                </p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sources:</span>
                  <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-sky-600 dark:text-sky-400">
                    📄 Contract.pdf — Page 8
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
