"use client";
import { RefObject, useEffect, useState } from "react";

type Props = {
  song: { title: string; artist: string; id: string } | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onNext: () => void;
};

export default function Player({ song, audioRef, onNext }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = audioRef?.current;
    if (!el) return;

    const update = () => setProgress((el.currentTime / el.duration) * 100 || 0);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    el.addEventListener("timeupdate", update);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);

    return () => {
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
    };
  }, [audioRef]);

  return (
    <div className="fixed top-[28%] right-[8%] z-40 flex flex-col items-end gap-6 select-none text-right pointer-events-auto">
      
      {/* 歌名区：使用大字体衬线体，增加呼吸感 */}
      <div className="flex flex-col items-end">
        <p className="text-4xl font-serif italic text-stone-100 tracking-wide mb-1"
           style={{ mixBlendMode: 'screen', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
          {song?.title || "Searching signal..."}
        </p>
        <p className="text-sm text-[#FFB000]/40 uppercase tracking-[0.5em] font-light">
          {song?.artist || "Claudio Private Radio"}
        </p>
      </div>

      {/* 进度条：加长加粗，工业质感 */}
      <div className="w-96 h-[4px] bg-white/5 relative rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#FFB000] shadow-[0_0_20px_#FFB000] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 控制键：超大尺寸，间距 3rem (gap-12) */}
      <div className="flex items-center gap-12 text-[#FFB000]">
        <button className="text-3xl opacity-30 hover:opacity-100 transition-all">♡</button>
        <button 
          onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10 }}
          className="text-3xl opacity-30 hover:opacity-100 transition-all"
        >
          ⏪
        </button>
        
        <button 
          onClick={() => {
            const el = audioRef.current;
            if (el) el.paused ? el.play() : el.pause();
          }}
          className="text-7xl hover:scale-110 transition-all active:scale-95 drop-shadow-[0_0_20px_rgba(255,176,0,0.4)]"
        >
          {playing ? "⏸" : "▶"}
        </button>
        
        <button 
          onClick={onNext}
          className="text-3xl opacity-30 hover:opacity-100 transition-all"
        >
          ⏩
        </button>
      </div>
    </div>
  );
}