import Image from "next/image";
import { HoursReport } from "@/components/report/hours-report";

export default function RelatorioPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-unimax-blue px-4 py-3 text-white shadow-md">
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
      </header>

      <main className="flex-1 px-4 pt-4 pb-8">
        <HoursReport />
      </main>
    </div>
  );
}
