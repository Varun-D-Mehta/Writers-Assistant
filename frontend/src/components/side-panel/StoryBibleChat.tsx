"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/constants";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { apiFetch } from "@/lib/api";

interface StoryBibleChatProps {
  projectSlug: string;
}

export default function StoryBibleChat({ projectSlug }: StoryBibleChatProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ messages: ChatMessageType[] }>(
      `/api/projects/${projectSlug}/story-bible/chat`
    ).then((data) => setMessages(data.messages));
  }, [projectSlug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      },
    ]);

    setIsStreaming(true);
    setStreamedText("");

    try {
      const res = await fetch(
        `${API_BASE}/api/projects/${projectSlug}/story-bible/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
        }
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let fullResponse = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              fullResponse = data.full_response;
            } else if (data.token) {
              accumulated += data.token;
              setStreamedText(accumulated);
            }
          } catch {
            // skip malformed
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullResponse,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamedText("");
    }
  }

  async function clearChat() {
    await apiFetch(`/api/projects/${projectSlug}/story-bible/chat`, {
      method: "DELETE",
    });
    setMessages([]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-slate-500">
              Ask anything about your story bible...
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "rounded-br-md bg-blue-600 text-white"
                  : "rounded-bl-md bg-slate-800 text-slate-200"
              }`}
            >
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        {isStreaming && streamedText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-800 px-4 py-2 text-sm text-slate-200">
              <span className="whitespace-pre-wrap">{streamedText}</span>
              <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-blue-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-700/50 bg-slate-900 p-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your story bible..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                sendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        <button
          onClick={clearChat}
          className="mt-2 w-full text-xs text-slate-500 hover:text-red-400"
        >
          Clear Chat
        </button>
      </div>
    </div>
  );
}
