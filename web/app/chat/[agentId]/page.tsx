"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User, ArrowLeft, Sparkles } from "lucide-react";
import { AGENT_DEFINITIONS, type AgentDefinition } from "@/lib/agents/definitions";

interface Message {
  role: "assistant" | "user";
  content: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const agent = AGENT_DEFINITIONS[agentId];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (agent) {
      setMessages([{ role: "assistant", content: agent.greeting }]);
    }
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setInput("");
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      // Send only user/assistant messages (skip greeting for API)
      const apiMessages = newMessages
        .filter((_, i) => i > 0 || newMessages[0].role === "user")
        .map((m) => ({ role: m.role, content: m.content }));

      // Include all messages for context
      const res = await fetch(`/api/chat/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages.length > 0 ? apiMessages : [{ role: "user", content: text }] }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ ${err.error || "Something went wrong. Please try again."}`,
          };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ Connection error. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, agentId, messages]);

  if (!agent) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-2xl font-bold text-white mb-2">Agent not found</h1>
        <p className="text-zinc-500 mb-6">The agent &quot;{agentId}&quot; doesn&apos;t exist.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-neutral-200 transition-colors"
        >
          Browse Agents
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{agent.name}</h1>
            <p className="text-[11px] text-zinc-500 truncate">Free Preview • Powered by AI</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-medium text-emerald-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                  msg.role === "assistant"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-white/10 text-white"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                    : "bg-emerald-500/20 text-white border border-emerald-500/20"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {msg.content ||
                    (isStreaming && i === messages.length - 1 ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-500">
                        <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                      </span>
                    ) : (
                      ""
                    ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="py-4 border-t border-white/[0.06]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={agent.inputHint}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            disabled={isStreaming}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-all hover:bg-emerald-400 disabled:opacity-30"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-zinc-600 text-center">
          Powered by FAIVR • Responses are AI-generated
        </p>
      </div>
    </div>
  );
}
