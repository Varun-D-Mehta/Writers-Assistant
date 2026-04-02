"use client";

const LOGOS: Record<string, string> = {
  quill: "\u2712\uFE0F",
  scroll: "\uD83D\uDCDC",
  inkwell: "\uD83D\uDD8B\uFE0F",
};

export default function ProjectLogo({ logo, size = "sm" }: { logo: string; size?: "sm" | "lg" }) {
  const emoji = LOGOS[logo] || "\uD83D\uDCD6";
  const sizeClass = size === "lg" ? "text-2xl" : "text-base";
  return <span className={sizeClass}>{emoji}</span>;
}
