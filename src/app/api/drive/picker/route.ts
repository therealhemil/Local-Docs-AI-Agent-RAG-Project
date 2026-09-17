import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { googleTokenService } from "@/services/google-token.service";
import { driveToolsService } from "@/services/drive-tools.service";
import { mcpDriveClient } from "../../../../../mcp-server/lib/google-drive";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function formatBytes(bytes?: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") || undefined;
  const query = searchParams.get("q") || undefined;

  try {
    const session = await getCurrentSession(req);
    const userId = session?.userId || "default-user";

    // 1. Check if user has authenticated personal Google Drive via OAuth
    const isUserConnected = await googleTokenService.isUserConnected(userId);
    if (isUserConnected) {
      try {
        const auth = await googleTokenService.getAuthenticatedClient(userId);
        const files = await driveToolsService.searchDrive(auth, query || "*", 40);

        const items = files.map((f) => {
          const isFolder = f.mimeType === "application/vnd.google-apps.folder";
          return {
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            isFolder,
            size: isFolder ? null : formatBytes(f.size),
            modifiedTime: f.modifiedTime,
            webViewLink: f.webViewLink,
          };
        });

        // Sort folders first, then alphabetical
        items.sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
        });

        return NextResponse.json({
          configured: true,
          currentFolderId: folderId || null,
          items,
        });
      } catch (userDriveErr) {
        console.warn("[API: /api/drive/picker] User drive fetch error, falling back:", userDriveErr);
      }
    }

    // 2. Global MCP client fallback
    if (mcpDriveClient.isConfigured()) {
      let files: any[] = [];

      if (query && query.trim()) {
        files = await mcpDriveClient.searchFiles(query.trim(), 40);
      } else {
        files = await mcpDriveClient.listFiles({ folderId, maxResults: 50 });
      }

      const items = files.map((f) => {
        const isFolder = f.mimeType === "application/vnd.google-apps.folder";
        return {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          isFolder,
          size: isFolder ? null : formatBytes(f.size),
          modifiedTime: f.modifiedTime,
          webViewLink: f.webViewLink,
        };
      });

      items.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json({
        configured: true,
        currentFolderId: folderId || null,
        items,
      });
    }

    // 3. Fallback: check local simulated drive storage (.drive-storage)
    const localDir = path.join(process.cwd(), ".drive-storage");
    const localItems: any[] = [];

    if (fs.existsSync(localDir)) {
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".")) continue; // Skip hidden dirs like .tokens
        if (query && !e.name.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        const fullPath = path.join(localDir, e.name);
        const stat = fs.statSync(fullPath);
        localItems.push({
          id: `local_${Buffer.from(e.name).toString("hex")}`,
          name: e.name,
          mimeType: e.isDirectory() ? "application/vnd.google-apps.folder" : "application/octet-stream",
          isFolder: e.isDirectory(),
          size: e.isDirectory() ? null : formatBytes(stat.size),
          modifiedTime: stat.mtime.toISOString(),
          webViewLink: null,
        });
      }
    }

    return NextResponse.json({
      configured: false,
      message: "Google Drive OAuth is not connected. Click 'Connect Google Drive' in the header to authenticate.",
      currentFolderId: null,
      items: localItems,
    });
  } catch (error: any) {
    console.error("[API: /api/drive/picker] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Drive items", items: [] },
      { status: 500 }
    );
  }
}
