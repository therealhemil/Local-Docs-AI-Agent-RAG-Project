"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  Search,
  X,
  Check,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  File,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size?: string | null;
  modifiedTime?: string | null;
  webViewLink?: string | null;
}

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (items: DriveItem[]) => void;
  initialSelected?: DriveItem[];
}

export function DrivePickerModal({
  isOpen,
  onClose,
  onSelectItems,
  initialSelected = [],
}: DrivePickerModalProps) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "files" | "folders">("all");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: "My Drive" },
  ]);

  const [selectedItems, setSelectedItems] = useState<DriveItem[]>(initialSelected);

  // Sync initialSelected when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedItems(initialSelected);
      fetchDriveItems(currentFolderId, searchQuery);
    }
  }, [isOpen]);

  const fetchDriveItems = async (folderId?: string | null, query?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (query && query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/drive/picker?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load Google Drive items");
      }

      setConfigured(data.configured);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Drive items");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDriveItems(currentFolderId, searchQuery);
  };

  const handleNavigateFolder = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setFolderBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery("");
    fetchDriveItems(folder.id, "");
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = folderBreadcrumbs[index];
    const newCrumbs = folderBreadcrumbs.slice(0, index + 1);
    setFolderBreadcrumbs(newCrumbs);
    setCurrentFolderId(target.id);
    setSearchQuery("");
    fetchDriveItems(target.id, "");
  };

  const toggleSelectItem = (item: DriveItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleConfirm = () => {
    onSelectItems(selectedItems);
    onClose();
  };

  if (!isOpen) return null;

  // Filter items by tab
  const displayedItems = items.filter((item) => {
    if (filterType === "files") return !item.isFolder;
    if (filterType === "folders") return item.isFolder;
    return true;
  });

  const getFileIcon = (mimeType: string, isFolder: boolean) => {
    if (isFolder) {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (mimeType.includes("document") || mimeType.includes("word")) {
      return <FileText className="w-5 h-5 text-sky-500" />;
    }
    if (mimeType.includes("code") || mimeType.includes("javascript") || mimeType.includes("json")) {
      return <FileCode className="w-5 h-5 text-purple-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl max-h-[88vh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 87.3 78" fill="none">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.25z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Add from Google Drive
              </h2>
              <p className="text-[11px] text-slate-500">
                Select files or folders to search and ask questions about directly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Breadcrumb Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/40">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Drive files by name..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    fetchDriveItems(currentFolderId, "");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button type="submit" size="sm" variant="outline" className="text-xs shrink-0">
              Search
            </Button>
          </form>

          {/* Breadcrumb Navigation & Filter Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 shrink-0">
              {folderBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`hover:text-sky-600 dark:hover:text-sky-400 truncate max-w-[120px] ${
                      idx === folderBreadcrumbs.length - 1
                        ? "font-bold text-sky-600 dark:text-sky-400"
                        : "text-slate-500"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 shrink-0">
              {(["all", "files", "folders"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterType(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                    filterType === tab
                      ? "bg-sky-500 text-white dark:bg-sky-500 dark:text-slate-950"
                      : "text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[260px] max-h-[420px]">
          {!configured && (
            <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Google Drive not connected yet:</span> Run{" "}
                <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">npm run mcp:auth</code> in your terminal or add your Google credentials to .env to access live cloud files.
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
              <span>Fetching Google Drive items...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-rose-500 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={() => fetchDriveItems(currentFolderId)}>
                Retry
              </Button>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs">
              <Folder className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p>No {filterType} found in this folder.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayedItems.map((item) => {
                const isSelected = selectedItems.some((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectItem(item)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400/50 shadow-sm"
                        : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectItem(item);
                        }}
                        className="text-slate-400 hover:text-sky-500"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-500 fill-sky-500/20" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* File / Folder Icon */}
                      <div className="shrink-0">{getFileIcon(item.mimeType, item.isFolder)}</div>

                      {/* Name & Details */}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {item.isFolder ? (
                            <span className="font-bold text-amber-500">Folder</span>
                          ) : (
                            <span>{item.size || "Drive Doc"}</span>
                          )}
                          {item.modifiedTime && (
                            <span>• {new Date(item.modifiedTime).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* If folder: Open button */}
                    {item.isFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateFolder(item);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-xl flex items-center gap-1 shrink-0 ml-2"
                        title="Browse inside this folder"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedItems.length > 0 ? (
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"} selected
              </span>
            ) : (
              <span>Select files or folders to attach</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="gap-1.5 text-xs shadow-md shadow-sky-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {selectedItems.length > 0
                  ? `Add ${selectedItems.length} to Chat`
                  : "Add from Drive"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
