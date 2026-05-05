"use client";
import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/app/page";

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  status: string;
};

export default function Chat({ messages, onSend, status }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    await onSend(text);
    setLoading(false);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* 消息列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "dj" && (
              <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-amber-900/20 flex items-center justify-center text-[10px] text-amber-500/30 shrink-0 mt-1 font-light tracking-widest">C</div>
            )}
            <div className={`max-w-xs px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "font-sans bg-amber-950/40 backdrop-blur-md border border-amber-500/20 rounded-2xl rounded-tr-sm text-amber-50/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                : "font-serif bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl rounded-tl-sm text-stone-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)]" + (i === 0 ? " italic" : "")
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {status && (
          <div className="text-xs text-amber-500/30 tracking-wider pl-9 animate-pulse font-light">{status}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="flex gap-2.5 items-center">
        <input
          className="flex-1 glass rounded-full px-5 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none transition-all duration-300 focus:border-amber-700/40 font-light tracking-wide"
          placeholder="跟 Claudio 说点什么..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="btn-cyber shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 13L13 7L1.5 1L1 5.8L9.5 7L1 8.2L1.5 13Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
