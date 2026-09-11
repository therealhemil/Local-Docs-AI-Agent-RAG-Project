"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content?: string | null;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to parse simple markdown formatting cleanly
  const renderFormattedText = (text?: string | null) => {
    if (!text || typeof text !== "string") {
      return null;
    }

    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      // Bold handling
      let formatted = line;

      // Handle headings
      if (formatted.startsWith("### ")) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1.5">
            {formatted.replace("### ", "")}
          </h4>
        );
      }
      if (formatted.startsWith("## ")) {
        return (
          <h3 key={lineIdx} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2">
            {formatted.replace("## ", "")}
          </h3>
        );
      }
      if (formatted.startsWith("# ")) {
        return (
          <h2 key={lineIdx} className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2">
            {formatted.replace("# ", "")}
          </h2>
        );
      }

      // Handle bullet lists
      if (formatted.startsWith("* ") || formatted.startsWith("- ")) {
        const itemText = formatted.slice(2);
        return (
          <li key={lineIdx} className="ml-4 list-disc text-sm text-slate-800 dark:text-slate-200 my-0.5">
            {renderInlineSpans(itemText)}
          </li>
        );
      }

      // Handle numbered lists (e.g. "1. ")
      const numMatch = formatted.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 ml-1 text-sm text-slate-800 dark:text-slate-200 my-1">
            <span className="font-semibold text-sky-600 dark:text-sky-400 shrink-0">{numMatch[1]}.</span>
            <span>{renderInlineSpans(numMatch[2])}</span>
          </div>
        );
      }

      if (formatted.trim() === "") {
        return <div key={lineIdx} className="h-2" />;
      }

      return (
        <p key={lineIdx} className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed my-1">
          {renderInlineSpans(formatted)}
        </p>
      );
    });
  };

  const renderInlineSpans = (text?: string | null) => {
    if (!text || typeof text !== "string") {
      return null;
    }

    // Split on **bold** and `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="italic text-slate-700 dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 font-mono text-xs text-sky-700 dark:text-sky-300 border border-slate-300/60 dark:border-slate-700/60"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return <div className="space-y-1">{renderFormattedText(content)}</div>;
}
