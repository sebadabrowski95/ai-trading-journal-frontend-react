"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth/storage";
import { confirmPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { AuthLayout } from "../login/auth-layout";

const passwordRequirements =
  "Hasło musi mieć minimum 8 znaków oraz zawierać małą literę, dużą literę, cyfrę i znak specjalny.";

type ResetPasswordFormProps = {
  token?: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedToken = token?.trim();

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/trading-jurnal");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!trimmedToken) {
      setErrorMessage("Brak tokenu resetu w adresie URL.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Hasła muszą być identyczne.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await confirmPasswordReset({
        token: trimmedToken,
        newPassword,
      });
      setSuccessMessage(response.message ?? "Hasło zostało zmienione.");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nie udało się zmienić hasła. Spróbuj ponownie.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!trimmedToken) {
    return (
      <AuthLayout
        title="Nieprawidłowy link"
        description="Brakuje tokenu resetu hasła w adresie strony."
        footerText="Chcesz poprosić o nowy link?"
        footerLinkHref="/forgot-password"
        footerLinkLabel="Wyślij link resetujący"
      >
        <div className="space-y-4 text-center">
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            Otwórz link z wiadomości e-mail lub poproś o nowy reset hasła.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Przejdź do resetu hasła
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (successMessage) {
    return (
      <AuthLayout
        title="Hasło zmienione"
        description="Możesz zalogować się przy użyciu nowego hasła."
        footerText="Gotowe?"
        footerLinkHref="/login"
        footerLinkLabel="Przejdź do logowania"
      >
        <div className="space-y-4 text-center">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-base font-medium text-emerald-800">
            {successMessage}
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Zaloguj się
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Ustaw nowe hasło"
      description="Wpisz nowe hasło dla swojego konta."
      footerText="Pamiętasz stare hasło?"
      footerLinkHref="/login"
      footerLinkLabel="Wróć do logowania"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Nowe hasło</span>
          <input
            type="password"
            name="newPassword"
            placeholder="Nowe hasło"
            required
            minLength={8}
            maxLength={128}
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
            minLength={8}
            maxLength={128}
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
          {isSubmitting ? "Zapisywanie..." : "Ustaw nowe hasło"}
        </button>
      </form>
    </AuthLayout>
  );
}
