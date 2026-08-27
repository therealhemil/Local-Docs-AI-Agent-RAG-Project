"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) => addToast({ type: "success", title, message }),
    error: (message: string, title?: string) => addToast({ type: "error", title, message }),
    warning: (message: string, title?: string) => addToast({ type: "warning", title, message }),
    info: (message: string, title?: string) => addToast({ type: "info", title, message }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-5 flex items-start gap-3 ${
            item.type === "success"
              ? "bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-950/30"
              : item.type === "error"
              ? "bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/30"
              : item.type === "warning"
              ? "bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-950/30"
              : "bg-slate-900/90 text-slate-100 border-sky-500/40 shadow-sky-950/30"
          }`}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {item.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {item.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {item.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {item.type === "info" && <Info className="w-5 h-5 text-sky-400" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {item.title && <h4 className="text-xs font-bold mb-0.5">{item.title}</h4>}
            <p className="text-xs leading-relaxed text-slate-200">{item.message}</p>
          </div>

          {/* Close button */}
          <button
            onClick={() => onRemove(item.id)}
            className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
