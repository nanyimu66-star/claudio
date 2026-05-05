# Claudio — AI 电台 DJ

一个 AI 驱动的音乐电台，Claude 扮演 DJ 角色，根据你的心情和偏好推荐网易云音乐歌曲。
<img width="1306" height="969" alt="image" src="https://github.com/user-attachments/assets/325d3e50-51a1-4c48-8434-a13f82c9fbfc" />


## 技术栈

- **Next.js 16** — 前端 + API 路由
- **Claude API** — DJ 对话和音乐推荐
- **网易云音乐** — 歌曲搜索与播放
- **Fish Audio** — TTS 语音播报
- **better-sqlite3** — 本地状态持久化

## 前置依赖

本应用依赖 [api-enhanced](https://github.com/nanyimu66-star/api-enhanced) 网易云音乐 API 服务。

```bash
git clone https://github.com/nanyimu66-star/api-enhanced.git
cd api-enhanced
npm install
npm start          # 默认 http://localhost:3000
```

## 本地运行

```bash
# 1. 先启动 API 服务（另一个终端）
cd api-enhanced && npm start

# 2. 再启动 Claudio
cd claudio
npm install
npm run dev        # http://localhost:3001
```

## 环境变量

复制 `.env.local.example` 并填入你的 API key：

```
ANTHROPIC_API_KEY=your_key
ANTHROPIC_BASE_URL= API 接口地址
ANTHROPIC_MODEL= 模型ID
NETEASE_COOKIE=your_netease_cookie
FISH_AUDIO_API_KEY=your_fish_audio_key
FISH_AUDIO_VOICE_ID=your_voice_id
```
