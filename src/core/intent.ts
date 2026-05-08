/**
 * 意图检测 + 模板回复。简单问题直接用本地模板，不用调 Claude。
 * 对标 Codio 的 detectIntent() + createFallbackReply()。
 */

export type DetectedIntent = "current_track" | "recommendation" | "chat";

export function detectIntent(message: string): DetectedIntent {
  if (isCurrentTrackQuestion(message)) return "current_track";
  if (isRecommendationRequest(message)) return "recommendation";
  return "chat";
}

function isCurrentTrackQuestion(message: string): boolean {
  const normalized = message.toLowerCase();

  // 明确的询问关键词 — 几乎不会误判
  const explicitAsk = [
    "现在放", "正在放", "当前播放", "当前歌曲",
    "歌名", "谁唱", "谁的歌", "什么歌", "哪首",
    "这是啥", "这是哪首", "介绍一下这首歌", "介绍这首歌",
    "now playing", "current song", "what song",
    "歌手是谁", "谁写的", "什么专辑", "哪个专辑",
  ];
  if (explicitAsk.some((word) => normalized.includes(word))) return true;

  // "这首歌/这歌/这首" 只在带问号或极短（≤5字）时才算询问
  // 避免把"这首歌好性感""这歌不错"误判为询问
  if (/这[首歌首曲]/.test(normalized)) {
    if (/[？?吗呢]/.test(normalized)) return true;
    if (normalized.length <= 5) return true;
  }

  return false;
}

function isRecommendationRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const keywords = [
    "换一首", "换歌", "不好听", "跳过", "不喜欢",
    "推荐", "想听", "来点", "放点", "来首",
    "换点", "换一个", "来一首", "放一首",
    "适合", "有什么好听的", "有什么歌",
    "来点别的", "换换口味",
  ];
  return keywords.some((word) => normalized.includes(word));
}

export function createCurrentTrackReply(
  currentSong: { title: string; artist: string } | null
): string {
  if (!currentSong?.title) {
    return "现在播放器还没拿到歌的信息，稍等一下，我马上告诉你。";
  }

  const { title, artist } = currentSong;
  const artistPart = artist ? `，歌手是 ${artist}` : "";

  const flavors = [
    `现在正在放的是《${title}》${artistPart}。很适合现在的气氛。`,
    `这首是《${title}》${artistPart}。我特意为你挑的，听听看。`,
    `正在播《${title}》${artistPart}。怎么样，对味吗？`,
    `你听到的是《${title}》${artistPart}。我觉得这个时间点放它刚刚好。`,
  ];

  return flavors[Math.floor(Math.random() * flavors.length)];
}
