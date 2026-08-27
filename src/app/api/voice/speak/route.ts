import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { voiceService } from "@/services/voice.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const result = await voiceService.synthesizeSpeech(text);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API: /api/voice/speak] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synthesize speech." },
      { status: 500 }
    );
  }
}
