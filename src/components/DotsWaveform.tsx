"use client";
import { useEffect, useRef } from "react";

export default function DotsWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COLS = 44;
    const ROWS = 5;
    const RADIUS = 2;
    const SPACING_X = 7;
    const SPACING_Y = 6;
    const PAD = 4;
    const W = (COLS - 1) * SPACING_X + RADIUS * 2 + PAD * 2;
    const H = (ROWS - 1) * SPACING_Y + RADIUS * 2 + PAD * 2;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const c2d = ctx; // narrowed for closure
    let frame: number;
    const t0 = Date.now();

    function draw() {
      c2d.clearRect(0, 0, W, H);
      const t = (Date.now() - t0) / 1000;

      for (let c = 0; c < COLS; c++) {
        // Combined sine waves for organic movement
        const amp =
          (Math.sin(t * 0.5 + c * 0.25) * 0.5 + 0.5) * 0.7 +
          (Math.sin(t * 0.9 + c * 0.12) * 0.5 + 0.5) * 0.2 +
          (Math.sin(t * 1.3 + c * 0.06) * 0.5 + 0.5) * 0.1;
        const activeRows = Math.round(amp * ROWS);

        for (let r = 0; r < ROWS; r++) {
          const x = PAD + RADIUS + c * SPACING_X;
          const y = PAD + RADIUS + r * SPACING_Y;
          // 火焰从底线向上生长
          const isActive = r >= ROWS - activeRows;

          c2d.beginPath();
          c2d.arc(x, y, RADIUS, 0, Math.PI * 2);
          if (isActive) {
            // 在火焰中的位置: 0=底部基座, 1=顶部焰尖
            const flamePos = activeRows <= 1 ? 0 : (ROWS - 1 - r) / (activeRows - 1);
            // 色相渐变: 底部暖橙(28) → 顶部亮黄(50)
            const hue = 28 + flamePos * 22 + Math.sin(t * 0.3 + c * 0.15) * 3;
            // 明度: 底部亮 → 顶部略暗
            const lightness = 58 - flamePos * 8;
            // 跳动: 底部快/幅度小, 顶部慢/幅度大
            const flickerRange = 0.05 + flamePos * 0.40;
            const flickerFreq = 3.5 - flamePos * 2.0;
            const flicker = 1.0 - flickerRange + flickerRange * Math.sin(t * flickerFreq + c * 1.3 + r * 2.7);
            // 光晕: 底部强 → 顶部弱
            const shadowA = 0.35 - flamePos * 0.20;
            c2d.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${flicker})`;
            c2d.shadowColor = `hsla(${hue}, 100%, 50%, ${shadowA})`;
            c2d.shadowBlur = 4;
          } else {
            c2d.fillStyle = "rgba(80, 35, 0, 0.04)";
            c2d.shadowBlur = 0;
          }
          c2d.fill();
          c2d.shadowBlur = 0; // reset for next dot
        }
      }

      frame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="mx-auto block" style={{ filter: 'blur(0.2px) drop-shadow(0 0 15px rgba(251, 146, 60, 0.6))' }} />;
}
