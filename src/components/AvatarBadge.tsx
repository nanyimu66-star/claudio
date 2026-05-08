"use client";

type Props = { kind: "host" | "user"; className?: string };

export default function AvatarBadge({ kind, className = "" }: Props) {
  const label = kind === "host" ? "C" : "你";
  return (
    <span className={`avatar-badge ${kind} ${className}`.trim()} aria-label={kind === "host" ? "Claudio" : "你"}>
      <span className="avatar-badge-fallback">{label}</span>
    </span>
  );
}
