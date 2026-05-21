import { getSession } from "@/lib/si/server-session";
import { redirect } from "next/navigation";
import { getAirtable } from "@/lib/si/airtable";
import NovaSolicitacaoClient from "./nova-client";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/solicita-insumos/login");
  let produtos: { id: string; nome: string; setor: string; unidade_default: string }[] = [];
  let setores: string[] = [];
  try {
    const at = getAirtable();
    if (session.papel === "gestor") {
      produtos = await at.produtos.listAll();
      setores = (await at.setores.list()).map((s) => s.nome).sort();
    } else if (session.setor) {
      produtos = await at.produtos.listBySetor(session.setor);
      setores = [session.setor];
    }
  } catch {
    // env ausente / sem conexão
  }
  return (
    <NovaSolicitacaoClient
      papel={session.papel}
      setor={session.setor ?? ""}
      setores={setores}
      produtos={produtos}
    />
  );
}
