"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDrive } from "@/hooks/use-drive";
import { CheckCircle2, AlertCircle, Loader2, LogOut, ExternalLink, ShieldCheck } from "lucide-react";

export const DriveIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 87.3 78" fill="none" className={`shrink-0 ${className}`}>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.25z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

export function GoogleDriveConnectButton({ className = "" }: { className?: string }) {
  const {
    connected,
    userDriveConnected,
    email,
    isLoading,
    isDisconnecting,
    connectDrive,
    disconnectDrive,
  } = useDrive();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Checking Drive...</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
            isOpen
              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-slate-700 dark:text-slate-200"
          } ${className}`}
          title="Google Drive is connected. Click to manage."
        >
          <DriveIcon size={15} />
          <span className="text-xs font-semibold">Drive Connected</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {isOpen && (
          <div
            className="absolute right-0 mt-2 w-72 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <DriveIcon size={22} />
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                  <span>Google Drive Connected</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
                {email ? (
                  <div className="text-[11px] text-slate-400 truncate">{email}</div>
                ) : (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Authenticated via OAuth</div>
                )}
              </div>
            </div>

            <div className="py-2.5 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Read-only permissions (zero disk storage)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                You can ask questions about your Drive files directly in chat. Documents are parsed strictly in-memory.
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  disconnectDrive();
                }}
                disabled={isDisconnecting}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LogOut className="w-3 h-3" />
                )}
                <span>Disconnect</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  connectDrive();
                }}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium px-2 py-1"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state: Connect Google Drive button
  return (
    <button
      type="button"
      onClick={() => connectDrive()}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-semibold transition-all shadow-sm ${className}`}
      title="Connect your Google Drive with read-only permissions"
    >
      <DriveIcon size={15} />
      <span className="text-xs font-semibold">Connect Google Drive</span>
    </button>
  );
}
