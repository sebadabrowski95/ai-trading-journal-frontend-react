import { RedirectIfLoggedIn } from "@/lib/auth/redirect-if-logged-in";
import { AuthLayout } from "../login/auth-layout";
import { ActivateAccount } from "./activate-account";

type ActivatePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { token } = await searchParams;

  return (
    <AuthLayout
      title="Aktywacja konta"
      description="Weryfikujemy link aktywacyjny i aktywujemy Twoje konto."
      footerText="Chcesz wrócić do logowania?"
      footerLinkHref="/login"
      footerLinkLabel="Przejdź do logowania"
    >
      <RedirectIfLoggedIn />
      <ActivateAccount token={token} />
    </AuthLayout>
  );
}
