"use client";
import { useEffect, useRef } from "react";
import { ChatMessage } from "@/app/page";
import AvatarBadge from "./AvatarBadge";

type Props = { messages: ChatMessage[]; status: string };

export default function Chat({ messages, status }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-thread">
      {messages.map((m, i) => (
        <article key={i} className={`chat-message ${m.role === "dj" ? "host" : "user"}`}>
          <AvatarBadge kind={m.role === "dj" ? "host" : "user"} />
          <div className="chat-message-body">
            <div className="chat-meta">
              <strong>{m.role === "dj" ? "Claudio" : "你"}</strong>
            </div>
            <p>{m.text}</p>
          </div>
        </article>
      ))}
      {status && (
        <div className="chat-status">{status}</div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
