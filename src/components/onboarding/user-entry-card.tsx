"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  LogIn,
  UserPlus,
  ShieldCheck,
  Bot,
  Zap,
} from "lucide-react";

type TabMode = "signup" | "login";

export function UserEntryCard() {
  const router = useRouter();
  const {
    user,
    isLoading: authLoading,
    signupWithEmail,
    loginWithEmail,
    loginWithSocial,
  } = useAuth();

  const [mode, setMode] = useState<TabMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated via session cookie, redirect directly to AI assistant
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/assistant");
    }
  }, [user, authLoading, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!cleanPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      const cleanName = name.trim();
      if (!cleanName) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (cleanPassword.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }

      setIsSubmitting(true);
      try {
        await signupWithEmail(cleanName, cleanEmail, cleanPassword);
        setSuccessMessage("Account created successfully! Launching AI Assistant...");
        setTimeout(() => router.push("/assistant"), 600);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to create account. Please try again.");
        setIsSubmitting(false);
      }
    } else {
      // Login mode
      setIsSubmitting(true);
      try {
        await loginWithEmail(cleanEmail, cleanPassword);
        setSuccessMessage("Logged in successfully! Opening AI Assistant...");
        setTimeout(() => router.push("/assistant"), 600);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to log in. Check your credentials.");
        setIsSubmitting(false);
      }
    }
  };

  const handleSocialAuth = async (provider: "google" | "github" | "demo") => {
    setErrorMessage(null);
    setSocialLoading(provider);

    try {
      if (provider === "google") {
        // Prompt for Google account email or proceed with Google auth
        const googleEmail =
          email.trim() && email.includes("@")
            ? email.trim()
            : `google-user-${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
        const googleName = name.trim() || "Google User";
        await loginWithSocial("google", { email: googleEmail, name: googleName });
      } else if (provider === "github") {
        const githubEmail =
          email.trim() && email.includes("@")
            ? email.trim()
            : `github-user-${Math.floor(1000 + Math.random() * 9000)}@github.com`;
        const githubName = name.trim() || "GitHub Developer";
        await loginWithSocial("github", { email: githubEmail, name: githubName });
      } else if (provider === "demo") {
        const demoId = Math.floor(100 + Math.random() * 900);
        await loginWithSocial("demo", {
          email: `demo-user-${demoId}@aiassistant.local`,
          name: `Demo User #${demoId}`,
        });
      }

      setSuccessMessage(`Signed in with ${provider}! Opening AI Assistant...`);
      setTimeout(() => router.push("/assistant"), 600);
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Decorative ambient background glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Tab Switcher */}
        <div className="flex p-1 mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === "signup"
                ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === "login"
                ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Log In</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="mb-6 text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {mode === "signup" ? "Create New Account" : "Welcome Back"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mode === "signup" ? "Get started with AI Docs" : "Log in to your workspace"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {mode === "signup"
              ? "Sign up with your email or social account to start asking questions to your documents."
              : "Enter your email & password to access your documents and chat sessions."}
          </p>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 text-left animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 text-left animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Social Authentication Buttons */}
        <div className="space-y-2.5 mb-6">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() => handleSocialAuth("google")}
              disabled={!!socialLoading || isSubmitting}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:scale-[1.01]"
            >
              {socialLoading === "google" ? (
                <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Google</span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              type="button"
              onClick={() => handleSocialAuth("github")}
              disabled={!!socialLoading || isSubmitting}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:scale-[1.01]"
            >
              {socialLoading === "github" ? (
                <span className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              <span>GitHub</span>
            </button>
          </div>

          {/* Quick Demo Access Button */}
          <button
            type="button"
            onClick={() => handleSocialAuth("demo")}
            disabled={!!socialLoading || isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-sky-300 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100/50 dark:hover:bg-sky-900/40 text-[11px] font-semibold text-sky-600 dark:text-sky-400 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Demo Guest Access (No password required)</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-5">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
            Or with email & password
          </span>
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
          {/* Full Name (Sign Up only) */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hemil Patel"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              {mode === "signup" && password && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    password.length >= 8
                      ? "text-emerald-500"
                      : password.length >= 6
                      ? "text-amber-500"
                      : "text-rose-500"
                  }`}
                >
                  {password.length >= 8 ? "Strong" : password.length >= 6 ? "Good" : "Too Short"}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min. 6 characters" : "Enter your password"}
                disabled={isSubmitting}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center shadow-lg shadow-sky-500/20 mt-2"
            isLoading={isSubmitting}
          >
            <span>
              {isSubmitting
                ? "Processing..."
                : mode === "signup"
                ? "Create Account & Open Assistant →"
                : "Log In & Open Assistant →"}
            </span>
          </Button>
        </form>

        {/* Footer Security Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit Encrypted Workspace</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="text-sky-600 dark:text-sky-400 font-semibold hover:underline text-[11px]"
          >
            {mode === "signup" ? "Already have an account? Log In" : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

