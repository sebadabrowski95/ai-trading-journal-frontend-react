import { AuthLayout } from "../login/auth-layout";
import { LogoutButton } from "./logout-button";

export default function LoggedInPage() {
  return (
    <AuthLayout
      title="Zalogowano"
      description="Serwer poprawnie przetworzył żądanie i możesz przejść dalej."
      footerText="Chcesz wrócić?"
      footerLinkHref="/login"
      footerLinkLabel="Przejdź do logowania"
    >
      <div className="space-y-4 text-center">
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-base font-medium text-emerald-800">
          Zalogowano
        </p>
        <LogoutButton />
      </div>
    </AuthLayout>
  );
}
