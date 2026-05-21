import Image from "next/image";
import Link from "next/link";
import { TimecardWorkspace } from "@/components/timecard/timecard-workspace";
import { ArrowLeft } from "lucide-react";

export default function ContaPontoPage() {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <header className="sticky top-0 z-30 w-full bg-unimax-blue text-white shadow-md">
        <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-xl px-3 py-2 text-white/90 active:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Início</span>
            </Link>
            <Image
              src="/assets/logo-unimax.png"
              alt="Unimax"
              width={60}
              height={60}
              className="shrink-0"
            />
          </div>
          <div className="flex flex-col items-end">
            <h1 className="text-xl font-bold tracking-tight">Conta Ponto</h1>
            <p className="text-sm text-white/70">Supermercado Unimax</p>
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
