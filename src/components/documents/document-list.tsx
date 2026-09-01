"use client";

import React, { useState } from "react";
import { DocumentDTO } from "@/types";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import { DocumentStatusBadge } from "@/components/ui/badge";
import { CustomDialog } from "@/components/ui/custom-dialog";
import { useToast } from "@/components/ui/toast";
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  HardDrive,
  Loader2,
  Files,
  Sparkles,
} from "lucide-react";

interface DocumentListProps {
  documents: DocumentDTO[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onUploadClick?: () => void;
}

export function DocumentList({ documents, isLoading, onDelete, onUploadClick }: DocumentListProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsConfirmingDelete(true);
      setDeletingId(itemToDelete.id);
      await onDelete(itemToDelete.id);
      toast.success(`"${itemToDelete.name}" was removed from your workspace.`);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file.");
    } finally {
      setIsConfirmingDelete(false);
      setDeletingId(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    // const ext = fileName.split(".").pop()?.toLowerCase();
    // if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext || "")) {
    //   return (
    //     <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
    //       <ImageIcon className="w-5 h-5" />
    //     </div>
    //   );
    // }
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-sm">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  const totalBytes = documents.reduce((acc, doc) => {
    const size = typeof doc.fileSize === "number" ? doc.fileSize : Number(doc.fileSize || 0);
    return acc + (isNaN(size) ? 0 : size);
  }, 0);

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
        <span className="text-xs font-semibold">Loading workspace files...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center bg-white/80 dark:bg-slate-900/80">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Files className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
          No files in workspace yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Upload documents from the left panel to sync them with Google Drive.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col space-y-3.5">
        {/* Header with Metrics */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Files className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Workspace Files
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
              {documents.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>{formatBytes(totalBytes)}</span>
          </div>
        </div>

        {/* Uploaded Files List */}
        <div className="flex flex-col space-y-2.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm hover:shadow-md hover:border-sky-500/50 dark:hover:border-sky-500/40 transition-all flex items-center justify-between gap-3"
            >
              {/* File Info */}
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(doc.originalFileName)}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-50 truncate block">
                      {doc.originalFileName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {formatBytes(doc.fileSize)}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeDate(doc.createdAt)}</span>
                    {doc.googleDriveFileId && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60">
                          <HardDrive className="w-3 h-3 text-sky-500" />
                          <span>Google Drive</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Status Badge & Delete Action */}
              <div className="flex items-center gap-2.5 shrink-0">
                <DocumentStatusBadge status={doc.status} />

                <button
                  onClick={() => setItemToDelete({ id: doc.id, name: doc.originalFileName })}
                  disabled={deletingId === doc.id}
                  title="Delete file"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Delete Confirmation Dialog */}
      <CustomDialog
        isOpen={!!itemToDelete}
        type="danger"
        title="Delete Document?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This file will be removed from your Google Drive and PostgreSQL workspace.`}
        confirmText="Delete Document"
        cancelText="Cancel"
        isLoading={isConfirmingDelete}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  );
}
