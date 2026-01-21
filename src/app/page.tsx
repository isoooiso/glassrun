import GameScreen from "@/components/GameScreen";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">GlassRun</h1>
            <p className="text-white/60">
              Every jump is decided by AI consensus — on-chain.
            </p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <GameScreen />
        </div>

        <footer className="mt-10 text-xs text-white/40">
          MVP: no bets, no PvP — leaderboard only.
        </footer>
      </div>
    </main>
  );
}
