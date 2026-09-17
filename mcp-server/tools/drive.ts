import { mcpDriveClient, DriveFile } from "../lib/google-drive";
import { answerWithContext } from "../lib/ai";

// Default folder: use GOOGLE_DRIVE_ROOT_FOLDER_ID if set, else search all Drive
function getDefaultFolder(): string | undefined {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.MCP_DRIVE_FOLDER_ID || undefined;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ── Supported MIME types for text extraction ─────────────────────────────────
const READABLE_TYPES = new Set([
  "application/pdf",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

function isReadable(mimeType: string): boolean {
  return (
    READABLE_TYPES.has(mimeType) ||
    mimeType.startsWith("text/")
  );
}

/**
 * get_drive_status — check if Google Drive is connected.
 */
export async function getDriveStatus() {
  if (!mcpDriveClient.isConfigured()) {
    return {
      connected: false,
      message:
        "Google Drive is not connected. Run  npm run mcp:auth  to set up OAuth credentials.",
      setupCommand: "npm run mcp:auth",
    };
  }

  try {
    const files = await mcpDriveClient.listFiles({ maxResults: 1 });
    return {
      connected: true,
      message: "Google Drive is connected and accessible.",
      defaultFolder: getDefaultFolder() ?? "All of My Drive",
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Google Drive connection error: ${err.message}`,
      hint: "Your refresh token may be expired. Run  npm run mcp:auth  to reconnect.",
    };
  }
}

/**
 * list_drive_files — list files in Google Drive.
 */
export async function listDriveFiles(params?: {
  folderId?: string;
  maxResults?: number;
  fileType?: string; // e.g. "pdf", "document", "spreadsheet"
}) {
  const folderId = params?.folderId ?? getDefaultFolder();
  const maxResults = params?.maxResults ?? 30;

  // Map friendly type names to MIME type filters
  const typeMap: Record<string, string> = {
    pdf: "application/pdf",
    document: "application/vnd.google-apps.document",
    doc: "application/vnd.google-apps.document",
    spreadsheet: "application/vnd.google-apps.spreadsheet",
    sheet: "application/vnd.google-apps.spreadsheet",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    presentation: "application/vnd.google-apps.presentation",
    folder: "application/vnd.google-apps.folder",
    txt: "text/plain",
    csv: "text/csv",
  };

  const mimeFilter = params?.fileType ? typeMap[params.fileType.toLowerCase()] : undefined;

  const files = await mcpDriveClient.listFiles({ folderId, maxResults, mimeType: mimeFilter });

  if (files.length === 0) {
    return {
      files: [],
      total: 0,
      message: folderId
        ? `No files found in folder ${folderId}.`
        : "No files found in Google Drive.",
    };
  }

  return {
    total: files.length,
    folder: folderId ?? "All of My Drive",
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.mimeType.split(".").pop()?.split("/").pop() ?? f.mimeType,
      mimeType: f.mimeType,
      size: formatBytes(f.size),
      canRead: isReadable(f.mimeType),
      modifiedAt: f.modifiedTime ?? null,
      link: f.webViewLink ?? null,
    })),
  };
}

/**
 * search_drive — search Drive files by name.
 */
export async function searchDrive(params: {
  query: string;
  maxResults?: number;
}) {
  const { query, maxResults = 15 } = params;

  const files = await mcpDriveClient.searchFiles(query, maxResults);

  if (files.length === 0) {
    return { files: [], total: 0, message: `No files found matching "${query}".` };
  }

  return {
    total: files.length,
    query,
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: formatBytes(f.size),
      canRead: isReadable(f.mimeType),
      modifiedAt: f.modifiedTime ?? null,
      link: f.webViewLink ?? null,
    })),
  };
}

/**
 * read_drive_file — extract and return the text content of a Drive file.
 */
export async function readDriveFile(params: { fileId: string }) {
  const { fileId } = params;

  const meta = await mcpDriveClient.getFileMeta(fileId);

  if (!isReadable(meta.mimeType)) {
    return {
      error: `Cannot extract text from "${meta.name}" (${meta.mimeType}). Supported formats: PDF, Google Docs, Google Sheets, DOCX, TXT, CSV, Markdown.`,
      file: { id: meta.id, name: meta.name, mimeType: meta.mimeType },
    };
  }

  const text = await mcpDriveClient.extractText(fileId, meta.mimeType);

  return {
    file: {
      id: meta.id,
      name: meta.name,
      mimeType: meta.mimeType,
      modifiedAt: meta.modifiedTime ?? null,
      link: meta.webViewLink ?? null,
    },
    contentLength: text.length,
    content: text,
  };
}

/**
 * ask_about_drive — search Drive for relevant files, extract text, answer via AI.
 */
export async function askAboutDrive(params: {
  question: string;
  fileIds?: string[];      // specific files to read
  searchQuery?: string;    // or search by name
  folderId?: string;
  userId?: string;
}) {
  const { question, fileIds, searchQuery, folderId, userId } = params;

  let targetFiles: DriveFile[] = [];

  // Use explicit fileIds if provided
  if (fileIds && fileIds.length > 0) {
    targetFiles = await Promise.all(fileIds.map((id) => mcpDriveClient.getFileMeta(id)));
  } else if (searchQuery) {
    // Search by name
    targetFiles = await mcpDriveClient.searchFiles(searchQuery, 5);
  } else {
    // List all readable files in the default folder and pick up to 5 most recent
    const allFiles = await mcpDriveClient.listFiles({
      folderId: folderId ?? getDefaultFolder(),
      maxResults: 20,
    });
    targetFiles = allFiles.filter((f) => isReadable(f.mimeType)).slice(0, 5);
  }

  const readableFiles = targetFiles.filter((f) => isReadable(f.mimeType));

  if (readableFiles.length === 0) {
    return {
      answer:
        "No readable documents found in your Google Drive to answer this question. Make sure you have PDF, Google Docs, Sheets, DOCX, or text files in your Drive.",
      files: [],
      via: "none",
    };
  }

  // Extract text from all matching files (in parallel, capped at 5)
  const filesToRead = readableFiles.slice(0, 5);
  const extractions = await Promise.allSettled(
    filesToRead.map((f) => mcpDriveClient.extractText(f.id, f.mimeType))
  );

  const contextParts: string[] = [];
  const successfulFiles: string[] = [];

  filesToRead.forEach((f, i) => {
    const result = extractions[i];
    if (result.status === "fulfilled" && result.value.trim()) {
      contextParts.push(`=== ${f.name} ===\n${result.value}`);
      successfulFiles.push(f.name);
    }
  });

  if (contextParts.length === 0) {
    return {
      answer: "Could not extract text from the found files. They may be images or protected documents.",
      files: filesToRead.map((f) => f.name),
      via: "none",
    };
  }

  const context = contextParts.join("\n\n");
  const { answer, via } = await answerWithContext({
    question,
    context,
    fileNames: successfulFiles,
    userId,
  });

  return {
    answer,
    via,
    filesRead: successfulFiles,
    totalFiles: readableFiles.length,
  };
}
