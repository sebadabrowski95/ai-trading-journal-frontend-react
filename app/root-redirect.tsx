"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isLoggedIn } from "@/lib/auth/storage";

export function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/trading-jurnal");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-500">
      <p className="text-sm">Ładowanie...</p>
    </div>
  );
}
