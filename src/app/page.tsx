import Image from "next/image";
import Link from "next/link";
import { ClipboardList, Clock, ChevronRight, PackagePlus } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      {/* Header */}
      <header className="w-full bg-unimax-blue px-5 pb-6 pt-8 text-white">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
          <Image
            src="/assets/logo-unimax.png"
            alt="Unimax"
            width={72}
            height={72}
            className="shrink-0"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ferramentas Unimax</h1>
            <p className="mt-0.5 text-sm text-white/70">Supermercado Unimax</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <p className="text-center text-base font-medium text-muted-foreground">
            Selecione o módulo
          </p>

          {/* Card Conta Ponto */}
          <Link
            href="/conta-ponto"
            className="flex min-h-[88px] items-center gap-4 rounded-2xl bg-card px-5 py-5 shadow-sm active:scale-95 active:bg-muted"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-unimax-blue/10">
              <Clock className="h-7 w-7 text-unimax-blue" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h2 className="text-lg font-bold leading-tight">Conta Ponto</h2>
              <p className="text-sm text-muted-foreground">
                Registro e controle de ponto
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>

          {/* Card Check de Gôndolas */}
          <Link
            href="/check-gondolas"
            className="flex min-h-[88px] items-center gap-4 rounded-2xl bg-card px-5 py-5 shadow-sm active:scale-95 active:bg-muted"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-unimax-blue/10">
              <ClipboardList className="h-7 w-7 text-unimax-blue" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h2 className="text-lg font-bold leading-tight">Check de Gôndolas</h2>
              <p className="text-sm text-muted-foreground">
                Verificação de produtos nas prateleiras
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>

          {/* Card Solicita Insumos */}
          <Link
            href="/solicita-insumos"
            className="flex min-h-[88px] items-center gap-4 rounded-2xl bg-card px-5 py-5 shadow-sm active:scale-95 active:bg-muted"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-unimax-blue/10">
              <PackagePlus className="h-7 w-7 text-unimax-blue" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h2 className="text-lg font-bold leading-tight">Solicita Insumos</h2>
              <p className="text-sm text-muted-foreground">
                Solicitação de insumos por setor
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </main>
    </div>
  );
}
