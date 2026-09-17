import { prisma } from "../lib/prisma";

/**
 * list_documents — returns all documents for the given user.
 */
export async function listDocuments(userId: string) {
  const docs = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (docs.length === 0) {
    return { documents: [], total: 0, message: "No documents uploaded yet." };
  }

  return {
    total: docs.length,
    documents: docs.map((d) => ({
      id: d.id,
      name: d.originalFileName,
      mimeType: d.mimeType ?? "unknown",
      fileSizeBytes: d.fileSize ? Number(d.fileSize) : null,
      status: d.status,
      uploadedAt: d.createdAt.toISOString(),
      googleDriveFileId: d.googleDriveFileId ?? null,
    })),
  };
}

/**
 * get_document_info — returns metadata for a single document.
 */
export async function getDocumentInfo(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });

  if (!doc) throw new Error(`Document not found: ${documentId}`);
  if (doc.userId !== userId) throw new Error("Unauthorized: document belongs to another user.");

  return {
    id: doc.id,
    name: doc.originalFileName,
    mimeType: doc.mimeType ?? "unknown",
    fileSizeBytes: doc.fileSize ? Number(doc.fileSize) : null,
    status: doc.status,
    googleDriveFileId: doc.googleDriveFileId ?? null,
    googleDriveFolderId: doc.googleDriveFolderId ?? null,
    uploadedAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * get_document_stats — counts documents by status.
 */
export async function getDocumentStats(userId: string) {
  const all = await prisma.document.findMany({
    where: { userId },
    select: { status: true },
  });

  const counts: Record<string, number> = {
    READY: 0,
    UPLOADED: 0,
    PROCESSING: 0,
    UPLOADING: 0,
    FAILED: 0,
  };

  for (const d of all) {
    counts[d.status] = (counts[d.status] ?? 0) + 1;
  }

  return {
    total: all.length,
    byStatus: counts,
    summary: `${counts.READY} ready, ${counts.PROCESSING + counts.UPLOADING} processing, ${counts.FAILED} failed`,
  };
}
