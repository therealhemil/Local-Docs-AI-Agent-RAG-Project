import { prisma } from "@/lib/prisma";
import { googleDriveService } from "./google-drive.service";
import { DocumentDTO } from "@/types";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export class DocumentService {
  /**
   * Validates file format and size constraints.
   */
  validateFile(fileName: string, mimeType?: string, fileSize?: number): void {
    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File "${fileName}" exceeds the 50MB maximum size limit.`);
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      // Check file extension as fallback
      const ext = fileName.split(".").pop()?.toLowerCase();
      const allowedExts = ["pdf", "docx", "doc", "txt", "md", "csv", 'xls', 'xlsx', 'csv'];
      if (!ext || !allowedExts.includes(ext)) {
        throw new Error(`File type for "${fileName}" is not supported. Please upload PDF, Word, TXT, XLS, Or CSV.`);
      }
    }
  }

  /**
   * Uploads a document to Google Drive and records its metadata in PostgreSQL.
   */
  async uploadDocument(params: {
    userId: string;
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    fileSize: number;
  }): Promise<DocumentDTO> {
    const { userId, buffer, fileName, mimeType, fileSize } = params;

    // Validate
    this.validateFile(fileName, mimeType, fileSize);

    // Retrieve user to check/obtain Google Drive folder ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check for duplicate file in user's workspace
    const existingDoc = await prisma.document.findFirst({
      where: {
        userId,
        originalFileName: fileName,
      },
    });

    if (existingDoc) {
      throw new Error(`This file "${fileName}" is already uploaded in your workspace.`);
    }

    let folderId = user.googleDriveFolderId;
    if (!folderId) {
      folderId = await googleDriveService.createUserFolder(user.name);
      await prisma.user.update({
        where: { id: userId },
        data: { googleDriveFolderId: folderId },
      });
    }

    // Create DB entry in UPLOADING state
    const doc = await prisma.document.create({
      data: {
        userId,
        originalFileName: fileName,
        mimeType: mimeType || "application/octet-stream",
        fileSize: BigInt(fileSize),
        googleDriveFolderId: folderId,
        status: "UPLOADING",
      },
    });

    try {
      // Upload to Google Drive (or local simulation)
      const uploadResult = await googleDriveService.uploadFile(folderId, {
        buffer,
        fileName,
        mimeType,
      });

      // Update to UPLOADED status with Google Drive file ID
      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: {
          googleDriveFileId: uploadResult.fileId,
          status: "UPLOADED",
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        originalFileName: updated.originalFileName,
        mimeType: updated.mimeType,
        fileSize: updated.fileSize ? Number(updated.fileSize) : null,
        googleDriveFileId: updated.googleDriveFileId,
        googleDriveFolderId: updated.googleDriveFolderId,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      // Mark as FAILED on error
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
  }

  /**
   * Retrieves all documents for a specific user.
   */
  async getUserDocuments(userId: string): Promise<DocumentDTO[]> {
    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return docs.map((d) => ({
      id: d.id,
      userId: d.userId,
      originalFileName: d.originalFileName,
      mimeType: d.mimeType,
      fileSize: d.fileSize ? Number(d.fileSize) : null,
      googleDriveFileId: d.googleDriveFileId,
      googleDriveFolderId: d.googleDriveFolderId,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  /**
   * Deletes a document, ensuring it strictly belongs to the authenticated user.
   */
  async deleteDocument(userId: string, documentId: string): Promise<boolean> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    if (doc.userId !== userId) {
      throw new Error("Unauthorized: You do not own this document.");
    }

    // Remove from Google Drive if fileId exists
    if (doc.googleDriveFileId) {
      await googleDriveService.deleteFile(doc.googleDriveFileId);
    }

    // Delete record from PostgreSQL
    await prisma.document.delete({
      where: { id: documentId },
    });

    return true;
  }
}

export const documentService = new DocumentService();
