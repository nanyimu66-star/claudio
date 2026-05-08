"use client";
import { RefObject, useEffect, useState } from "react";
import { Song } from "@/app/page";

type Props = {
  song: Song | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onNext: () => void;
  onPrev: () => void;
  onLike?: (message: string) => void;
};

function clock(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function weekday(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}
function calendar(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(date);
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value?.toUpperCase() ?? "";
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  return `${d} · ${m} · ${y}`;
}
function fmt(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Player({ song, audioRef, onNext, onPrev, onLike }: Props) {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => { setLiked(false); }, [song?.id]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => onNext();
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
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

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <section className="device-player" aria-label="播放界面">
      <div className="device-time-block">
        <p className="device-time">{clock(now)}</p>
        <p className="device-weekday">{weekday(now)}</p>
        <p className="device-date">{calendar(now)}</p>
      </div>

      <div className="device-track">
        <span className="device-air live">ON AIR</span>
        <span className="device-now-label">Now Playing</span>
        <h2>{song?.title ?? "Claudio 私人电台"}</h2>
        <p>{song ? song.artist : "等待开播..."}</p>
        <small>Claudio Selection</small>
      </div>

      <div className="device-controls">
        <button onClick={onPrev} aria-label="Previous">‹</button>
        <button className="device-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={onNext} aria-label="Next">›</button>
        <button onClick={handleLike} aria-label="Like" disabled={!song || liked}>
          {liked ? "♥" : "♡"}
        </button>
      </div>

      <div className="device-progress-row">
        <span>{fmt(currentTime)}</span>
        <div className="device-progress" aria-label="播放进度">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span>{fmt(duration || 0)}</span>
      </div>
    </section>
  );
}
