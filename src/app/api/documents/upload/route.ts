import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { documentService } from "@/services/document.service";
import { DocumentDTO } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to upload documents." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const files: File[] = [];

    // Extract single or multiple files from form data
    const allEntries = formData.getAll("files");
    if (allEntries.length > 0) {
      for (const entry of allEntries) {
        if (entry instanceof File) files.push(entry);
      }
    }

    const singleFile = formData.get("file");
    if (singleFile instanceof File && !files.includes(singleFile)) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files were provided in upload request." },
        { status: 400 }
      );
    }

    const uploadedDocs: DocumentDTO[] = [];
    const errors: { fileName: string; error: string }[] = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const doc = await documentService.uploadDocument({
          userId: session.userId,
          buffer,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });

        uploadedDocs.push(doc);
      } catch (err: any) {
        console.error(`[API: /api/documents/upload] Failed for ${file.name}:`, err);
        errors.push({
          fileName: file.name,
          error: err.message || "Failed to upload file.",
        });
      }
    }

    return NextResponse.json(
      {
        documents: uploadedDocs,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully uploaded ${uploadedDocs.length} of ${files.length} document(s).`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API: /api/documents/upload] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}
