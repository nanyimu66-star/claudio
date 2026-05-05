import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech, hasTtsConfig } from "@/core/tts";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (!hasTtsConfig()) return NextResponse.json({ error: "TTS not configured" }, { status: 400 });

  const audio = await synthesizeSpeech(text.trim());
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
