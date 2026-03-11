import Image from "next/image";
import { TimecardWorkspace } from "@/components/timecard/timecard-workspace";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-unimax-blue px-4 py-3 text-white shadow-md justify-between">
        <Image
          src="/assets/logo-unimax.png"
          alt="Unimax"
          width={80}
          height={80}
          className="shrink-0"
        />
        <div className="flex flex-col items-end">
          <h1 className="text-xl font-bold tracking-tight">Conta Ponto</h1>
          <p className="text-sm text-white/70">
            Supermercado Unimax
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-4 pb-8">
        <TimecardWorkspace />
      </main>
    </div>
  );
}
