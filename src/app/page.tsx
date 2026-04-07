import Image from "next/image";
import { TimecardWorkspace } from "@/components/timecard/timecard-workspace";

export default function Home() {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <header className="sticky top-0 z-30 w-full bg-unimax-blue text-white shadow-md">
        <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-3 px-4 py-3">
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
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1000px] space-y-4 px-4 pt-4 pb-8">
          <TimecardWorkspace />
        </div>
      </main>
    </div>
  );
}
