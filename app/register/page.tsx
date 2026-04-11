"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth/storage";
import { register } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { AuthLayout } from "../login/auth-layout";

const passwordRequirements =
  "Hasło musi mieć minimum 8 znaków oraz zawierać małą literę, dużą literę, cyfrę i znak specjalny.";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/me");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setErrorMessage("Hasła muszą być identyczne.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ email: submittedEmail, password });

      router.push(`/register-success`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nie udało się utworzyć konta. Spróbuj ponownie.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Załóż konto"
      description="Utwórz konto, aby zapisywać transakcje i analizować wyniki."
      footerText="Masz już konto?"
      footerLinkHref="/login"
      footerLinkLabel="Zaloguj się"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input
            type="email"
            name="email"
            placeholder="twoj@email.com"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
          />
        </label>


        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Hasło</span>
          <input
            type="password"
            name="password"
            placeholder="Ustaw hasło"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
          />
        </label>

        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {passwordRequirements}
        </p>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">
            Powtórz hasło
          </span>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Powtórz hasło"
            required
            autoComplete="new-password"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/40"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
        >
          {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
        </button>

        <Link
          href="/forgot-password"
          className="block text-center text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          Masz problem z dostępem?
        </Link>
      </form>
    </AuthLayout>
  );
}
