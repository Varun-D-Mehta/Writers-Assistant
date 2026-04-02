"use client";

import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-slate-800 text-slate-200"
        }`}
      >
        <span className="whitespace-pre-wrap">{message.content}</span>
      </div>
    </div>
  );
}
