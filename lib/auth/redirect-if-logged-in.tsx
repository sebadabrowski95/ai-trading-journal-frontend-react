"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isLoggedIn } from "./storage";

export function RedirectIfLoggedIn() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/trading-jurnal");
    }
  }, [router]);

  return null;
}
