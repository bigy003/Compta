"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TEAL = "#14b8a6";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  date: Date;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      date: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json().catch(() => ({ reply: "Désolé, une erreur est survenue." }));
      const reply = data.reply ?? "Désolé, je n'ai pas pu répondre.";

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply.replace(/\*\*(.*?)\*\*/g, "$1"),
        date: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Impossible de joindre l'assistant. Vérifiez que le serveur est démarré.",
        date: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ backgroundColor: TEAL }}
        aria-label="Ouvrir l'assistant"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Panneau de chat */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl"
          style={{ height: "min(520px, 70vh)" }}
        >
          <header
            className="flex items-center justify-between border-b border-zinc-100 px-4 py-3"
            style={{ backgroundColor: TEAL }}
          >
            <span className="font-semibold text-white">Assistant ComptaCI</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-white/90 hover:bg-white/20"
              aria-label="Fermer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-zinc-500">
                Posez une question sur la comptabilité, les factures, la TVA, le stock, etc. Tapez <strong>aide</strong> pour commencer.
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "text-white"
                      : "border border-zinc-100 bg-zinc-50 text-zinc-800"
                  }`}
                  style={msg.role === "user" ? { backgroundColor: TEAL } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                  Réflexion...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-zinc-100 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
