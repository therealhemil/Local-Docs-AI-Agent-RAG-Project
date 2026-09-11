"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Plus,
  ArrowUpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

export function UploadDropzone({ onUpload, isUploading }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onUpload(droppedFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onUpload(selectedFiles);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <ArrowUpCircle className="w-4 h-4 text-sky-500" />
          <span>Upload Documents & Images</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">PDF, DOCX, TXT, WEBP</span>
      </div>

      {/* Drag and Drop Zone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[240px] ${
          isDragOver
            ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 scale-[1.01] shadow-xl shadow-sky-500/15"
            : "border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 hover:border-sky-500/80 hover:bg-sky-50/30 dark:hover:bg-slate-850/60 shadow-sm"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md,.xls,.xlsx,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Dual Document & Image Icons */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-7 h-7 animate-bounce" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1 mb-4 max-w-sm">
          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            Drag & drop files here
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload PDFs, Word docs, or TXT. Files sync automatically to Google Drive.
          </p>
        </div>

        {/* Browse Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mb-4 pointer-events-none rounded-xl border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 font-semibold px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>Browse Files</span>
        </Button>

        {/* Format Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            📄 PDF • DOCX • TXT • MD
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-[11px] font-mono font-medium text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            Max 50MB
          </span>
        </div>
      </div>
    </div>
  );
}
