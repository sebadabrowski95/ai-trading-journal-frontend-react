"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth/storage";
import { requestPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { AuthLayout } from "../login/auth-layout";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/me");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    setIsSubmitting(true);

    try {
      const response = await requestPasswordReset({ email });
      setSuccessMessage(
        response.message ??
          "Jeśli konto istnieje, wysłaliśmy wiadomość z instrukcją resetu hasła."
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Nie udało się wysłać linku resetującego. Spróbuj ponownie."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <AuthLayout
        title="Sprawdź skrzynkę"
        description="Jeśli podany adres jest powiązany z kontem, wyślemy instrukcję resetu hasła."
        footerText="Pamiętasz hasło?"
        footerLinkHref="/login"
        footerLinkLabel="Wróć do logowania"
      >
        <div className="space-y-4 text-center">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-base font-medium text-emerald-800">
            {successMessage}
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Wróć do logowania
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Przypomnij hasło"
      description="Podaj email, a wyślemy Ci instrukcję resetu hasła."
      footerText="Pamiętasz hasło?"
      footerLinkHref="/login"
      footerLinkLabel="Wróć do logowania"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input
            type="email"
            name="email"
            placeholder="twoj@email.com"
            required
            autoComplete="email"
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
          {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
        </button>

        <Link
          href="/register"
          className="block text-center text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          Nie masz konta? Zarejestruj się
        </Link>
      </form>
    </AuthLayout>
  );
}
