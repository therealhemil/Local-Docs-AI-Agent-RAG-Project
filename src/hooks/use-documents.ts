"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentDTO } from "@/types";
import { useAuth } from "./use-auth";

export interface FileUploadStatus {
  file: File;
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadStatus[]>([]);
  const { user } = useAuth();

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFiles = async (
    files: File[],
    callbacks?: {
      onDuplicateFound?: (duplicateNames: string[]) => void;
      onSuccess?: (uploadedCount: number) => void;
    }
  ) => {
    if (!files || files.length === 0) return;

    // 1. Check for duplicate files against existing documents
    const duplicateFiles: string[] = [];
    const validFiles: File[] = [];

    for (const f of files) {
      const isDuplicate = documents.some(
        (doc) => doc.originalFileName.toLowerCase() === f.name.toLowerCase()
      );

      if (isDuplicate) {
        duplicateFiles.push(f.name);
      } else {
        // Also check against current batch
        const alreadyInBatch = validFiles.some(
          (bf) => bf.name.toLowerCase() === f.name.toLowerCase()
        );
        if (alreadyInBatch) {
          duplicateFiles.push(f.name);
        } else {
          validFiles.push(f);
        }
      }
    }

    if (duplicateFiles.length > 0 && callbacks?.onDuplicateFound) {
      callbacks.onDuplicateFound(duplicateFiles);
    }

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    const initialQueue: FileUploadStatus[] = validFiles.map((f) => ({
      file: f,
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: f.size,
      progress: 10,
      status: "uploading",
    }));

    setUploadQueue((prev) => [...prev, ...initialQueue]);

    let successfulUploads = 0;

    for (const item of initialQueue) {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("name", user?.name || "Unknown");

      try {
        // Animate progress to 60%
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 60 } : q))
        );

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (res.ok && (!data.errors || data.errors.length === 0)) {
          successfulUploads++;
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, progress: 100, status: "success" } : q
            )
          );
        } else {
          const errMsg = data.errors?.[0]?.error || data.error || "Upload failed";
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, progress: 100, status: "error", errorMessage: errMsg }
                : q
            )
          );
        }
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, progress: 100, status: "error", errorMessage: err.message || "Network error" }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    await fetchDocuments();

    if (successfulUploads > 0 && callbacks?.onSuccess) {
      callbacks.onSuccess(successfulUploads);
    }
  };

  const deleteDocument = async (id: string, name:string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        body: JSON.stringify({
          fileName: name
        })
      });      

      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete document");
      }
    } catch (err) {
      console.error("Delete document error:", err);
      throw err;
    }
  };

  const clearQueue = () => {
    setUploadQueue([]);
  };

  return {
    documents,
    isLoading,
    isUploading,
    uploadQueue,
    uploadFiles,
    deleteDocument,
    refreshDocuments: fetchDocuments,
    clearQueue,
  };
}
