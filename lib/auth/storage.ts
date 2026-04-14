export const ACCESS_TOKEN_KEY = "accessToken";
export const USER_EMAIL_KEY = "userEmail";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setUserEmail(email: string) {
  window.localStorage.setItem(USER_EMAIL_KEY, email);
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(USER_EMAIL_KEY);
}

export function clearUserEmail() {
  window.localStorage.removeItem(USER_EMAIL_KEY);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken()?.trim());
}
