import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { voiceService } from "@/services/voice.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");

    let text = "What is this document about?";

    if (audioFile instanceof File) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await voiceService.transcribeAudio(buffer, audioFile.type);
      text = result.text;
    }

    return NextResponse.json({ text }, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/voice/transcribe] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio." },
      { status: 500 }
    );
  }
}
