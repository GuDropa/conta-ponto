import { getSession } from "@/lib/si/server-session";
import { redirect } from "next/navigation";
import { getAirtable } from "@/lib/si/airtable";
import MinhasClient from "./minhas-client";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/solicita-insumos/login");
  let rows: Awaited<ReturnType<typeof loadOwn>> = [];
  try {
    rows = await loadOwn(session.setor, session.nome);
  } catch {
    /* env ausente */
  }
  return <MinhasClient initial={rows} />;
}

async function loadOwn(setor: string | undefined, nome: string) {
  const at = getAirtable();
  const all = await at.solicitacoes.list({ setor, solicitante: nome });
  return all;
}
