import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

// Lazy-require heavy parsers to keep startup fast
let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null;
let mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } | null = null;

async function getPdfParse(): Promise<(buffer: Buffer) => Promise<{ text: string }>> {
  if (!pdfParse) {
    const mod: any = await import("pdf-parse");
    pdfParse = mod.default || mod;
  }
  return pdfParse as (buffer: Buffer) => Promise<{ text: string }>;
}
async function getMammoth() {
  if (!mammoth) mammoth = (await import("mammoth")) as any;
  return mammoth!;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number | null;
  modifiedTime?: string | null;
  webViewLink?: string | null;
  parents?: string[];
}

export class MCPGoogleDriveClient {
  private drive: drive_v3.Drive | null = null;
  private configured = false;

  constructor() {
    this.init();
  }

  private init() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob";

    if (clientId && clientSecret && refreshToken) {
      try {
        const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        auth.setCredentials({ refresh_token: refreshToken });
        this.drive = google.drive({ version: "v3", auth });
        this.configured = true;
      } catch (err) {
        console.error("[MCP Drive] Failed to init Google Drive client:", err);
      }
    }
  }

  isConfigured() {
    return this.configured && this.drive !== null;
  }

  requireDrive(): drive_v3.Drive {
    if (!this.drive || !this.configured) {
      throw new Error(
        "Google Drive is not connected. Run  npm run mcp:auth  to set up OAuth credentials."
      );
    }
    return this.drive;
  }

  /**
   * List files in a Drive folder (or all of Drive if no folderId given).
   */
  async listFiles(params?: {
    folderId?: string;
    maxResults?: number;
    mimeType?: string;
  }): Promise<DriveFile[]> {
    const drive = this.requireDrive();
    const { folderId, maxResults = 50, mimeType } = params ?? {};

    let query = "trashed = false";
    if (folderId) query += ` and '${folderId}' in parents`;
    if (mimeType) query += ` and mimeType = '${mimeType}'`;

    const res = await drive.files.list({
      q: query,
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
      orderBy: "modifiedTime desc",
    });

    return (res.data.files ?? []).map((f) => ({
      id: f.id!,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "application/octet-stream",
      size: f.size ? Number(f.size) : null,
      modifiedTime: f.modifiedTime ?? null,
      webViewLink: f.webViewLink ?? null,
      parents: f.parents ?? [],
    }));
  }

  /**
   * Search files by name or type in Drive.
   */
  async searchFiles(query: string, maxResults = 20): Promise<DriveFile[]> {
    const drive = this.requireDrive();

    const q = `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`;

    const res = await drive.files.list({
      q,
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
    });

    return (res.data.files ?? []).map((f) => ({
      id: f.id!,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "application/octet-stream",
      size: f.size ? Number(f.size) : null,
      modifiedTime: f.modifiedTime ?? null,
      webViewLink: f.webViewLink ?? null,
    }));
  }

  /**
   * Get file metadata.
   */
  async getFileMeta(fileId: string): Promise<DriveFile> {
    const drive = this.requireDrive();
    const res = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, modifiedTime, webViewLink, parents",
    });
    const f = res.data;
    return {
      id: f.id!,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "application/octet-stream",
      size: f.size ? Number(f.size) : null,
      modifiedTime: f.modifiedTime ?? null,
      webViewLink: f.webViewLink ?? null,
      parents: f.parents ?? [],
    };
  }

  /**
   * Extract text content from a Drive file.
   * Supports: Google Docs, Google Sheets, PDF, DOCX, TXT, Markdown, CSV.
   */
  async extractText(fileId: string, mimeType: string): Promise<string> {
    const drive = this.requireDrive();

    // ── Google Workspace formats — export as plain text ──────────────────────
    const googleExportMap: Record<string, string> = {
      "application/vnd.google-apps.document": "text/plain",
      "application/vnd.google-apps.spreadsheet": "text/csv",
      "application/vnd.google-apps.presentation": "text/plain",
    };

    if (googleExportMap[mimeType]) {
      const res = await drive.files.export(
        { fileId, mimeType: googleExportMap[mimeType] },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(res.data as ArrayBuffer).toString("utf-8").slice(0, 50_000);
    }

    // ── Binary formats — download and parse ──────────────────────────────────
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);

    if (mimeType === "application/pdf") {
      const parse = await getPdfParse();
      const result = await parse(buffer);
      return result.text.slice(0, 50_000);
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const m = await getMammoth();
      const result = await m.extractRawText({ buffer });
      return result.value.slice(0, 50_000);
    }

    // Plain text, CSV, Markdown, etc.
    return buffer.toString("utf-8").slice(0, 50_000);
  }

  /**
   * Extract text from all readable files inside a Drive folder.
   */
  async extractFolderText(
    folderId: string,
    maxFiles = 10
  ): Promise<{ fileName: string; text: string }[]> {
    const files = await this.listFiles({ folderId, maxResults: maxFiles });
    const results: { fileName: string; text: string }[] = [];

    for (const f of files) {
      if (f.mimeType === "application/vnd.google-apps.folder") continue;
      try {
        const text = await this.extractText(f.id, f.mimeType);
        if (text && text.trim()) {
          results.push({ fileName: f.name, text });
        }
      } catch (err) {
        console.warn(`[GoogleDrive] Could not extract text from ${f.name}:`, err);
      }
    }

    return results;
  }
}

export const mcpDriveClient = new MCPGoogleDriveClient();
