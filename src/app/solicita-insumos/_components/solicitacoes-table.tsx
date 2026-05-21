"use client";

import { useState } from "react";
import type { Solicitacao } from "@/lib/si/airtable";

const STATUS_LABEL: Record<Solicitacao["status"], string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
  atendida: "Atendida",
};
const STATUS_COLOR: Record<Solicitacao["status"], string> = {
  pendente: "bg-amber-500/10 text-amber-700",
  aprovada: "bg-emerald-500/10 text-emerald-700",
  recusada: "bg-destructive/10 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
  atendida: "bg-blue-500/10 text-blue-700",
};

export function StatusBadge({ status }: { status: Solicitacao["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SolicitacoesList({
  rows,
  onAction,
  showSetor,
  showSolicitante,
  actions,
}: {
  rows: Solicitacao[];
  showSetor?: boolean;
  showSolicitante?: boolean;
  actions?: (s: Solicitacao) => React.ReactNode;
  onAction?: (s: Solicitacao) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nada por aqui ainda.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((s) => (
        <li
          key={s.id}
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
          onClick={() => onAction?.(s)}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold leading-tight">{s.produto}</p>
              <p className="text-sm text-muted-foreground">
                {s.qtd} {s.unidade} · {s.prioridade}
                {showSetor ? ` · ${s.setor}` : ""}
                {showSolicitante ? ` · ${s.solicitante}` : ""}
              </p>
              {s.obs && (
                <p className="mt-1 text-xs text-muted-foreground">{s.obs}</p>
              )}
            </div>
            <StatusBadge status={s.status} />
          </div>
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions(s)}</div>}
        </li>
      ))}
    </ul>
  );
}

export function useRefresh() {
  const [tick, setTick] = useState(0);
  return { tick, refresh: () => setTick((t) => t + 1) };
}
