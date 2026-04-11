"use client";

import { useRouter } from "next/navigation";
import { clearAccessToken } from "@/lib/auth/storage";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    clearAccessToken();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      Wyloguj
    </button>
  );
}
