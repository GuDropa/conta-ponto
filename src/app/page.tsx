import { TimecardWorkspace } from "@/components/timecard/timecard-workspace";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 bg-unimax-blue px-4 py-3 text-white shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Conta Ponto</h1>
        <p className="text-sm text-white/70">
          Supermercado Unimax
        </p>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-4 pb-8">
        <TimecardWorkspace />
      </main>
    </div>
  );
}
