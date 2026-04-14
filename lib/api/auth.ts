import { apiRequest } from "./client";
import { AUTH_ENDPOINTS } from "./config";

export type RegisterRequest = {
  email: string;
  password: string;
};

export type MessageResponse = {
  message: string;
};


export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetConfirmRequest = {
  token: string;
  newPassword: string;
};

export type CurrentUserResponse = {
  username: string;
};

export function register(payload: RegisterRequest) {
  return apiRequest<MessageResponse>(AUTH_ENDPOINTS.register, {
    method: "POST",
    body: payload,
  });
}

export function activateAccount(payload: { token: string | undefined }) {
  return apiRequest<MessageResponse>(AUTH_ENDPOINTS.activate, {
    method: "POST",
    body: payload,
  });
}

export function login(payload: LoginRequest) {
  return apiRequest<LoginResponse>(AUTH_ENDPOINTS.login, {
    method: "POST",
    body: payload,
  });
}

export function requestPasswordReset(payload: PasswordResetRequest) {
  return apiRequest<MessageResponse>(AUTH_ENDPOINTS.passwordResetRequest, {
    method: "POST",
    body: payload,
  });
}

export function confirmPasswordReset(payload: PasswordResetConfirmRequest) {
  return apiRequest<MessageResponse>(AUTH_ENDPOINTS.passwordResetConfirm, {
    method: "POST",
    body: payload,
  });
}

function getCurrentUser(accessToken: string | null) {
  return apiRequest<CurrentUserResponse>(AUTH_ENDPOINTS.me, {
    body: accessToken,
  });
}

export default getCurrentUser