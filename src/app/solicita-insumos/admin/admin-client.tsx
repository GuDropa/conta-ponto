"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Solicitacao, Prioridade, Status } from "@/lib/si/airtable";
import { SolicitacoesList } from "../_components/solicitacoes-table";

const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "urgente"];
const STATUS: Status[] = ["pendente", "aprovada", "recusada", "cancelada", "atendida"];

export default function AdminClient({ setores }: { setores: string[] }) {
  const [filters, setFilters] = useState<{
    setor: string;
    status: string;
    prioridade: string;
    solicitante: string;
    desde: string;
    ate: string;
  }>({
    setor: "",
    status: "",
    prioridade: "",
    solicitante: "",
    desde: "",
    ate: "",
  });
  const [rows, setRows] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.setor) p.set("setor", filters.setor);
    if (filters.status) p.set("status", filters.status);
    if (filters.prioridade) p.set("prioridade", filters.prioridade);
    if (filters.solicitante) p.set("solicitante", filters.solicitante);
    if (filters.desde) p.set("desde", filters.desde);
    if (filters.ate) p.set("ate", filters.ate);
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/si/solicitacoes?${qs}`);
    const d = await r.json();
    if (d.ok) setRows(d.solicitacoes);
    setLoading(false);
  }, [qs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const [decision, setDecision] = useState<{
    row: Solicitacao;
    to: Status;
  } | null>(null);

  async function changeStatus(row: Solicitacao, to: Status, motivo?: string) {
    const r = await fetch(`/api/si/solicitacoes/${row.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: to, motivo }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      alert(d.reason ?? "erro");
      return false;
    }
    load();
    return true;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Administração</h1>
        <a
          href={`/api/si/export?${qs}`}
          className="min-h-[40px] inline-flex items-center rounded-lg bg-secondary px-4 text-sm font-medium"
        >
          Exportar .xlsx
        </a>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Sel
          value={filters.setor}
          onChange={(v) => setFilters((f) => ({ ...f, setor: v }))}
          label="Setor"
          options={["", ...setores]}
        />
        <Sel
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          label="Status"
          options={["", ...STATUS]}
        />
        <Sel
          value={filters.prioridade}
          onChange={(v) => setFilters((f) => ({ ...f, prioridade: v }))}
          label="Prioridade"
          options={["", ...PRIORIDADES]}
        />
        <Inp
          value={filters.solicitante}
          onChange={(v) => setFilters((f) => ({ ...f, solicitante: v }))}
          label="Solicitante"
        />
        <Inp
          type="date"
          value={filters.desde}
          onChange={(v) => setFilters((f) => ({ ...f, desde: v }))}
          label="Desde"
        />
        <Inp
          type="date"
          value={filters.ate}
          onChange={(v) => setFilters((f) => ({ ...f, ate: v }))}
          label="Até"
        />
      </div>

      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      <SolicitacoesList
        rows={rows}
        showSetor
        showSolicitante
        actions={(s) => (
          <>
            {s.status === "pendente" && (
              <>
                <button
                  type="button"
                  onClick={() => changeStatus(s, "aprovada")}
                  className="min-h-[36px] rounded-md bg-emerald-500/10 px-3 text-sm text-emerald-700"
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => setDecision({ row: s, to: "recusada" })}
                  className="min-h-[36px] rounded-md bg-destructive/10 px-3 text-sm text-destructive"
                >
                  Recusar
                </button>
              </>
            )}
            {s.status === "aprovada" && (
              <button
                type="button"
                onClick={() => changeStatus(s, "atendida")}
                className="min-h-[36px] rounded-md bg-blue-500/10 px-3 text-sm text-blue-700"
              >
                Marcar atendida
              </button>
            )}
            {(s.status === "pendente" || s.status === "aprovada") && (
              <button
                type="button"
                onClick={() =>
                  confirm("Cancelar?") && changeStatus(s, "cancelada")
                }
                className="min-h-[36px] rounded-md border border-border px-3 text-sm"
              >
                Cancelar
              </button>
            )}
          </>
        )}
      />

      {decision && (
        <MotivoModal
          onCancel={() => setDecision(null)}
          onConfirm={async (motivo) => {
            const ok = await changeStatus(decision.row, decision.to, motivo);
            if (ok) setDecision(null);
          }}
        />
      )}

      <style>{`.input{width:100%;min-height:40px;padding:0 10px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:inherit;font-size:14px}`}</style>
    </main>
  );
}

function Sel({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "Todos"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Inp({
  value,
  onChange,
  label,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function MotivoModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-4">
        <h2 className="text-lg font-bold">Motivo da recusa</h2>
        <textarea
          className="input min-h-[100px] py-2"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          autoFocus
          required
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-lg border border-border px-4"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!motivo.trim()}
            onClick={() => onConfirm(motivo.trim())}
            className="min-h-[44px] flex-1 rounded-lg bg-destructive px-4 font-medium text-destructive-foreground disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
        <style>{`.input{width:100%;padding:8px 10px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:inherit}`}</style>
      </div>
    </div>
  );
}
