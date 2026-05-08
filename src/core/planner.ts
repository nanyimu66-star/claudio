import fs from "fs";
import path from "path";

export type PlannerSlot = {
  slotId: string;
  label: string;
  timeRange: string;
  activity: string;
  hostOpening: string;
  energy: string;
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function loadRoutineBlocks(): PlannerSlot[] {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "src", "user", "routines.md"),
      "utf-8"
    );
    return parseSlots(raw);
  } catch {
    return [];
  }
}

// 解析 routines.md 中 ## 标题行 的时段块
// 格式：## 早上苏醒 · 08:00-09:00
//        - 活动：起床 / 洗漱
//        - 能量：low-to-medium
//        - 意图：先把人和房间慢慢叫醒...
function parseSlots(markdown: string): PlannerSlot[] {
  const slots: PlannerSlot[] = [];
  const sections = markdown.split(/^## /gm);

  for (const section of sections) {
    const headingMatch = section.match(/^(.+?) · (\d{2}:\d{2}-\d{2}:\d{2})/m);
    if (!headingMatch) continue;

    const label = headingMatch[1].trim();
    const timeRange = headingMatch[2].trim();
    const slotId = label;

    const extract = (key: string) => {
      const m = section.match(new RegExp(`^- ${key}：(.+)$`, "m"));
      return m ? m[1].trim() : "";
    };

    slots.push({
      slotId,
      label,
      timeRange,
      activity: extract("活动"),
      hostOpening: extract("意图"),
      energy: extract("能量"),
    });
  }

  return slots;
}

export function getCurrentSlot(now = new Date()): PlannerSlot | null {
  const blocks = loadRoutineBlocks();
  const minutes = now.getHours() * 60 + now.getMinutes();

  for (const block of blocks) {
    const [start, end] = block.timeRange.split("-").map(parseTimeToMinutes);
    if (start <= minutes && minutes < end) return block;
    // 跨午夜时段 (如 21:00-00:00)
    if (start > end && (minutes >= start || minutes < end)) return block;
  }

  return null;
}
