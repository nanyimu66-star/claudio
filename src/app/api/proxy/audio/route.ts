import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// 独立的 axios 实例，不经过系统代理（防止 HTTP_PROXY 干扰）
const proxyAxios = axios.create({ proxy: false });

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const response = await proxyAxios.get(url, {
      responseType: "stream",
      headers: {
        Referer: "https://music.163.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 30000,
    });

    const contentType = (response.headers["content-type"] as string) || "audio/mpeg";
    return new Response(response.data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error(`[proxy] fetch error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
