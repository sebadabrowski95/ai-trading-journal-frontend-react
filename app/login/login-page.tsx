"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { setAccessToken, setUserEmail } from "@/lib/auth/storage";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await login({ email, password });
      setAccessToken(response.accessToken);
      setUserEmail(email);
      router.push("/trading-jurnal");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nie udało się zalogować. Spróbuj ponownie.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Zaloguj się"
      description="Wpisz dane konta, aby przejść do swojego dziennika transakcji."
      footerText="Nie masz jeszcze konta?"
      footerLinkHref="/register"
      footerLinkLabel="Zarejestruj się"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input
            type="email"
            name="email"
            placeholder="twoj@email.com"
            required
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Hasło</span>
          <input
            type="password"
            name="password"
            placeholder="Wpisz hasło"
            required
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <Link
          href="/forgot-password"
          className="block text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          Przypomnij hasło
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
        >
          {isSubmitting ? "Logowanie..." : "Zaloguj"}
        </button>
      </form>
    </AuthLayout>
  );
}
