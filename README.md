# Claudio — AI 电台 DJ

一个 AI 驱动的音乐电台，Claude 扮演 DJ 角色，根据你的心情和偏好推荐网易云音乐歌曲。

## 技术栈

- **Next.js 16** — 前端 + API 路由
- **Claude API** — DJ 对话和音乐推荐
- **网易云音乐** — 歌曲播放
- **Fish Audio** — TTS 语音播报
- **better-sqlite3** — 本地状态持久化

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3001

## 环境变量

复制 `.env.local.example` 并填入你的 API key：

```
ANTHROPIC_API_KEY=your_key
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_MODEL=deepseek-v4-flash
NETEASE_COOKIE=your_netease_cookie
FISH_AUDIO_API_KEY=your_fish_audio_key
FISH_AUDIO_VOICE_ID=your_voice_id
```
