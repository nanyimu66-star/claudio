import { NextResponse } from "next/server";
import { createQrLogin } from "@/services/netease";

export async function GET() {
  try {
    const { key, qrimg } = await createQrLogin();
    return NextResponse.json({ key, qrimg });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
