import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { documentService } from "@/services/document.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    await documentService.deleteDocument(session.userId, id);

    return NextResponse.json(
      { success: true, message: "Document deleted successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API: /api/documents/[id]] Error:", error);
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to delete document." },
      { status }
    );
  }
}
