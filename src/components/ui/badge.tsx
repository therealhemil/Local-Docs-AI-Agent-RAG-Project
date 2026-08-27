import React from "react";
import { cn } from "@/lib/utils";
import { DocumentStatus } from "@/types";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
    error: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/50",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/50",
    outline: "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case "UPLOADED":
    case "READY":
      return (
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {status === "READY" ? "Ready" : "Uploaded"}
        </Badge>
      );
    case "PROCESSING":
    case "UPLOADING":
      return (
        <Badge variant="info">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
          {status === "UPLOADING" ? "Uploading..." : "Processing..."}
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="error">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Failed
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
