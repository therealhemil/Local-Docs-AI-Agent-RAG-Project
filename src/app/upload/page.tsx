"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/ui/header";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { UploadProgressQueue } from "@/components/documents/upload-progress-queue";
import { DocumentList } from "@/components/documents/document-list";
import { CustomDialog } from "@/components/ui/custom-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, HardDrive, ShieldCheck, Loader2, UploadCloud } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { documents, isLoading: docsLoading, isUploading, uploadQueue, uploadFiles, deleteDocument, clearQueue } = useDocuments();

  const [duplicateFilesAlert, setDuplicateFilesAlert] = useState<string[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/onboarding");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  const handleUploadFiles = (files: File[]) => {
    // Regex check for image extensions as a fallback for missing MIME types
    const imageExtensionRegex = /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff?)$/i;

    // Identify invalid image files
    const imageFiles = files.filter((file) => file.type.startsWith("image/") || imageExtensionRegex.test(file.name));

    // If any image is found, stop upload and show error
    if (imageFiles.length > 0) {
      const invalidNames = imageFiles.map((f) => f.name).join(", ");
      toast.error(`Image uploads are not allowed: ${invalidNames}. Please upload documents only (PDF, DOCX, TXT, XLS, CSV, XLSX etc.).`, "Unsupported File Type");
      return; // Stop execution
    }

    uploadFiles(files, {
      onDuplicateFound: (duplicateNames) => {
        setDuplicateFilesAlert(duplicateNames);
        toast.warning(`"${duplicateNames.join(", ")}" is already uploaded in your workspace.`, "Duplicate File");
      },
      onSuccess: (count) => {
        toast.success(`Successfully uploaded ${count} file${count > 1 ? "s" : ""} to Google Drive!`, "Upload Complete");
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/40">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Single-Column Stacked Layout */}
        <div className="flex flex-col space-y-8">
          {/* Workspace Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Workspace Hub • {user?.name}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Document Workspace</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Upload documents to synchronize with Google Drive and manage your files below.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isUploading ? (
                <Button
                  size="md"
                  disabled
                  className="gap-2 opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 shadow-none pointer-events-none"
                  title="Upload in progress. Button will re-enable once upload is complete."
                >
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>Uploading Files...</span>
                </Button>
              ) : (
                <Link href="/assistant">
                  <Button size="md" className="gap-2 shadow-md shadow-sky-500/20">
                    <span>Open Assistant</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* 1. Upload Documents Box */}
          <div className="w-full">
            <UploadDropzone onUpload={handleUploadFiles} isUploading={isUploading} />
          </div>

          {/* 2. Uploading Process Tracker */}
          {uploadQueue.length > 0 && (
            <div className="w-full">
              <UploadProgressQueue uploadQueue={uploadQueue} isUploading={isUploading} onClearQueue={clearQueue} />
            </div>
          )}

          {/* 3. Workspace Files List */}
          <div className="w-full pt-2">
            <DocumentList documents={documents} isLoading={docsLoading} onDelete={deleteDocument} />
          </div>
        </div>
      </main>

      {/* Custom Alert Box for Duplicate Files */}
      <CustomDialog
        isOpen={!!duplicateFilesAlert}
        type="warning"
        title="Duplicate File Detected"
        message={
          duplicateFilesAlert?.length === 1
            ? `The file "${duplicateFilesAlert[0]}" is already uploaded in your workspace. Duplicate files are not re-uploaded.`
            : `The following files are already uploaded in your workspace: ${duplicateFilesAlert?.map((f) => `"${f}"`).join(", ")}. Duplicate files are not re-uploaded.`
        }
        confirmText="Understood"
        onConfirm={() => setDuplicateFilesAlert(null)}
      />

      <footer className="py-6 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400">
        All documents and images securely synchronized with Google Drive and PostgreSQL.
      </footer>
    </div>
  );
}
