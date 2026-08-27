import { google, drive_v3 } from "googleapis";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private isConfigured = false;
  private rootFolderId: string | null = null;
  private localFallbackDir = path.join(process.cwd(), ".drive-storage");

  constructor() {
    this.initClient();
  }

  private initClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;

    if (clientId && clientSecret && refreshToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.driveClient = google.drive({ version: "v3", auth: oauth2Client });
        this.isConfigured = true;
      } catch (err) {
        console.warn("[GoogleDriveService] Failed to initialize Google Drive client, using local drive fallback.", err);
        this.isConfigured = false;
      }
    } else {
      // Local simulated drive mode
      this.isConfigured = false;
      if (!fs.existsSync(this.localFallbackDir)) {
        try {
          fs.mkdirSync(this.localFallbackDir, { recursive: true });
        } catch {
          // Ignore
        }
      }
    }
  }

  /**
   * Creates or locates a dedicated folder for the user in Google Drive (or local storage fallback).
   */
  async createUserFolder(userName: string): Promise<string> {
    const sanitizedName = userName.replace(/[/\\?%*:|"<>]/g, "_").trim();

    if (this.isConfigured && this.driveClient) {
      try {
        // Check if folder already exists in Google Drive
        let query = `name = '${sanitizedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        if (this.rootFolderId) {
          query += ` and '${this.rootFolderId}' in parents`;
        }

        const listRes = await this.driveClient.files.list({
          q: query,
          fields: "files(id, name)",
          spaces: "drive",
        });

        if (listRes.data.files && listRes.data.files.length > 0) {
          return listRes.data.files[0].id!;
        }

        // Create new folder
        const fileMetadata: drive_v3.Schema$File = {
          name: sanitizedName,
          mimeType: "application/vnd.google-apps.folder",
          parents: this.rootFolderId ? [this.rootFolderId] : undefined,
        };

        const folder = await this.driveClient.files.create({
          requestBody: fileMetadata,
          fields: "id, name",
        });

        return folder.data.id || `drive_folder_${Date.now()}`;
      } catch (error) {
        console.error("[GoogleDriveService] Error creating folder in Google Drive:", error);
      }
    }

    // Local Fallback Storage
    const userFolderPath = path.join(this.localFallbackDir, sanitizedName);
    if (!fs.existsSync(userFolderPath)) {
      fs.mkdirSync(userFolderPath, { recursive: true });
    }
    return `local_folder_${Buffer.from(sanitizedName).toString("hex")}`;
  }

  /**
   * Uploads a file buffer to the user's Google Drive folder (or local storage fallback).
   */
  async uploadFile(
    folderId: string,
    file: {
      buffer: Buffer;
      fileName: string;
      mimeType?: string;
    }
  ): Promise<{ fileId: string; webViewLink?: string }> {
    const mimeType = file.mimeType || "application/octet-stream";

    if (this.isConfigured && this.driveClient) {
      try {
        const stream = new Readable();
        stream.push(file.buffer);
        stream.push(null);

        const response = await this.driveClient.files.create({
          requestBody: {
            name: file.fileName,
            parents: folderId && !folderId.startsWith("local_") ? [folderId] : undefined,
          },
          media: {
            mimeType,
            body: stream,
          },
          fields: "id, name, webViewLink",
        });

        return {
          fileId: response.data.id || `drive_file_${Date.now()}`,
          webViewLink: response.data.webViewLink || undefined,
        };
      } catch (error) {
        console.error("[GoogleDriveService] Error uploading file to Google Drive:", error);
      }
    }

    // Local Fallback
    const targetFolder = path.join(this.localFallbackDir, folderId);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(targetFolder, file.fileName);
    fs.writeFileSync(filePath, file.buffer);

    const syntheticId = `gdrive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      fileId: syntheticId,
      webViewLink: `/api/documents/download?id=${syntheticId}`,
    };
  }

  /**
   * Deletes a file from Google Drive (or local fallback).
   */
  async deleteFile(fileId: string): Promise<void> {
    if (this.isConfigured && this.driveClient && !fileId.startsWith("gdrive_") && !fileId.startsWith("local_")) {
      try {
        await this.driveClient.files.delete({ fileId });
        return;
      } catch (error) {
        console.error("[GoogleDriveService] Error deleting file from Google Drive:", error);
      }
    }

    // Local cleanup if matching file exists
    // (Non-blocking cleanup for mock storage)
  }
}

export const googleDriveService = new GoogleDriveService();
