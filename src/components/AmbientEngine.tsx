"use client";
import { useEffect, useState, useRef, RefObject } from "react";

type TimePhase = "night" | "morning" | "day" | "golden" | "evening";

function getTimePhase(hours: number): TimePhase {
  if (hours >= 22 || hours < 5) return "night";
  if (hours >= 5 && hours < 10) return "morning";
  if (hours >= 10 && hours < 17) return "day";
  if (hours >= 17 && hours < 20) return "golden";
  return "evening";
}

const PHASE_FILTERS: Record<TimePhase, string> = {
  night: "brightness(0.6) contrast(1.1) sepia(0.2)",
  morning: "brightness(0.85) hue-rotate(-15deg)",
  day: "brightness(0.9) saturate(0.9)",
  golden: "brightness(0.8) hue-rotate(10deg) saturate(1.2)",
  evening: "brightness(0.7) saturate(0.95)",
};

type Props = { showInput?: boolean; audioRef?: RefObject<HTMLAudioElement | null> };

export default function AmbientEngine({ showInput = false, audioRef }: Props) {
  const [phase, setPhase] = useState<TimePhase>("night");

  useEffect(() => {
    const tick = () => setPhase(getTimePhase(new Date().getHours()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const glowRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const fireCenter = "70% 30%";

  // ── Audio-reactive fire ──
  useEffect(() => {
    const el = audioRef?.current;
    if (!el) return;

    let ctx: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let raf: number;
    let dataArray: Uint8Array<ArrayBuffer>;

    try {
      ctx = new AudioContext();
      source = ctx.createMediaElementSource(el);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    } catch {
      return;
    }

    function update() {
      if (analyser) {
        if (el!.paused || el!.ended) {
          // idle — subtle base glow
          if (glowRef.current) {
            glowRef.current.style.background =
              `radial-gradient(circle 450px at ${fireCenter}, rgba(255,100,0,0.08), transparent)`;
          }
          if (coreRef.current) {
            coreRef.current.style.background =
              `radial-gradient(circle 140px at ${fireCenter}, rgba(255,180,50,0.12), transparent)`;
          }
        } else {
          analyser.getByteFrequencyData(dataArray);
          // volume = average of all frequency bins (0-1)
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const vol = sum / dataArray.length / 255;

          // glow ring: radius 120-220px, opacity 0.08-0.22
          const glowR = 120 + vol * 100;
          const glowO = 0.08 + vol * 0.14;
          if (glowRef.current) {
            glowRef.current.style.background =
              `radial-gradient(circle ${glowR}px at ${fireCenter}, rgba(255,100,0,${glowO}), transparent)`;
          }

          // core flame: radius 60-150px, opacity 0.12-0.5
          const coreR = 60 + vol * 90;
          const coreO = 0.12 + vol * 0.38;
          if (coreRef.current) {
            coreRef.current.style.background =
              `radial-gradient(circle ${coreR}px at ${fireCenter}, rgba(255,180,50,${coreO}), transparent)`;
          }
        }
      }
      raf = requestAnimationFrame(update);
    }

    raf = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(raf); ctx?.close(); };
  }, [audioRef]);

  return (
    <>
      {/* z-0: 底图 */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-[3000ms] ease-in-out"
        style={{ backgroundImage: "url('/fireplace.png')", filter: PHASE_FILTERS[phase] }}
      />

      {/* z-[1]: 夜色调 overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-[3000ms]"
        style={{
          background: "rgba(80, 25, 0, 0.35)",
          mixBlendMode: "color-burn",
          opacity: phase === "night" ? 0.2 : 0,
        }}
      />

      {/* z-[1]: 篝火引擎 */}
      <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
        {/* 大范围暖光 */}
        <div
          ref={glowRef}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle 100px at ${fireCenter}, rgba(255,100,0,0.08), transparent)`,
          }}
        />
        {/* 核心焰色 */}
        <div
          ref={coreRef}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle 55px at ${fireCenter}, rgba(255,180,50,0.12), transparent)`,
          }}
        />
      </div>

      {/* z-25: 输入模式遮罩 */}
      {showInput && (
        <div
          className="fixed inset-0 z-25 transition-all duration-500"
          style={{
            backdropFilter: "blur(8px) brightness(0.4)",
            WebkitBackdropFilter: "blur(8px) brightness(0.4)",
            background: "rgba(0,0,0,0.35)",
          }}
        />
      )}
    </>
  );
}
