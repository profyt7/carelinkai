"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MessageCircle, User, Bot, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "Help me find assisted living homes",
  "What's the difference between Medicaid and private-pay?",
  "What questions should I ask during a tour?",
  "Tell me about memory care options",
];

/**
 * Main chat window component with message history and input
 */
export default function ChatWindow({ onClose }: ChatWindowProps) {
  const { data: session } = useSession() || {};
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load from session storage
    if (typeof window !== "undefined") {
      const stored = sessionStorage?.getItem?.("carebot_history");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed?.map?.((m: any) => ({
            ...m,
            timestamp: new Date(m?.timestamp || Date.now()),
          })) ?? [];
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  // Save to session storage
  useEffect(() => {
    if (typeof window !== "undefined" && messages?.length > 0) {
      sessionStorage?.setItem?.("carebot_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef?.current?.focus?.();
  }, []);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input?.trim?.();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`
,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...(prev ?? []), userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/carebot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...(messages ?? []), userMessage]?.map?.((m) => ({
            role: m?.role,
            content: m?.content,
          })),
          userContext: {
            isAuthenticated: !!session,
            userRole: session?.user?.role || null,
            userName: session?.user?.name || null,
          },
        }),
      });

      if (!response?.ok) {
        throw new Error(`API error: ${response?.status}`);
      }

      const reader = response?.body?.getReader?.();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`
,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...(prev ?? []), assistantMessage]);

      while (true) {
        const { done, value } = (await reader?.read?.()) ?? { done: true, value: undefined };
        if (done) break;

        const chunk = decoder?.decode?.(value, { stream: true }) ?? "";
        const lines = chunk?.split?.("\n") ?? [];

        for (const line of lines) {
          if (line?.startsWith?.("data: ")) {
            const data = line?.slice?.(6);
            if (data === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON?.parse?.(data);
              const content = parsed?.choices?.[0]?.delta?.content || "";
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const updated = [...(prev ?? [])];
                  const lastMsg = updated?.[updated?.length - 1];
                  if (lastMsg?.role === "assistant") {
                    updated[updated?.length - 1] = {
                      ...lastMsg,
                      content: assistantContent,
                    };
                  }
                  return updated;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError("Sorry, I'm having trouble connecting. Please try again.");
      // Remove the empty assistant message
      setMessages((prev) => prev?.filter?.((m) => m?.content?.length > 0) ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e?.key === "Enter" && !e?.shiftKey) {
      e?.preventDefault?.();
      handleSend();
    }
  };

  return (
    <div className="flex h-[600px] w-[380px] flex-col rounded-2xl bg-white shadow-2xl md:w-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold">CareBot</h3>
            <p className="text-xs text-white/80">Your 24/7 Senior Care Guide</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 transition-colors hover:bg-white/10"
          aria-label="Close chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle size={48} className="mb-4 text-primary-300" />
            <h4 className="mb-2 text-lg font-semibold text-neutral-700">Welcome to CareBot!</h4>
            <p className="mb-6 text-sm text-neutral-500">I'm here to help you navigate senior care. Try asking:</p>
            <div className="grid gap-2">
              {SUGGESTED_PROMPTS?.map?.((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
                >
                  {prompt}
                </button>
              )) ?? null}
            </div>
          </div>
        )}

        {messages?.map?.((message) => (
          <div
            key={message?.id}
            className={"flex gap-3 " + (message?.role === "user" ? "justify-end" : "justify-start")}
          >
            {message?.role === "assistant" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <Bot size={16} />
              </div>
            )}
            <div
              className={
                "max-w-[75%] rounded-2xl px-4 py-2 " +
                (message?.role === "user"
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-800")
              }
            >
              <p className="whitespace-pre-wrap text-sm">{message?.content}</p>
              <p className="mt-1 text-xs opacity-60">
                {message?.timestamp?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) ?? ""}
              </p>
            </div>
            {message?.role === "user" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                <User size={16} />
              </div>
            )}
          </div>
        )) ?? null}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <Bot size={16} />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2">
              <Loader2 size={16} className="animate-spin text-primary-500" />
              <span className="text-sm text-neutral-600">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-error-100 text-error-600">
              <AlertCircle size={16} />
            </div>
            <div className="rounded-2xl bg-error-50 px-4 py-2">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e?.target?.value ?? "")}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about senior care..."
            className={
              "flex-1 resize-none rounded-lg border border-neutral-300 px-4 py-2 text-sm " +
              "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            }
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input?.trim?.() || isLoading}
            className={
              "flex h-full items-center justify-center rounded-lg bg-primary-500 px-4 text-white " +
              "transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            }
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 text-center">
          CareBot can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
