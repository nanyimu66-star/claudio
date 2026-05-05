"use client";
import { useEffect, useState } from "react";
import DotsWaveform from "./DotsWaveform";

export default function Clock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center select-none flex flex-col items-center gap-3">
      <div className="text-7xl font-mono font-black tracking-[0.2em] amber-glow">{time}</div>
      <div className="text-xs text-orange-900/60 tracking-[0.3em] mt-3 uppercase font-light">{date}</div>
      <div className="mt-0.5">
        <DotsWaveform />
      </div>
    </div>
  );
}
