import { NextResponse } from "next/server";
import { getAirtable, type Prioridade, type Status } from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { can } from "@/lib/si/rbac";
import { buildExportXlsx } from "@/lib/si/export-xlsx";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!can(session.papel, "solicitacoes.export")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const url = new URL(req.url);
  const at = getAirtable();
  const rows = await at.solicitacoes.list({
    setor: url.searchParams.get("setor") ?? undefined,
    status: (url.searchParams.get("status") as Status | null) ?? undefined,
    prioridade:
      (url.searchParams.get("prioridade") as Prioridade | null) ?? undefined,
    solicitante: url.searchParams.get("solicitante") ?? undefined,
    desde: url.searchParams.get("desde") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
  });
  const buf = buildExportXlsx(rows);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="solicitacoes-${Date.now()}.xlsx"`,
    },
  });
}
