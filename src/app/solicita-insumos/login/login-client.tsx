"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "func" | "cred";

export default function LoginClient({ setores }: { setores: string[] }) {
  const [tab, setTab] = useState<Tab>("func");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // funcionario
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState(setores[0] ?? "");
  const [setorManual, setSetorManual] = useState("");

  // credenciais
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body =
      tab === "func"
        ? {
            kind: "funcionario" as const,
            nome,
            setor: setores.length ? setor : setorManual,
          }
        : { kind: "credenciais" as const, usuario, senha };
    try {
      const res = await fetch("/api/si/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.reason ?? "erro no login");
        setLoading(false);
        return;
      }
      router.push("/solicita-insumos");
      router.refresh();
    } catch {
      setError("erro de rede");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Solicita Insumos</h1>
      <p className="mb-6 text-sm text-muted-foreground">Entrar</p>

      <div className="mb-4 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
        <button
          type="button"
          className={`min-h-[44px] rounded-md ${tab === "func" ? "bg-card shadow-sm" : ""}`}
          onClick={() => setTab("func")}
        >
          Funcionário
        </button>
        <button
          type="button"
          className={`min-h-[44px] rounded-md ${tab === "cred" ? "bg-card shadow-sm" : ""}`}
          onClick={() => setTab("cred")}
        >
          Gestor / Líder
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {tab === "func" ? (
          <>
            <Field label="Nome">
              <input
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Field>
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
                  value={setorManual}
                  onChange={(e) => setSetorManual(e.target.value)}
                  placeholder="ex: padaria"
                  required
                />
              )}
            </Field>
          </>
        ) : (
          <>
            <Field label="Usuário">
              <input
                className="input"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                className="input"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
          </>
        )}
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
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
