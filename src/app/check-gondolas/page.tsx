"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GondolaImport } from "@/components/gondola/gondola-import";
import { GondolaScanner } from "@/components/gondola/gondola-scanner";
import { GondolaReport } from "@/components/gondola/gondola-report";
import { useGondolaStore } from "@/lib/gondola-store";

type Step = "import" | "scanning" | "report";

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: "import", label: "Importar", num: 1 },
  { id: "scanning", label: "Bipar", num: 2 },
  { id: "report", label: "Relatório", num: 3 },
];
const STEP_ORDER: Step[] = ["import", "scanning", "report"];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex w-full items-center justify-center gap-0 px-2">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIdx;
        const isActive = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            {/* Dot + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-unimax-blue text-white"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isCompleted ? "✓" : step.num}
              </div>
              <span
                className={[
                  "text-xs font-semibold",
                  isActive
                    ? "text-unimax-blue"
                    : isCompleted
                      ? "text-green-600"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "mb-5 h-0.5 w-10 transition-colors",
                  i < currentIdx ? "bg-green-500" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CheckGondolasPage() {
  const { status, loadErpList, finishSession } = useGondolaStore();

  const step: Step =
    status === "idle"
      ? "import"
      : status === "ready" || status === "scanning"
        ? "scanning"
        : "report";

  const showFinishBar = status === "ready" || status === "scanning";

  return (
    /* pb-24 garante espaço para a barra fixa de "Finalizar" */
    <div className={["flex min-h-svh w-full flex-col", showFinishBar ? "pb-24" : ""].join(" ")}>

      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-unimax-blue text-white shadow-md">
        <div className="flex items-center gap-2 px-2 py-2">
          <Link
            href="/"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/90 active:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight">Check de Gôndolas</h1>
            <p className="text-xs text-white/70">Supermercado Unimax</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-lg space-y-5 px-4 pt-5 pb-6">

          {/* Stepper */}
          <StepIndicator current={step} />

          {/* ── STEP 1: Import ── */}
          {step === "import" && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-bold">Importar lista do ERP</h2>
                <p className="text-sm text-muted-foreground">
                  Carregue a planilha com os produtos que devem estar na gôndola.
                </p>
              </div>
              <GondolaImport onLoad={loadErpList} />
            </section>
          )}

          {/* ── STEP 2: Scanning ── */}
          {(status === "ready" || status === "scanning") && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Bipar produtos</h2>
                <p className="text-sm text-muted-foreground">
                  Aponte o leitor para cada produto da gôndola.
                </p>
              </div>
              <GondolaScanner />
            </section>
          )}

          {/* ── STEP 3: Report ── */}
          {status === "done" && (
            <section className="space-y-4">
              <GondolaReport />
            </section>
          )}
        </div>
      </main>

      {/* Barra fixa de finalizar — sempre acessível sem scroll (mobile) */}
      {showFinishBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-4 py-3 shadow-lg">
          <button
            type="button"
            onClick={finishSession}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-unimax-blue py-4 text-base font-bold text-white active:scale-95 active:opacity-90"
          >
            Finalizar e ver relatório →
          </button>
        </div>
      )}
    </div>
  );
}
