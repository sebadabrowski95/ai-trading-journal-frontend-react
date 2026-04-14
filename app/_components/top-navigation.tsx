"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import  getCurrentUser  from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearAccessToken, getAccessToken, getUserEmail } from "@/lib/auth/storage";
import { LogoutButton } from "../trading-jurnal/logout-button";

const NAV_ITEMS = [
  { href: "/trading-jurnal", label: "Dziennik transakcji" },
  { href: "/dashboard", label: "Wykresy" },
  { href: "/agent-ai", label: "Agent-AI" },
];

export function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string>(() => getUserEmail() || "");

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await getCurrentUser(accessToken);
        if (!cancelled) {
          setUsername(response.username);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAccessToken();
          router.replace("/login");
        }
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="rounded-[28px] border border-white/60 bg-white/90 px-5 py-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap items-center gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                pathname === item.href
                  ? "bg-zinc-950 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {username}
          </div>
          <div className="sm:w-35">
            <LogoutButton />
          </div>
        </div>
      </div>
    </section>
  );
}
