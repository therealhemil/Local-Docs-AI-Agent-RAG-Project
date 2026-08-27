"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles, User, CheckCircle2, FolderGit2, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

type Step = "input" | "existing_user" | "new_user";

export function UserEntryCard() {
  const router = useRouter();
  const { user, isLoading: authLoading, checkUsername, loginOrCreateUser } = useAuth();

  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedUser, setDetectedUser] = useState<{ name: string; id?: string } | null>(null);

  // If already authenticated via session cookie, allow direct continue
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/assistant");
    }
  }, [user, authLoading, router]);

  const handleCheckName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Please enter your name to continue.");
      return;
    }

    setErrorMessage(null);
    setIsChecking(true);

    try {
      const result = await checkUsername(cleanName);
      if (result.exists && result.user) {
        setDetectedUser({ name: result.user.name, id: result.userId });
        setStep("existing_user");
      } else {
        setDetectedUser({ name: cleanName });
        setStep("new_user");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to check workspace. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleProceedExisting = async () => {
    if (!detectedUser) return;
    setIsSubmitting(true);
    try {
      await loginOrCreateUser(detectedUser.name);
      router.push("/assistant");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to access workspace");
      setIsSubmitting(false);
    }
  };

  const handleProceedNew = async () => {
    if (!detectedUser) return;
    setIsSubmitting(true);
    try {
      await loginOrCreateUser(detectedUser.name);
      router.push("/upload");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create workspace");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setErrorMessage(null);
    setDetectedUser(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Step 1: Input Name */}
        {step === "input" && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-6">
              <User className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Let&apos;s get started
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Enter your name to create or access your document workspace.
            </p>

            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCheckName} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Your name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hemil Patel"
                    disabled={isChecking}
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-base transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full justify-center"
                isLoading={isChecking}
                disabled={!name.trim()}
              >
                <span>{isChecking ? "Checking..." : "Continue →"}</span>
              </Button>
            </form>
          </div>
        )}

        {/* Step 2: Existing User Recognized */}
        {step === "existing_user" && detectedUser && (
          <div className="animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
              Welcome back, {detectedUser.name} 👋
            </h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                ✓ We found your existing workspace.
              </p>
              <p>
                You can continue with your existing documents and conversations.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleProceedExisting}
                size="lg"
                className="w-full justify-center shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 border-emerald-500/30"
                isLoading={isSubmitting}
              >
                <span>Continue to Workspace →</span>
              </Button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Not {detectedUser.name}? Change name</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: New User Onboarding */}
        {step === "new_user" && detectedUser && (
          <div className="animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
              Welcome, {detectedUser.name} 👋
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Let&apos;s create your personal document workspace and configure your Google Drive storage.
            </p>

            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleProceedNew}
                size="lg"
                className="w-full justify-center shadow-lg shadow-sky-500/20"
                isLoading={isSubmitting}
              >
                <span>Create Workspace & Continue →</span>
              </Button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Edit name</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
