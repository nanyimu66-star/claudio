import { NextRequest, NextResponse } from "next/server";
import { checkQrLogin } from "@/services/netease";

export async function POST(req: NextRequest) {
  const { key } = await req.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  try {
    const result = await checkQrLogin(key);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
