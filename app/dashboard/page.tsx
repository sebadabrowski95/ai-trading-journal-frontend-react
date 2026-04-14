import { TopNavigation } from "../_components/top-navigation";

export default function SummaryPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3f4f6_0%,#e4e7eb_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <TopNavigation />

        <section className="rounded-[28px] border border-white/60 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Wykresy
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            --TO DO--
          </p>
        </section>
      </div>
    </main>
  );
}
