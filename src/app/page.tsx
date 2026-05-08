"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Player from "@/components/Player";
import Chat from "@/components/Chat";
import AmbientEngine from "@/components/AmbientEngine";
import AvatarBadge from "@/components/AvatarBadge";

export type Song = {
  id: string; title: string; artist: string;
  album?: string; cover?: string; url?: string; mood?: string;
};
export type ChatMessage = { role: "user" | "dj"; text: string };
type PlannerSlot = {
  slotId: string;
  label: string;
  timeRange: string;
  activity: string;
  hostOpening: string;
  energy: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "dj", text: "电台正在启动..." },
  ]);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [status, setStatus] = useState("");
  const [sessionId] = useState(() => `s-${Date.now()}`);
  const [inputValue, setInputValue] = useState("");
  const started = useRef(false);
  const currentSlotRef = useRef<string | null>(null);
  const hostSpokenForSlotRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 启动: host 开场白 → 开始电台
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = setTimeout(async () => {
      await fetchAndPlayHostOpening();
      sendMessage("开始电台");
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // 每 60 秒检查时段切换
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/planner");
        const data = await res.json();
        const slot = data.slot as PlannerSlot | null;
        if (slot && slot.slotId !== currentSlotRef.current) {
          currentSlotRef.current = slot.slotId;
          if (!hostSpokenForSlotRef.current.has(slot.slotId)) {
            hostSpokenForSlotRef.current.add(slot.slotId);
            await speakHostOpening(slot.hostOpening, slot.label);
          }
        }
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 全局键盘: / → 聚焦输入框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSubmitInput = useCallback(async () => {
    const text = inputValue.trim();
    setInputValue("");
    if (!text) return;
    await sendMessage(text);
  }, [inputValue]);

  const handleInputKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitInput();
    } else if (e.key === "Escape") {
      setInputValue("");
      inputRef.current?.blur();
    }
  }, [handleSubmitInput]);

  function handleLike(message: string) {
    setMessages((m) => [...m, { role: "dj", text: message }]);
    playVoice(message);
  }

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
      }
    } catch (err) {
      console.warn("[play] fetch error:", err);
    }
  }

  async function playTtsVoice(text: string): Promise<boolean> {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return false;
      if (res.headers.get("Content-Type")?.includes("json")) return false;
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      return new Promise((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(audio.src); resolve(true); };
        audio.onerror = () => { URL.revokeObjectURL(audio.src); resolve(false); };
        audio.play().catch(() => { URL.revokeObjectURL(audio.src); resolve(false); });
      });
    } catch {
      return false;
    }
  }

  function speakWithBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find((v) => v.lang.startsWith("zh"));
      if (zh) utterance.voice = zh;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  async function speakHostOpening(text: string, label: string) {
    setMessages((m) => [...m, { role: "dj", text: `「${label}」${text}` }]);
    const ok = await playTtsVoice(text);
    if (!ok) await speakWithBrowser(text);
  }

  async function fetchAndPlayHostOpening() {
    try {
      const res = await fetch("/api/planner");
      const data = await res.json();
      const slot = data.slot as PlannerSlot | null;
      if (slot && !hostSpokenForSlotRef.current.has(slot.slotId)) {
        currentSlotRef.current = slot.slotId;
        hostSpokenForSlotRef.current.add(slot.slotId);
        await speakHostOpening(slot.hostOpening, slot.label);
      }
    } catch {}
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
      if (/^(换一首|换歌|不好听|换|跳过|不喜欢)/.test(text.trim())) {
        setPlaylist([]);
        setCurrentIndex(-1);
      }
      setMessages((m) => [...m, { role: "user", text }]);
    }
    const currentSong = playlist[currentIndex] ?? null;
    setStatus("Claudio 正在思考...");
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId, currentSong }),
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

  function handlePrev() {
    if (currentIndex > 0) {
      playSong(currentIndex - 1);
    }
  }

  function handleNext() {
    if (currentIndex + 1 < playlist.length) {
      playSong(currentIndex + 1);
    } else {
      setPlaylist([]);
      setCurrentIndex(-1);
      sendMessage("SKIP_AND_SEARCH_NEW_MUSIC", true);
    }
  }

  return (
    <main className="min-h-screen relative bg-transparent">
      <AmbientEngine audioRef={audioRef} />
      <div className="shell">
        <section className="radio-device">
          <audio ref={audioRef} />

          <header className="device-header">
            <div className="device-host-lockup">
              <AvatarBadge kind="host" />
              <strong>Claudio</strong>
            </div>
            <div className="device-header-actions">
              <span>PRIVATE FM</span>
            </div>
          </header>

          <Player
            song={playlist[currentIndex] ?? null}
            audioRef={audioRef}
            onNext={handleNext}
            onPrev={handlePrev}
            onLike={handleLike}
          />

          <div className="device-queue-bar">
            <span>QUEUE</span>
            <span>{playlist.length} TRACKS</span>
          </div>

          <section className="device-chat">
            <header className="chat-host-bar">
              <div className="chat-host-status">
                <span className="online-dot" />
                <span>
                  <strong>Claudio</strong>
                  <small>AI Radio DJ</small>
                </span>
              </div>
              <span className="live-tag">LIVE</span>
            </header>

            <Chat messages={messages} status={status} />

            <form
              className="chat-compose"
              onSubmit={(e) => { e.preventDefault(); handleSubmitInput(); }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKey}
                placeholder="跟 Claudio 说点什么..."
              />
              <button type="submit" disabled={!inputValue.trim()}>
                ↑
              </button>
            </form>

            <footer className="device-bottom-status">
              <span>CLAUDIO FM.</span>
              <span>CONNECTED.</span>
            </footer>
          </section>
        </section>
      </div>
    </main>
  );
}
