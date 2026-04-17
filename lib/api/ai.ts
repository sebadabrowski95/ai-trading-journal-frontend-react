import { apiRequest } from "./client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  prompt: string;
};

export type ChatResponse = {
  message: string;
  response: string;
};

export function sendChatMessage(
  accessToken: string,
  prompt: string
) {
  return apiRequest<ChatResponse>("/api/ai/chat", {
    method: "POST",
    accessToken,
    body: { prompt } satisfies ChatRequest,
  });
}
