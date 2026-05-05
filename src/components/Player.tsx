"use client";
import { RefObject, useEffect, useState } from "react";
import { Song } from "@/app/page";

type Props = {
  song: Song | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onNext: () => void;
  onLike?: (message: string) => void;
};

export default function Player({ song, audioRef, onNext, onLike }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLiked(false);
  }, [song?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => onNext();
    const onTime = () => setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    el.addEventListener("timeupdate", onTime);
    return () => { el.removeEventListener("play", onPlay); el.removeEventListener("pause", onPause); el.removeEventListener("ended", onEnd); el.removeEventListener("timeupdate", onTime); };
  }, [audioRef, onNext]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  }

  async function handleLike() {
    if (!song || liked) return;
    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: song.id, title: song.title, artist: song.artist }),
      });
      const data = await res.json();
      setLiked(true);
      if (data.message && onLike) onLike(data.message);
    } catch (e) {
      console.warn("[like] failed:", e);
    }
  }

  return (
    <div className="glass rounded-full px-4 py-2 max-w-md mx-auto w-full flex items-center gap-3">
      {/* 琥珀色指示灯 */}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${
        playing
          ? "bg-[#fbbf24] shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          : "bg-white/10"
      }`} />

      {/* 歌名 + 进度条 */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/60 truncate font-light tracking-wide">
          {song ? `${song.title} — ${song.artist}` : "电台待机中"}
        </div>
        <div className="h-[2px] bg-white/5 mt-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, rgba(251,191,36,0.6), rgba(245,158,11,0.2))" }}
          />
        </div>
      </div>

      {/* 喜欢 + 控制按钮 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleLike}
          disabled={!song || liked}
          className={`btn-cyber text-sm transition-all duration-300 ${
            liked
              ? "text-[#fbbf24] border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]"
              : ""
          }`}
        >
          {liked ? "♥" : "♡"}
        </button>
        <button onClick={togglePlay} className="btn-cyber text-sm">
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={onNext} className="btn-cyber text-sm">
          ⏭
        </button>
      </div>
    </div>
  );
}
