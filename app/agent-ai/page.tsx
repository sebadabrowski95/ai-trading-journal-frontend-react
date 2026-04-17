"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { sendChatMessage, ChatMessage } from "@/lib/api/ai";
import {
  clearAccessToken,
  getAccessToken,
  isLoggedIn,
} from "@/lib/auth/storage";
import { TopNavigation } from "../_components/top-navigation";
import {useRouter} from "next/navigation";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Cześć! Jestem Twoim asystentem AI. Jak mogę Ci dziś pomóc w tradingu? Możesz pytać o strategie, analizę ryzyka, optymalizację portfela lub cokolwiek związanego z handlem.",
};

export default function AgentAiPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = inputValue.trim();
    if (!trimmedPrompt || isLoading) {
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      clearAccessToken();
      router.replace("/login");
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: trimmedPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await sendChatMessage(accessToken, trimmedPrompt);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.message,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.");
      }

      setMessages((prev) => prev.filter((msg) => msg !== userMessage));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  }

  return (
    <main className="flex h-screen flex-col bg-[linear-gradient(180deg,#f3f4f6_0%,#e4e7eb_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 flex-1 min-h-0">
        <TopNavigation />

        <section className="flex flex-col flex-1 min-h-0 rounded-[28px] border border-white/60 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-5">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              AI Trading Assistant
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Agent-AI
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 ${
                      message.role === "user"
                        ? "bg-zinc-950 text-white"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-3xl border border-zinc-200 bg-zinc-50 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-zinc-200 px-6 py-4">
            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex items-start gap-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napisz wiadomość..."
                  rows={1}
                  disabled={isLoading}
                  className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  style={{ maxHeight: "120px" }}
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="flex-shrink-0 rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Wyślij
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
