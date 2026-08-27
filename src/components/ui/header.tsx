"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "./theme-toggle";
import { Sparkles, FileText, User, LogOut, ArrowRight } from "lucide-react";
import { Button } from "./button";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 dark:from-sky-500 dark:to-teal-400 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white dark:text-slate-950" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            AI Document Assistant
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
            Home
          </Link>
          <a href="#how-it-works" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
            Features
          </a>
          {user && (
            <>
              <Link href="/upload" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Documents
              </Link>
              <Link href="/assistant" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Assistant
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/assistant">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500/50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:inline">
                    {user.name}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => logout()}
                title="Switch User / Log Out"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link href="/onboarding">
              <Button size="sm" className="gap-1.5">
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
