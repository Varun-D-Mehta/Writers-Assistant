"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useChatStore } from "@/stores/useChatStore";
import { useProposalStore } from "@/stores/useProposalStore";
import { API_BASE } from "@/lib/constants";
import ChatMessage from "./ChatMessage";

interface ChatTabProps {
  projectSlug: string;
  partSlug: string;
  chapterSlug: string;
  editor: Editor | null;
}

export default function ChatTab({
  projectSlug,
  partSlug,
  chapterSlug,
  editor,
}: ChatTabProps) {
  const {
    messages,
    isStreaming,
    streamedText,
    setStreaming,
    setStreamedText,
    appendStreamToken,
    loadHistory,
    addMessage,
    clearChat,
  } = useChatStore();
  const { addProposal } = useProposalStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory(projectSlug, partSlug, chapterSlug);
  }, [projectSlug, partSlug, chapterSlug, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    });

    setStreaming(true);
    setStreamedText("");

    try {
      const chapterContent = editor?.getJSON() ?? null;
      const res = await fetch(
        `${API_BASE}/api/projects/${projectSlug}/parts/${partSlug}/chapters/${chapterSlug}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            chapter_content: chapterContent,
          }),
        }
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.done) {
              fullResponse = data.full_response;
              // Auto-create proposals from structured backend data
              if (data.proposals && Array.isArray(data.proposals)) {
                for (const p of data.proposals) {
                  addProposal(projectSlug, partSlug, chapterSlug, {
                    source: "chat",
                    source_label: "Chat suggestion",
                    original_text: (p.original || "").trim(),
                    proposed_text: (p.proposed || "").trim(),
                    proposal_type: p.type || "rewrite",
                  });
                }
              }
            } else if (data.token) {
              appendStreamToken(data.token);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullResponse,
        created_at: new Date().toISOString(),
      });

    } finally {
      setStreaming(false);
      setStreamedText("");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-slate-500">
              Ask anything about your chapter...
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
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
            placeholder="Ask about your chapter..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                sendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        <button
          onClick={() => clearChat(projectSlug, partSlug, chapterSlug)}
          className="mt-2 w-full text-xs text-slate-500 hover:text-red-400"
        >
          Clear Chat
        </button>
      </div>
    </div>
  );
}
