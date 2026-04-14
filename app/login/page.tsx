"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ACCESS_TOKEN_KEY, isLoggedIn } from "@/lib/auth/storage";
import { LoginPage } from "./login-page";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY || event.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getLoginSnapshot() {
  return isLoggedIn();
}

function getServerLoginSnapshot() {
  return false;
}

export default function LoginRoutePage() {
  const router = useRouter();
  const loggedIn = useSyncExternalStore(
    subscribe,
    getLoginSnapshot,
    getServerLoginSnapshot
  );

  useEffect(() => {
    if (loggedIn) {
      router.replace("/trading-jurnal");
    }
  }, [loggedIn, router]);

  if (loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-500">
        <p className="text-sm">Ładowanie...</p>
      </div>
    );
  }

  return <LoginPage />;
}
