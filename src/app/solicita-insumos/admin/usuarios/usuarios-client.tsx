"use client";

import { useCallback, useEffect, useState } from "react";

type UsuarioSafe = {
  id: string;
  usuario: string;
  papel: "gestor" | "lider";
  setor?: string;
  ativo: boolean;
};

export default function UsuariosClient({ setores }: { setores: string[] }) {
  const [rows, setRows] = useState<UsuarioSafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/si/usuarios");
    const d = await r.json();
    if (d.ok) setRows(d.usuarios);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // form
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<"gestor" | "lider">("lider");
  const [setor, setSetor] = useState(setores[0] ?? "");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await fetch("/api/si/usuarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        usuario,
        senha,
        papel,
        setor: papel === "lider" ? setor : undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      setError(d.reason ?? "erro");
      return;
    }
    setUsuario("");
    setSenha("");
    load();
  }

  async function toggleAtivo(u: UsuarioSafe) {
    await fetch(`/api/si/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    load();
  }

  async function resetSenha(u: UsuarioSafe) {
    const nova = prompt(`Nova senha para ${u.usuario} (mín 6):`);
    if (!nova) return;
    const r = await fetch(`/api/si/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ senha: nova }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) alert(d.reason ?? "erro");
    else alert("senha alterada");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Usuários</h1>

      <form
        onSubmit={criar}
        className="mb-6 space-y-2 rounded-xl border border-border bg-card p-4"
      >
        <h2 className="text-base font-bold">Novo usuário</h2>
        <Field label="Usuário">
          <input
            className="input"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </Field>
        <Field label="Senha (mín 6)">
          <input
            type="password"
            className="input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            required
          />
        </Field>
        <Field label="Papel">
          <select
            className="input"
            value={papel}
            onChange={(e) => setPapel(e.target.value as "gestor" | "lider")}
          >
            <option value="lider">Líder</option>
            <option value="gestor">Gestor</option>
          </select>
        </Field>
        {papel === "lider" && (
          <Field label="Setor">
            {setores.length > 0 ? (
              <select
                className="input"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                required
              >
                {setores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                required
              />
            )}
          </Field>
        )}
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="min-h-[44px] w-full rounded-lg bg-primary px-4 font-medium text-primary-foreground"
        >
          Criar
        </button>
      </form>

      <h2 className="mb-2 text-base font-bold">Lista</h2>
      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      <ul className="space-y-2">
        {rows.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
          >
            <div>
              <p className="font-semibold">{u.usuario}</p>
              <p className="text-xs text-muted-foreground">
                {u.papel}
                {u.setor ? ` · ${u.setor}` : ""} {u.ativo ? "" : "· inativo"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => resetSenha(u)}
                className="min-h-[36px] rounded-md border border-border px-3 text-sm"
              >
                Senha
              </button>
              <button
                type="button"
                onClick={() => toggleAtivo(u)}
                className="min-h-[36px] rounded-md border border-border px-3 text-sm"
              >
                {u.ativo ? "Inativar" : "Ativar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
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
