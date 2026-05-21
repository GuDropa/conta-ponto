import { getSession } from "@/lib/si/server-session";
import { redirect } from "next/navigation";
import { getAirtable } from "@/lib/si/airtable";
import LoginClient from "./login-client";

export default async function Page() {
  const session = await getSession();
  if (session) redirect("/solicita-insumos");
  let setores: string[] = [];
  try {
    const at = getAirtable();
    setores = (await at.setores.list()).map((s) => s.nome).sort();
  } catch {
    // env ausente em dev — UI mostra fallback
  }
  return <LoginClient setores={setores} />;
}
