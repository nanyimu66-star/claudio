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

## 让 Claudio 更懂你

Claudio 通过 `src/user/` 下的三个文件了解你的音乐偏好和状态：

| 文件 | 用途 | 必填 |
|---|---|---|
| `taste.md` | 音乐偏好 — 写入你喜欢的歌曲和歌手，Claudio 会基于这些推荐 | 推荐 |
| `routines.md` | 日常习惯 — 什么时段喜欢什么类型的音乐 | 可选 |
| `mood-rules.md` | 情绪规则 — 不同心情对应的音乐策略和 DJ 话术 | 可选 |

**如果想让 Claudio 推荐更准**，建议从网易云导入你的收藏歌曲到 `taste.md`：
1. 启动项目后访问 `http://localhost:3001/api/cookie/netease` 扫码登录
2. 调用网易云 API 获取你的"我喜欢"歌单
3. 把歌曲名和歌手填入 `taste.md` 的歌曲列表

已有模板文件可直接修改，项目启动后 DJ 会自动读取。

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
