import axios from "axios";
import fs from "fs";
import path from "path";

const BASE = process.env.NETEASE_API_URL || "http://localhost:3000";

// 创建独立的 axios 实例，不经过系统代理（防止 HTTP_PROXY 干扰 localhost 请求）
const api = axios.create({ proxy: false });
const SESSION_FILE = path.join(process.cwd(), "data", "netease-session.json");

function getCookie(): string {
  // 1. 先查 JSON 文件
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const session = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      if (session.cookie) return session.cookie;
    }
  } catch (e) {}

  // 2. 兜底查 .env (这才是你填 Cookie 的地方)
  const envCookie = process.env.NETEASE_COOKIE;
  if (envCookie) {
    console.log("🚀 Cookie loaded from .env");
    return envCookie;
  }

  return "";
}

export function saveCookie(cookie: string) {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookie, updatedAt: new Date().toISOString() }, null, 2));
}

export function clearCookie() {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
}

function withCookie(params: Record<string, unknown> = {}) {
  const cookie = getCookie();
  return cookie ? { ...params, cookie } : params;
}

function normalizeSong(song: any) {
  return {
    id: String(song.id),
    title: song.name,
    artist: (song.artists || song.ar || []).map((a: any) => a.name).join(" / "),
    album: song.album?.name || song.al?.name || "",
    duration: song.duration || song.dt || 0,
    cover: song.album?.picUrl || song.al?.picUrl || "",
    fee: song.fee ?? 0,
    privilege: song.privilege ?? null,
  };
}

export async function searchSongs(keyword: string) {
  try {
    const res = await api.get(`${BASE}/search`, {
      params: withCookie({ keywords: keyword, type: 1, limit: 20 }),
      timeout: 15000,
    });
    if (res.data.code === 200 && res.data.result?.songs) {
      return res.data.result.songs
        .map(normalizeSong)
        .filter((s: { duration: number; fee: number; privilege: any }) =>
          s.duration > 120000 &&    // 跳过短于 2 分钟的试听片段
          s.fee !== 8 &&            // 剔除无版权/灰歌
          s.fee !== 4 &&            // 剔除纯数字专辑（通常无流）
          (!s.privilege || (s.privilege.maxbr ?? 0) > 0)  // 有可播放流
        );
    }
  } catch (e: any) {
    console.warn(`[netease] searchSongs error: ${e?.message || e}`);
  }
  return [];
}

export async function getSongUrl(id: string): Promise<string | null> {
  try {
    const res = await api.get(`${BASE}/song/url/v1`, {
      params: withCookie({ id, level: "exhigh" }),
      timeout: 15000,
    });
    const url = res.data.data?.[0]?.url || null;
    if (!url) console.warn(`[netease] getSongUrl(${id}) returned null (可能需要登录)`);
    return url;
  } catch (e: any) {
    console.warn(`[netease] getSongUrl error: ${e?.message || e}`);
    return null;
  }
}

export async function getSongInfo(id: string) {
  try {
    const res = await api.get(`${BASE}/song/detail`, { params: withCookie({ ids: id }), timeout: 15000 });
    if (res.data.code === 200 && res.data.songs?.[0]) {
      const song = normalizeSong(res.data.songs[0]);
      const url = await getSongUrl(id);
      return { ...song, url };
    }
  } catch (e: any) {
    console.warn(`[netease] getSongInfo error: ${e?.message || e}`);
  }
  return null;
}

export async function getLoginStatus() {
  try {
    const res = await api.get(`${BASE}/login/status`, { params: withCookie(), timeout: 6000 });
    const profile = res.data?.data?.profile || null;
    const account = res.data?.data?.account || null;
    return { loggedIn: Boolean(profile && account), profile, account };
  } catch {
    return { loggedIn: false, profile: null, account: null };
  }
}

export async function createQrLogin() {
  const keyRes = await api.get(`${BASE}/login/qr/key`);
  const key = keyRes.data?.data?.unikey;
  const qrRes = await api.get(`${BASE}/login/qr/create`, { params: { key, qrimg: true } });
  return { key, qrimg: qrRes.data?.data?.qrimg || "" };
}

export async function checkQrLogin(key: string) {
  const res = await api.get(`${BASE}/login/qr/check`, { params: { key } });
  const code = res.data?.code;
  const cookie = res.data?.cookie || "";
  if (code === 803 && cookie) saveCookie(cookie);
  return { code, cookie };
}
