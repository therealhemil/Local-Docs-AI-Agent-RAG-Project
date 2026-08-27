import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-12 bg-white dark:bg-slate-950/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white dark:text-slate-950">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            AI Document Assistant
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          © {new Date().getFullYear()} AI Document Assistant. Production-Ready Architecture & Workspace Hub.
        </p>

        <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-sky-500 transition-colors">
            Home
          </Link>
          <Link href="/onboarding" className="hover:text-sky-500 transition-colors">
            Get Started
          </Link>
          <a href="#features" className="hover:text-sky-500 transition-colors">
            Features
          </a>
        </div>
      </div>
    </footer>
  );
}
