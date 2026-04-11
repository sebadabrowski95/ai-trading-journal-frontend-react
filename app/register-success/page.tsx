import Link from "next/link";
import { RedirectIfLoggedIn } from "@/lib/auth/redirect-if-logged-in";
import { AuthLayout } from "../login/auth-layout";

type RegisterSuccessPageProps = {
  searchParams: Promise<{
    email?: string;
    message?: string;
  }>;
};

export default async function RegisterSuccessPage({
  searchParams,
}: RegisterSuccessPageProps) {
  const { email, message } = await searchParams;

  return (
    <AuthLayout
      title="Rejestracja zakończona"
      description="Konto zostało poprawnie zarejestrowane."
      footerText="Masz już link aktywacyjny?"
      footerLinkHref="/login"
      footerLinkLabel="Przejdź do logowania"
    >
      <RedirectIfLoggedIn />
      <div className="space-y-4 text-center">
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-base font-medium text-emerald-800">
          {message ?? "Rejestracja zakończyła się powodzeniem."}
        </p>
        {email ? (
          <p className="text-sm text-zinc-600">
            Konto testowe: <span className="font-semibold text-zinc-900">{email}</span>
          </p>
        ) : null}
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
