"use client";

import { useEffect, useState } from "react";
import type { Solicitacao } from "@/lib/si/airtable";
import { SolicitacoesList } from "../_components/solicitacoes-table";

export default function MinhasClient({ initial }: { initial: Solicitacao[] }) {
  const [rows, setRows] = useState<Solicitacao[]>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch("/api/si/solicitacoes?scope=own")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setRows(d.solicitacoes);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Minhas solicitações</h1>
      {loading && (
        <p className="mb-2 text-xs text-muted-foreground">Atualizando…</p>
      )}
      <SolicitacoesList rows={rows} />
    </main>
  );
}
