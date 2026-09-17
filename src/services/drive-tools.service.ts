import { google, drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

// Lazy-loaded binary parsers to keep cold start fast and memory optimal
let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null;
let mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } | null = null;

async function getPdfParse() {
  if (!pdfParse) {
    const mod: any = await import("pdf-parse");
    pdfParse = mod.default || mod;
  }
  return pdfParse!;
}

async function getMammoth() {
  if (!mammoth) {
    mammoth = (await import("mammoth")) as any;
  }
  return mammoth!;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number | null;
  modifiedTime?: string | null;
  webViewLink?: string | null;
  description?: string | null;
}

export interface DriveReadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  content: string;
  charCount: number;
}

export class DriveToolsService {
  /**
   * Searches Google Drive files using file name and fullText filters.
   * Strictly returns metadata without saving anything to disk.
   */
  async searchDrive(
    auth: OAuth2Client,
    query: string,
    maxResults = 10
  ): Promise<DriveFileMetadata[]> {
    const drive = google.drive({ version: "v3", auth });
    const trimmed = (query || "").trim();

    let q = "trashed = false";

    if (trimmed && trimmed !== "*") {
      const terms = trimmed
        .split(/\s+/)
        .map((t) => t.replace(/['\\]/g, "\\$&").trim())
        .filter((t) => t.length > 1);

      if (terms.length > 0) {
        const clauses = terms.map(
          (t) => `(name contains '${t}' or fullText contains '${t}')`
        );
        q = `(${clauses.join(" or ")}) and trashed = false`;
      }
    }

    try {
      const res = await drive.files.list({
        q,
        pageSize: Math.min(maxResults, 30),
        fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, description)",
        orderBy: "modifiedTime desc",
      });

      return (res.data.files ?? []).map((f) => ({
        id: f.id!,
        name: f.name ?? "Untitled",
        mimeType: f.mimeType ?? "application/octet-stream",
        size: f.size ? Number(f.size) : null,
        modifiedTime: f.modifiedTime ?? null,
        webViewLink: f.webViewLink ?? null,
        description: f.description ?? null,
      }));
    } catch (error: any) {
      console.error("[DriveToolsService] searchDrive error:", error);
      // Fallback query if fullText is not supported on certain file types
      if (trimmed && error?.message?.includes("Invalid Value")) {
        const fallbackQ = `name contains '${trimmed.replace(/['\\]/g, "\\$&")}' and trashed = false`;
        const fallbackRes = await drive.files.list({
          q: fallbackQ,
          pageSize: maxResults,
          fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, description)",
        });
        return (fallbackRes.data.files ?? []).map((f) => ({
          id: f.id!,
          name: f.name ?? "Untitled",
          mimeType: f.mimeType ?? "application/octet-stream",
          size: f.size ? Number(f.size) : null,
          modifiedTime: f.modifiedTime ?? null,
          webViewLink: f.webViewLink ?? null,
          description: f.description ?? null,
        }));
      }
      throw error;
    }
  }

  /**
   * Reads file content ENTIRELY IN MEMORY.
   * Google Docs are exported as text/plain, Google Sheets as text/csv, PDFs parsed with pdf-parse,
   * DOCX with mammoth, and raw text formats read directly from memory buffer.
   * NEVER writes or persists files to the local file system.
   */
  async readDriveFile(
    auth: OAuth2Client,
    fileId: string,
    providedMimeType?: string
  ): Promise<DriveReadResult> {
    const drive = google.drive({ version: "v3", auth });

    // 1. Fetch metadata if mimeType or name is missing
    let mimeType = providedMimeType;
    let fileName = "Document";

    const meta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType",
    });
    fileName = meta.data.name || "Document";
    mimeType = meta.data.mimeType || mimeType || "application/octet-stream";

    let rawText = "";

    // 2. Google Workspace Formats -> Export in-memory
    const googleExportMap: Record<string, string> = {
      "application/vnd.google-apps.document": "text/plain",
      "application/vnd.google-apps.spreadsheet": "text/csv",
      "application/vnd.google-apps.presentation": "text/plain",
    };

    if (googleExportMap[mimeType]) {
      const exportMime = googleExportMap[mimeType];
      const res = await drive.files.export(
        { fileId, mimeType: exportMime },
        { responseType: "arraybuffer" }
      );
      rawText = Buffer.from(res.data as ArrayBuffer).toString("utf-8");
    } else {
      // 3. Binary & Standard Formats -> Fetch stream directly into in-memory ArrayBuffer
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      const buffer = Buffer.from(res.data as ArrayBuffer);

      if (mimeType === "application/pdf") {
        const parse = await getPdfParse();
        const parsed = await parse(buffer);
        rawText = parsed.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const m = await getMammoth();
        const parsed = await m.extractRawText({ buffer });
        rawText = parsed.value;
      } else {
        // Plain text, Markdown, CSV, JSON, HTML, etc.
        rawText = buffer.toString("utf-8");
      }
    }

    // Safety cap at 50,000 characters to prevent LLM context exhaustion
    const MAX_CHARS = 50_000;
    const content = rawText.length > MAX_CHARS
      ? `${rawText.slice(0, MAX_CHARS)}\n\n[... Remaining content truncated in-memory for length ...]`
      : rawText;

    return {
      fileId,
      fileName,
      mimeType,
      content,
      charCount: content.length,
    };
  }
}

export const driveToolsService = new DriveToolsService();
