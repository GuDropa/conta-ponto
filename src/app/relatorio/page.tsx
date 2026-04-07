import Image from "next/image";
import { HoursReport } from "@/components/report/hours-report";

export default function RelatorioPage() {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <header className="sticky top-0 z-30 w-full bg-unimax-blue text-white shadow-md">
        <div className="mx-auto flex w-full max-w-[1000px] items-center gap-3 px-4 py-3">
          <Image
            src="/assets/logo-unimax.png"
            alt="Unimax"
            width={40}
            height={40}
            className="shrink-0"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Emitir Horas</h1>
            <p className="text-sm text-white/70">
              Supermercado Unimax
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1000px] px-4 pt-4 pb-8">
          <HoursReport />
        </div>
      </main>
    </div>
  );
}
