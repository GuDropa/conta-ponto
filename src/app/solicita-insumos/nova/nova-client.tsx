"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Papel } from "@/lib/si/session";

const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
type Prioridade = (typeof PRIORIDADES)[number];

type Produto = {
  id: string;
  nome: string;
  setor: string;
  unidade_default: string;
};

export default function NovaSolicitacaoClient(props: {
  papel: Papel;
  setor: string;
  setores: string[];
  produtos: Produto[];
}) {
  const router = useRouter();
  const [setor, setSetor] = useState(props.setor || props.setores[0] || "");
  const [produtos, setProdutos] = useState(props.produtos);
  const filteredProdutos = useMemo(
    () => produtos.filter((p) => p.setor === setor),
    [produtos, setor],
  );

  const [produtoId, setProdutoId] = useState<string>("");
  const [qtd, setQtd] = useState("");
  const [unidade, setUnidade] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoUnidade, setNovoUnidade] = useState("");

  const selected = filteredProdutos.find((p) => p.id === produtoId);

  function onProdutoChange(id: string) {
    setProdutoId(id);
    const p = filteredProdutos.find((x) => x.id === id);
    if (p && !unidade) setUnidade(p.unidade_default);
  }

  async function criarProduto() {
    setError(null);
    const res = await fetch("/api/si/produtos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nome: novoNome,
        setor,
        unidade_default: novoUnidade,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.reason ?? "erro ao criar produto");
      return;
    }
    setProdutos((p) => [...p, data.produto]);
    setProdutoId(data.produto.id);
    setUnidade(data.produto.unidade_default);
    setShowNovoProduto(false);
    setNovoNome("");
    setNovoUnidade("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const produto = selected?.nome ?? "";
    const res = await fetch("/api/si/solicitacoes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        produto,
        qtd: Number(qtd),
        unidade,
        prioridade,
        obs,
        setor,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.reason ?? "erro");
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
    setProdutoId("");
    setQtd("");
    setObs("");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Nova solicitação</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Preencha os dados do insumo.
      </p>

      <form onSubmit={submit} className="space-y-3">
        {props.papel === "gestor" && props.setores.length > 0 && (
          <Field label="Setor">
            <select
              className="input"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              required
            >
              {props.setores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Produto">
          <select
            className="input"
            value={produtoId}
            onChange={(e) => onProdutoChange(e.target.value)}
            required={!showNovoProduto}
            disabled={showNovoProduto}
          >
            <option value="">Selecione…</option>
            {filteredProdutos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mt-1 text-sm text-primary underline-offset-2 hover:underline"
            onClick={() => setShowNovoProduto((x) => !x)}
          >
            {showNovoProduto ? "Cancelar novo produto" : "Adicionar novo produto"}
          </button>
        </Field>

        {showNovoProduto && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <Field label="Nome do novo produto">
              <input
                className="input"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </Field>
            <Field label="Unidade padrão">
              <input
                className="input"
                value={novoUnidade}
                onChange={(e) => setNovoUnidade(e.target.value)}
                placeholder="kg, un, cx…"
              />
            </Field>
            <button
              type="button"
              onClick={criarProduto}
              className="min-h-[44px] w-full rounded-lg bg-secondary px-4 font-medium"
            >
              Criar produto
            </button>
          </div>
        )}

        <Field label="Quantidade">
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
        </Field>
        <Field label="Unidade">
          <input
            className="input"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            placeholder="kg, un, cx…"
            required
          />
        </Field>
        <Field label="Prioridade">
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
        </Field>
        <Field label="Observação">
          <textarea
            className="input min-h-[80px] py-2"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            Solicitação enviada.
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Solicitar"}
        </button>
      </form>

      <style>{`.input{width:100%;min-height:44px;padding:0 12px;border-radius:10px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:inherit}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
