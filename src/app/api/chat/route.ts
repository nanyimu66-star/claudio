import { NextRequest } from "next/server";
import { streamChat, Message } from "@/core/claude";
import { detectIntent, createCurrentTrackReply } from "@/core/intent";
import { searchSongs, getSongInfo } from "@/services/netease";
import fs from "fs";
import path from "path";

const MAX_HISTORY = 6;
const sessions = new Map<string, Message[]>();

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId = "default", currentSong = null } = await req.json();
    if (!message?.trim()) return new Response("message required", { status: 400 });

    const isSkip = message === "SKIP_AND_SEARCH_NEW_MUSIC";

    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    let messages = sessions.get(sessionId)!;
    if (messages.length > MAX_HISTORY) {
      messages = messages.slice(-MAX_HISTORY);
      sessions.set(sessionId, messages);
    }

    if (!isSkip) messages.push({ role: "user", content: message });

    console.log(`[chat] Session: ${sessionId}, History: ${messages.length}`);

    const encoder = new TextEncoder();

    // 当前歌曲查询 → 模板回复，不走 Claude，省 token 且零延迟
    if (!isSkip && detectIntent(message) === "current_track") {
      const reply = createCurrentTrackReply(currentSong);
      messages.push({ role: "assistant", content: reply });
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: reply })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) { /* ignore closed controller */ }
        };

        try {
          // --- 场景 A：直接换歌 (SKIP) ---
          if (isSkip) {
            send({ type: "status", text: "DJ 正在翻找黑胶架..." });
            const searchPool: string[] = [];

            // 1. 收藏歌手
            const favArtists: string[] = [];
            // 2. 点赞过的艺人
            const likedArtists: string[] = [];
            // 3. 风格关键词
            let styleKeywords: string[] = [];

            try {
              const tastePath = path.join(process.cwd(), "src", "user", "taste.md");
              if (fs.existsSync(tastePath)) {
                const taste = fs.readFileSync(tastePath, "utf-8");

                // 提取最喜欢的歌手
                const favSection = taste.match(/## 最喜欢的歌手\n([\s\S]*?)(?=\n##|$)/);
                if (favSection) {
                  const found = favSection[1].match(/^- (.+)$/gm);
                  if (found) favArtists.push(...found.map(l => l.replace(/^- /, "").trim()));
                }

                // 提取点赞过的歌手（从实时点赞记录表格）
                const likeRows = taste.match(/^\|.*\|.*\|.*\|.*\|.*\|$/gm);
                if (likeRows) {
                  for (const row of likeRows.slice(2)) { // 跳过表头
                    const cols = row.split("|").filter(Boolean).map(c => c.trim());
                    if (cols[1] && cols[2]) {
                      // cols[1] = 歌名, cols[2] = 歌手
                      cols[2].split(/\s*\/\s*/).forEach(a => {
                        const name = a.trim();
                        if (name && !likedArtists.includes(name)) likedArtists.push(name);
                      });
                    }
                  }
                }

                // 提取风格标签
                const styleSection = taste.match(/## 音乐风格\n([\s\S]*?)(?=\n##|$)/);
                if (styleSection) {
                  const text = styleSection[1];
                  const genres = text.match(/流行|r\s*&?\s*b|rnb|蓝调|爵士|funk|soul|neo\s*soul|city\s*pop|indie|lo-?fi|电子|ambient|jazz|hip\s*hop|disco/gi);
                  if (genres) styleKeywords = genres.map(g => g.replace(/\s+/g, " ").trim());
                }
              }
            } catch (e) {}

            // 把三类种子混成一个池，再加一些发散关键词
            searchPool.push(...favArtists);
            searchPool.push(...likedArtists.filter(a => !favArtists.includes(a)));
            if (styleKeywords.length === 0) styleKeywords = ["R&B", "neo soul", "indie pop", "city pop"];
            // 每种风格加一些变化后缀，增加发散性
            const suffixes = ["", " 新歌", " chill", " vibe", " mix", " soul"];
            for (const kw of styleKeywords) {
              searchPool.push(kw + suffixes[Math.floor(Math.random() * suffixes.length)]);
            }

            const seeds = [...new Set(searchPool)].sort(() => Math.random() - 0.5);

            const songs: any[] = [];
            for (const seed of seeds.slice(0, 5)) {
              if (songs.length >= 3) break;
              const res = await searchSongs(seed);
              if (res?.length) {
                const pool = res.slice(0, 20);
                for (let attempt = 0; attempt < Math.min(pool.length, 8); attempt++) {
                  const pick = pool[Math.floor(Math.random() * pool.length)];
                  const info = await getSongInfo(pick.id);
                  if (info?.url) { songs.push({ ...pick, ...info }); break; }
                }
              }
            }

            if (songs.length > 0) {
              const introMsgs = ["在仓库深处翻到了这首。"];
              send({ type: "intro", text: introMsgs[Math.floor(Math.random() * introMsgs.length)] });
              send({ type: "playlist", songs });
            } else {
              send({ type: "error", text: "哎呀，卡了？" });
            }

            send({ type: "done" });
            return;
          }

          // --- 场景 B：正常 AI 对话 ---
          send({ type: "status", text: "Claudio 正在思考..." });
          let fullReply = "";
          let displayText = "";
          let rawBuffer = "";

          await streamChat(messages, currentSong, (chunk) => {
            fullReply += chunk;
            rawBuffer += chunk;

            let clean = rawBuffer
              .replace(/%%[\s\S]*$/i, '')
              .replace(/\[\s*\{[\s\S]*$/i, '');

            const newText = clean.slice(displayText.length);
            if (newText) {
              displayText = clean;
              send({ type: "chunk", text: newText });
            }
          });

          messages.push({ role: "assistant", content: displayText });

          // --- 解析并搜索歌曲 ---
          const playMatch = fullReply.match(/%%play%%([\s\S]*?)%%end%%/i);
          const jsonMatch = fullReply.match(/\[\s*\{\s*"title"[\s\S]*?\}\s*\]/i);
          const playContent = playMatch ? playMatch[1] : (jsonMatch ? jsonMatch[0] : null);

          if (playContent) {
            try {
              const playSongs = JSON.parse(playContent).slice(0, 3);
              send({ type: "status", text: "正在从黑胶库取碟..." });
              const songs: any[] = [];
              for (const s of playSongs) {
                const res = await searchSongs(`${s.title} ${s.artist}`);
                if (res?.length) {
                  for (const candidate of res.slice(0, 6)) {
                    const info = await getSongInfo(candidate.id);
                    if (info?.url) { songs.push({ ...s, ...candidate, ...info }); break; }
                  }
                }
              }
              if (songs.length > 0) {
                send({ type: "intro", text: `为你点播：${songs[0].artist}的《${songs[0].title}》` });
                send({ type: "playlist", songs });
              }
            } catch (e) {
              console.error("[play] Parse error:", e);
            }
          }

          send({ type: "done" });
        } catch (err: any) {
          console.error("[stream] Error:", err);
          send({ type: "error", text: "DJ 麦克风炸了: " + err.message });
        } finally {
          try { controller.close(); } catch (e) {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (globalErr: any) {
    console.error("[API Chat] Global Error:", globalErr);
    return new Response(JSON.stringify({ error: globalErr.message }), { status: 500 });
  }
}
