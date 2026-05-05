import { NextRequest, NextResponse } from "next/server";
import { getSongInfo } from "@/services/netease";
import { addToHistory } from "@/core/state";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = await getSongInfo(id);
  if (!info) return NextResponse.json({ error: "not found" }, { status: 404 });
  addToHistory({ id: info.id, title: info.title, artist: info.artist });

  // 如果拿到了 CDN URL，换成走本地代理（绕过防盗链）
  const song = {
    ...info,
    url: info.url ? `/api/proxy/audio?url=${encodeURIComponent(info.url)}` : null,
  };

  console.log(`[play/${id}] title="${info.title}" url=${info.url ? "found" : "null"}`);

  return NextResponse.json({ song });
}
