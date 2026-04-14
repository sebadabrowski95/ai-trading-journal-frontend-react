"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isLoggedIn } from "@/lib/auth/storage";
import { activateAccount } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type ActivateContentProps = {
  token?: string;
};

type ActivationState = "loading" | "success" | "error";

export function ActivateAccount({ token }: ActivateContentProps) {
  const router = useRouter();
  const activationToken = token?.trim();
  const hasToken = Boolean(activationToken);
  const [state, setState] = useState<ActivationState>(hasToken ? "loading" : "error");
  const [message, setMessage] = useState(
    hasToken
      ? "Aktywujemy konto..."
      : "Brak tokenu aktywacyjnego w adresie URL."
  );
  const hasActivatedRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/trading-jurnal");
      return;
    }

    if (hasActivatedRef.current) {
      return;
    }

    if (!activationToken) {
      return;
    }

    hasActivatedRef.current = true;

    async function runActivation() {
      try {
        const response = await activateAccount({ token: activationToken });
        setState("success");
        setMessage(response.message || "Konto zostało aktywowane.");
      } catch (error) {
        setState("error");
        if (error instanceof ApiError) {
          setMessage(error.message);
          return;
        }
        setMessage("Nie udało się aktywować konta. Spróbuj ponownie później.");
      }
    }

    void runActivation();
  }, [activationToken, router]);

  if (state === "loading") {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-base font-medium text-zinc-700">
          {message}
        </p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-base font-medium text-emerald-800">
          {message}
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-base font-medium text-red-700">
        {message}
      </p>
      <Link
        href="/login"
        className="inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Wróć do logowania
      </Link>
    </div>
  );
}
