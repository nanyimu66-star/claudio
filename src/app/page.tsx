"use client";

import { useState, useRef, useEffect } from "react";
import Clock from "@/components/Clock";
import Player from "@/components/Player";
import Chat from "@/components/Chat";

export type Song = {
  id: string; title: string; artist: string;
  album?: string; cover?: string; url?: string; mood?: string;
};
export type ChatMessage = { role: "user" | "dj"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "dj", text: "电台正在启动..." },
  ]);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [status, setStatus] = useState("");
  const [sessionId] = useState(() => `s-${Date.now()}`);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = setTimeout(() => sendMessage("开始电台"), 800);
    return () => clearTimeout(timer);
  }, []);

  function handleLike(message: string) {
    setMessages((m) => [...m, { role: "dj", text: message }]);
    playVoice(message);
  }

  const audioRef = useRef<HTMLAudioElement>(null);

  async function playSong(index: number) {
    const song = playlist[index];
    if (!song) return;
    setCurrentIndex(index);
    try {
      const res = await fetch(`/api/play/${song.id}`);
      const data = await res.json();
      if (data.song?.url && audioRef.current) {
        audioRef.current.src = data.song.url;
        audioRef.current.play().catch((e) => console.warn("[play] audio play failed:", e));
      } else {
        console.warn("[play] no url for song:", song.title);
      }
    } catch (err) {
      console.warn("[play] fetch error:", err);
    }
  }

  function playVoice(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const zh = voices.find((v) => v.lang.startsWith("zh"));
    if (zh) utterance.voice = zh;
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(text: string, hidden = false) {
    if (!hidden) {
      // 用户要求换歌 → 清空播放器
      if (/^(换一首|换歌|不好听|换|跳过|不喜欢)/.test(text.trim())) {
        setPlaylist([]);
        setCurrentIndex(-1);
      }
      setMessages((m) => [...m, { role: "user", text }]);
    }
    setStatus("Claudio 正在思考...");
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let djReply = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const e = JSON.parse(line.slice(6));
        // 前端侧二次过滤：剥离任何 %%…%% 指令或残留的 %%
        if (typeof e.text === "string") e.text = e.text
          .replace(/%%play%%[\s\S]*?(?:%%end%%|$)/gi, '')
          .replace(/%%[\s\S]*?%%/g, '')
          .replace(/%%[\s\S]*$/g, '')
          .trim();
        if (e.type === "status") setStatus(e.text);
        if (e.type === "chunk") {
          djReply += e.text;
          setMessages((m) => {
            const last = m[m.length - 1];
            if (last?.role === "dj") return [...m.slice(0, -1), { role: "dj", text: djReply }];
            return [...m, { role: "dj", text: djReply }];
          });
        }
        if (e.type === "intro") {
          setMessages((m) => [...m, { role: "dj", text: e.text }]);
          playVoice(e.text);
        }
        if (e.type === "playlist") {
          setPlaylist(e.songs);
          if (e.songs.length > 0) {
            setCurrentIndex(0);
            fetch(`/api/play/${e.songs[0].id}`)
              .then(r => r.json())
              .then(data => {
                if (data.song?.url && audioRef.current) {
                  audioRef.current.src = data.song.url;
                  audioRef.current.play();
                } else {
                  console.warn("[playlist] no url for first song:", e.songs[0].title);
                }
              })
              .catch((err) => console.warn("[playlist] fetch error:", err));
          }
        }
        if (e.type === "done") {
          setStatus("");
          if (djReply) playVoice(djReply);
        }
        if (e.type === "error") setStatus(`错误: ${e.text}`);
      }
    }
  }

  function handleNext() {
    if (currentIndex + 1 < playlist.length) {
      playSong(currentIndex + 1);
    } else {
      // 播放列表已到尽头 → 让 DJ 重新推荐
      setPlaylist([]);
      setCurrentIndex(-1);
      sendMessage("SKIP_AND_SEARCH_NEW_MUSIC", true);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-transparent">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8 gap-6">
        <Clock />
        <Player
          song={playlist[currentIndex] ?? null}
          audioRef={audioRef}
          onNext={handleNext}
          onLike={handleLike}
        />
        <Chat messages={messages} onSend={sendMessage} status={status} />
      </div>
      <audio ref={audioRef} />
    </main>
  );
}
