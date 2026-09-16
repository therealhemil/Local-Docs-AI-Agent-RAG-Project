import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { documentService } from "@/services/document.service";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await documentService.deleteDocument(session.userId, id);

    const body = await req.json();
    const { fileName } = body;


    console.log('file name and details', fileName);
    


    console.log('session in userid', session.userId);
    

    // N8N Delete Document API
    const DeleteDocument = process.env.N8N_USER_DOCUMENT_DELTE_API;

    if (!DeleteDocument) {
      throw new Error("N8N_USER_DOCUMENT_DELTE_API is not configured");
    }

    const res = await fetch(DeleteDocument, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userName: session.userId,
        FileName: fileName,
      }),
    });

    const data = await res.text()

    console.log("sending n8n data", data);

    // 4. Handle failure & consume response stream
    // if (!res.ok) {
    //   const errorText = await res.text();
    //   throw new Error(`n8n webhook failed with status ${res.status}: ${errorText}`);
    // }

    // 5. Parse and return the actual data
    // const data = await res.json();
    // return Response.json(data);


    return NextResponse.json({ success: true, message: "Document deleted successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/documents/[id]] Error:", error);
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to delete document." }, { status });
  }
}
