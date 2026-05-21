import { getSession } from "@/lib/si/server-session";
import { redirect } from "next/navigation";
import SetorClient from "./setor-client";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/solicita-insumos/login");
  if (session.papel === "funcionario") redirect("/solicita-insumos");
  return <SetorClient />;
}
