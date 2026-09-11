"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { FileUploadStatus } from "@/hooks/use-documents";
import { formatBytes } from "@/lib/utils";

interface UploadProgressQueueProps {
  uploadQueue: FileUploadStatus[];
  isUploading: boolean;
  onClearQueue?: () => void;
}

export function UploadProgressQueue({
  uploadQueue,
  isUploading,
  onClearQueue,
}: UploadProgressQueueProps) {
  const isImageFile = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext || "");
  };

  const errorCount = uploadQueue.filter((q) => q.status === "error").length;
  const uploadingCount = uploadQueue.filter((q) => q.status === "uploading").length;

  return (
    <div className="flex flex-col space-y-3.5 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              uploadingCount > 0
                ? "bg-sky-500 animate-ping"
                : errorCount > 0
                ? "bg-rose-500"
                : "bg-emerald-500"
            }`}
          />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Uploading Process
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
            {uploadQueue.length} {uploadQueue.length === 1 ? "file" : "files"}
          </span>
        </div>

        {onClearQueue && !isUploading && (
          <button
            onClick={onClearQueue}
            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 font-medium transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear queue</span>
          </button>
        )}
      </div>

      {/* Progress Cards with Polished Backgrounds */}
      <div className="flex flex-col space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {uploadQueue.map((item) => {
          const isSuccess = item.status === "success";
          const isError = item.status === "error";
          const isItemUploading = item.status === "uploading";

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all shadow-sm space-y-2 ${
                isSuccess
                  ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70"
                  : isError
                  ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70"
                  : "bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isImageFile(item.name) ? (
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 shadow-sm">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 shrink-0 shadow-sm">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {formatBytes(item.size)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
                  {isItemUploading && (
                    <span className="text-sky-700 dark:text-sky-300 flex items-center gap-1.5 font-bold text-xs bg-sky-100/90 dark:bg-sky-900/60 px-2.5 py-1 rounded-full border border-sky-300/80 dark:border-sky-700">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{item.progress}%</span>
                    </span>
                  )}
                  {isSuccess && (
                    <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-bold text-xs bg-emerald-100/90 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full border border-emerald-300/80 dark:border-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Uploaded</span>
                    </span>
                  )}
                  {isError && (
                    <span className="text-rose-700 dark:text-rose-300 flex items-center gap-1 font-bold text-xs bg-rose-100/90 dark:bg-rose-900/60 px-2.5 py-1 rounded-full border border-rose-300/80 dark:border-rose-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{item.errorMessage || "Failed"}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar Track & Fill */}
              <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isError
                      ? "bg-rose-500"
                      : isSuccess
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-sky-500 to-cyan-400"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner with Enabled Assistant Button */}
      {!isUploading && uploadQueue.length > 0 && (
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs">
            {errorCount === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                  All documents synchronized successfully.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">
                  Upload finished with {errorCount} {errorCount === 1 ? "error" : "errors"}.
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/assistant"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span>Open Assistant</span>
              <Sparkles className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
