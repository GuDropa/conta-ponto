"use client";

/**
 * GondolaReport — relatório de sessão. Mobile-first.
 * V4: dois grupos bem separados — encontrados e faltantes.
 * V7: exportação .xlsx com 2 sheets via gondola-xlsx.
 */
import { useState } from "react";
import { Download, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import {
  useGondolaStore,
  selectFound,
  selectMissing,
  type ErpProduct,
} from "@/lib/gondola-store";
import { gondolaReportToXlsxBlob, downloadBlob } from "@/lib/gondola-xlsx";

type Tab = "found" | "missing";

function ProductTable({ products, emptyLabel }: { products: ErpProduct[]; emptyLabel: string }) {
  if (products.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Código
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Descrição
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((p) => (
            <tr key={p.barcode}>
              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{p.barcode}</td>
              <td className="px-3 py-3 text-sm">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GondolaReport() {
  const [tab, setTab] = useState<Tab>("found");
  const store = useGondolaStore();
  const found = selectFound(store);
  const missing = selectMissing(store);

  function handleExport() {
    const blob = gondolaReportToXlsxBlob({
      found,
      missing,
      sessionDate: new Date().toISOString(),
    });
    downloadBlob(blob, `check-gondolas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="rounded-2xl bg-muted/50 px-4 py-4">
        <p className="text-sm text-muted-foreground">Sessão concluída</p>
        <p className="mt-1 text-2xl font-extrabold">
          {found.length}{" "}
          <span className="text-base font-normal text-muted-foreground">
            de {store.erpList.length} produto{store.erpList.length !== 1 ? "s" : ""} encontrado{found.length !== 1 ? "s" : ""}
          </span>
        </p>
      </div>

      {/* Tabs — touch targets grandes */}
      <div className="flex gap-1 rounded-2xl bg-muted p-1">
        {(
          [
            { id: "found" as Tab, label: "Encontrados", count: found.length, icon: <CheckCircle2 className="h-4 w-4" /> },
            { id: "missing" as Tab, label: "Faltantes", count: missing.length, icon: <XCircle className="h-4 w-4" /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-all",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {t.icon}
            {t.label}
            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs font-extrabold",
                t.id === "found"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
              ].join(" ")}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tabela */}
      {tab === "found" && (
        <ProductTable products={found} emptyLabel="Nenhum produto bipado ainda." />
      )}
      {tab === "missing" && (
        <ProductTable products={missing} emptyLabel="Todos os produtos foram encontrados! 🎉" />
      )}

      {/* Ações — full-width empilhadas */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-unimax-blue py-4 text-base font-bold text-white active:opacity-80"
        >
          <Download className="h-5 w-5" />
          Exportar relatório .xlsx
        </button>
        <button
          type="button"
          onClick={() => store.resetSession()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-base font-bold text-foreground active:bg-muted"
        >
          <RotateCcw className="h-5 w-5" />
          Nova sessão
        </button>
      </div>
    </div>
  );
}
