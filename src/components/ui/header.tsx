"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "./theme-toggle";
import { Sparkles, FileText, User, LogOut, ArrowRight, Menu, X, MessageSquare, Network } from "lucide-react";
import { Button } from "./button";

export function Header() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
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

          {/* Navigation (Desktop) */}
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
                <Link href="/integrations" className="flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  <span>MCP Hub</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">Remote</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/assistant" className="hidden sm:block">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500/50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold max-w-[100px] truncate">
                      {user.name}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => logout()}
                  title="Switch User / Log Out"
                  className="hidden sm:inline-flex p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/onboarding" className="hidden sm:inline-block">
                <Button size="sm" className="gap-1.5">
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}

            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden border border-slate-200/80 dark:border-slate-800"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMobileMenuOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Drawer"
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sliding Drawer */}
        <div
          className={`fixed top-0 right-0 w-4/5 max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col space-y-2">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Home
              </Link>
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Features
              </a>

              {user && (
                <>
                  <Link
                    href="/upload"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <FileText className="w-4 h-4 text-sky-500" />
                    <span>Documents Workspace</span>
                  </Link>
                  <Link
                    href="/assistant"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>AI Assistant Chat</span>
                  </Link>
                  <Link
                    href="/integrations"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-sky-500" />
                      <span>MCP Hub & Integrations</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">Remote</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    title="Log Out"
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/onboarding"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full block"
              >
                <Button className="w-full justify-center">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
