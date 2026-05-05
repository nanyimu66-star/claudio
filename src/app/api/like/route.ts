import { NextRequest, NextResponse } from "next/server";
import { likeSong, getMemory } from "@/core/state";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const TASTE_FILE = path.join(process.cwd(), "src", "user", "taste.md");

function timeLabel(): string {
  const h = new Date().getHours();
  if (h < 5) return "深夜";
  if (h < 8) return "清晨";
  if (h < 12) return "上午";
  if (h < 14) return "中午";
  if (h < 18) return "下午";
  if (h < 21) return "傍晚";
  return "夜间";
}

export async function POST(req: NextRequest) {
  const { id, title, artist } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  likeSong({ id, title: title || "未知", artist: artist || "未知" });

  // --- 时间语境 ---
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hour = now.getHours();
  const tl = timeLabel();

  // --- 情绪关联 ---
  const lastMood = getMemory("last_mood") || "未知";
  const moodTag = lastMood.length > 20 ? lastMood.slice(0, 20) + "…" : lastMood;

  // --- 追加 Markdown 表格行到 taste.md ---
  const row = `| ${dateStr} ${tl}${hour}点 | ${title || "未知"} | ${artist || "未知"} | 实时点赞 | 此时用户情绪：${moodTag} |`;
  try {
    fs.mkdirSync(path.dirname(TASTE_FILE), { recursive: true });

    const existing = fs.readFileSync(TASTE_FILE, "utf-8");
    if (!existing.includes("## 实时点赞记录")) {
      fs.appendFileSync(TASTE_FILE, `
## 实时点赞记录

| 时间 | 歌曲 | 歌手 | 来源 | 上下文 |
|---|---|---|---|---|
`, "utf-8");
    }
    fs.appendFileSync(TASTE_FILE, `${row}\n`, "utf-8");
  } catch (e) {
    console.warn("[like] failed to update taste.md:", e);
  }

  // --- DeepSeek 生成 DJ 确认语 ---
  let message = `记住了，《${title}》— ${artist}`;
  try {
    const r = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "deepseek-v4-flash",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `用户刚刚点赞了《${title}》— ${artist}（${tl}${hour}点，情绪：${moodTag}）。用一句赛博 DJ 口吻（30 字内）回应，说你记住了这个喜好，不要说多余的话。`,
      }],
    });
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    if (text) message = text.replace(/["""]/g, "").trim();
  } catch (e) {
    console.warn("[like] AI confirm failed:", e);
  }

  console.log(`[like] ✓ ${title} — ${artist} (${tl} ${hour}:00, mood: ${moodTag})`);
  return NextResponse.json({ ok: true, message });
}
