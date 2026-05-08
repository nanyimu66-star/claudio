import { NextResponse } from "next/server";
import { getCurrentSlot } from "@/core/planner";

export async function GET() {
  const slot = getCurrentSlot();
  if (!slot) return NextResponse.json({ slot: null }, { status: 200 });
  return NextResponse.json({ slot });
}
