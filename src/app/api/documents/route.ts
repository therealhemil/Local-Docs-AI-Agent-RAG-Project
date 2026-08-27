import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { documentService } from "@/services/document.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const documents = await documentService.getUserDocuments(session.userId);
    return NextResponse.json({ documents }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/documents] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve documents." },
      { status: 500 }
    );
  }
}
