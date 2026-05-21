import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/si/server-session";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/solicita-insumos/login");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Solicita Insumos</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {session.nome} ({session.papel}
          {session.setor ? ` · ${session.setor}` : ""})
        </p>
      </header>
      <div className="space-y-3">
        <NavCard href="/solicita-insumos/nova" title="Nova solicitação" desc="Pedir insumo" />
        <NavCard href="/solicita-insumos/minhas" title="Minhas solicitações" desc="Histórico" />
        {(session.papel === "lider" || session.papel === "gestor") && (
          <NavCard
            href="/solicita-insumos/setor"
            title="Solicitações do setor"
            desc="Editar / cancelar"
          />
        )}
        {session.papel === "gestor" && (
          <>
            <NavCard
              href="/solicita-insumos/admin"
              title="Administração"
              desc="Aprovar / recusar / exportar"
            />
            <NavCard
              href="/solicita-insumos/admin/usuarios"
              title="Usuários"
              desc="Gestores e líderes"
            />
          </>
        )}
        <form action="/api/si/auth/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[72px] items-center gap-4 rounded-2xl bg-card px-5 py-4 shadow-sm active:scale-95 active:bg-muted"
    >
      <div className="flex-1">
        <h2 className="text-base font-bold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
