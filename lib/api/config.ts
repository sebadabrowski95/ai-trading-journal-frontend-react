export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const API_SERVER_BASE_URL =
  process.env.API_SERVER_BASE_URL ?? "http://localhost:8080";

export const AUTH_ENDPOINTS = {
  activate: "/api/auth/activate",
  login: "/api/auth/login",
  me: "/api/auth/me",
  passwordResetConfirm: "/api/auth/password-reset/confirm",
  passwordResetRequest: "/api/auth/password-reset/request",
  register: "/api/auth/register",
} as const;
