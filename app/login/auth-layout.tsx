import Link from "next/link";
import { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footerLinkHref: string;
  footerLinkLabel: string;
  footerText: string;
};

export function AuthLayout({
  title,
  description,
  children,
  footerLinkHref,
  footerLinkLabel,
  footerText,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_38%),linear-gradient(160deg,#8c8c8c_0%,#6d6d6d_42%,#494949_100%)] px-6 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white/25 bg-white/88 p-8 shadow-[0_24px_80px_rgba(24,24,24,0.28)] backdrop-blur">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-zinc-500">
            AI Trading Journal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h1>
          <p className="text-sm text-zinc-600">{description}</p>
        </div>

        {children}

        <p className="mt-6 text-center text-sm text-zinc-600">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            className="font-semibold text-zinc-950 transition hover:text-zinc-700"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
