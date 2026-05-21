"use client";

import { useCallback, useEffect, useState } from "react";
import type { Solicitacao, Prioridade } from "@/lib/si/airtable";
import { SolicitacoesList } from "../_components/solicitacoes-table";

const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "urgente"];

export default function SetorClient() {
  const [rows, setRows] = useState<Solicitacao[]>([]);
  const [editing, setEditing] = useState<Solicitacao | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/si/solicitacoes");
    const d = await r.json();
    if (d.ok) setRows(d.solicitacoes);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function cancelar(s: Solicitacao) {
    if (!confirm(`Cancelar solicitação de ${s.produto}?`)) return;
    const r = await fetch(`/api/si/solicitacoes/${s.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelada" }),
    });
    const d = await r.json();
    if (!d.ok) {
      alert(d.reason ?? "erro");
      return;
    }
    load();
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Solicitações do setor</h1>
      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      <SolicitacoesList
        rows={rows}
        showSolicitante
        actions={(s) => (
          <>
            {s.status === "pendente" && (
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="min-h-[36px] rounded-md border border-border px-3 text-sm"
              >
                Editar
              </button>
            )}
            {(s.status === "pendente" || s.status === "aprovada") && (
              <button
                type="button"
                onClick={() => cancelar(s)}
                className="min-h-[36px] rounded-md bg-destructive/10 px-3 text-sm text-destructive"
              >
                Cancelar
              </button>
            )}
          </>
        )}
      />

      {editing && (
        <EditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </main>
  );
}

function EditModal({
  row,
  onClose,
  onSaved,
}: {
  row: Solicitacao;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qtd, setQtd] = useState(String(row.qtd));
  const [unidade, setUnidade] = useState(row.unidade);
  const [prioridade, setPrioridade] = useState<Prioridade>(row.prioridade);
  const [obs, setObs] = useState(row.obs ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/si/solicitacoes/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ qtd: Number(qtd), unidade, prioridade, obs }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      setError(d.reason ?? "erro");
      setLoading(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
      <form
        onSubmit={save}
        className="w-full max-w-md space-y-3 rounded-t-2xl bg-card p-4 sm:rounded-2xl"
      >
        <h2 className="text-lg font-bold">Editar {row.produto}</h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Quantidade</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className="input"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Unidade</span>
          <input
            className="input"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Prioridade</span>
          <select
            className="input"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as Prioridade)}
            required
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Observação</span>
          <textarea
            className="input min-h-[80px] py-2"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </label>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-lg border border-border px-4"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] flex-1 rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
        <style>{`.input{width:100%;min-height:44px;padding:0 12px;border-radius:10px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:inherit}`}</style>
      </form>
    </div>
  );
}
