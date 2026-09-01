import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { documentService } from "@/services/document.service";
import { DocumentDTO } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to upload documents." }, { status: 401 });
    }

    const formData = await req.formData();
    const rawName = formData.get("name");
    const name = typeof rawName === "string" ? rawName.trim() : "";

    const allEntries = formData.getAll("files");
    const files: File[] = [];

    const n8nFileUpload = process.env.N8N_UPLOAD_FILES_WEBHOOK_URL;

    if (!n8nFileUpload) {
      console.error("N8N Create Folder Url is Undefined");

      return NextResponse.json(
        {
          error: "n8n webhook URL is not configured",
        },
        {
          status: 500,
        },
      );
    }

    for (const entry of allEntries) {
      if (entry instanceof File && !files.some((file) => file === entry)) {
        files.push(entry);
      }
    }

    const singleFile = formData.get("file");
    if (singleFile instanceof File && !files.some((file) => file === singleFile)) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files were provided in upload request." }, { status: 400 });
    }

    try {
      console.log("Calling n8n:", n8nFileUpload);

      const n8nFormData = new FormData();
      n8nFormData.append("name", name);

      for (const file of files) {
        n8nFormData.append("file", file, file.name);
      }

      console.log("n8n form data", n8nFormData);

      const n8nResponse = await fetch(n8nFileUpload, {
        method: "POST",
        body: n8nFormData,
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error("n8n webhook upload failed:", errorText);
      }
    } catch (err) {
      console.error("Failed to call n8n webhook upload:", err);
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
          error: err?.message || "Failed to upload file.",
        });
      }
    }

    return NextResponse.json(
      {
        documents: uploadedDocs,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully uploaded ${uploadedDocs.length} of ${files.length} document(s).`,
        name,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[API: /api/documents/upload] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error during upload." }, { status: 500 });
  }
}
