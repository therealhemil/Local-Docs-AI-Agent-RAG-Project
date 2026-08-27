import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a username for consistent case-insensitive and whitespace-insensitive matching.
 * e.g., "  Hemil   Patel  " -> "hemil patel"
 */
export function normalizeUsername(name: string): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Formats byte size to human-readable string (e.g. 4.2 MB)
 */
export function formatBytes(bytes?: number | bigint | string | null, decimals = 1): string {
  if (bytes === undefined || bytes === null) return "0 B";
  const num = typeof bytes === "bigint" ? Number(bytes) : Number(bytes);
  if (isNaN(num) || num === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(num) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);

  return `${parseFloat((num / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Formats an ISO date string to a clean relative date (e.g. "Today", "Yesterday", "Aug 27, 2026")
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
