/** T35, T36 — V11, V17, V9, V15. Service (logs + validações). */
import { describe, expect, it, vi } from "vitest";
import type {
  AirtableClient,
  LogAprovacao,
  LogSolicitacao,
  Solicitacao,
} from "./airtable";
import type { SessionPayload } from "./session";
import {
  changeStatus,
  createSolicitacao,
  editSolicitacao,
  validatePrioridade,
} from "./service";

function makeMockAirtable(initial?: Partial<Solicitacao> | "empty"): {
  at: AirtableClient;
  logSolic: LogSolicitacao[];
  logAprov: LogAprovacao[];
  store: Map<string, Solicitacao>;
} {
  const store = new Map<string, Solicitacao>();
  if (initial !== "empty") {
    const s: Solicitacao = {
      id: "s1",
      setor: "padaria",
      solicitante: "João",
      produto: "farinha",
      qtd: 10,
      unidade: "kg",
      prioridade: "media",
      obs: "",
      status: "pendente",
      criado_em: "2026-01-01",
      atualizado_em: "2026-01-01",
      ...(typeof initial === "object" ? initial : {}),
    };
    store.set(s.id, s);
  }
  const logSolic: LogSolicitacao[] = [];
  const logAprov: LogAprovacao[] = [];
  const at: AirtableClient = {
    setores: { list: vi.fn() },
    produtos: { listBySetor: vi.fn(), listAll: vi.fn(), create: vi.fn() },
    usuarios: {
      findByLogin: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    solicitacoes: {
      list: vi.fn(),
      get: vi.fn(async (id) => store.get(id) ?? null),
      create: vi.fn(async (data) => {
        const s: Solicitacao = {
          id: `s${store.size + 1}`,
          ...data,
          status: data.status ?? "pendente",
          obs: data.obs ?? "",
          criado_em: "now",
          atualizado_em: "now",
        };
        store.set(s.id, s);
        return s;
      }),
      update: vi.fn(async (id, patch) => {
        const cur = store.get(id);
        if (!cur) throw new Error("nf");
        const upd = { ...cur, ...patch, atualizado_em: "later" } as Solicitacao;
        store.set(id, upd);
        return upd;
      }),
    },
    logSolicitacoes: {
      create: vi.fn(async (d) => {
        const e: LogSolicitacao = { id: `l${logSolic.length + 1}`, ...d, em: "now" };
        logSolic.push(e);
        return e;
      }),
      listBySolicitacao: vi.fn(),
    },
    logAprovacoes: {
      create: vi.fn(async (d) => {
        const e: LogAprovacao = { id: `a${logAprov.length + 1}`, ...d, em: "now" };
        logAprov.push(e);
        return e;
      }),
      listBySolicitacao: vi.fn(),
    },
  };
  return { at, logSolic, logAprov, store };
}

const funcSession: SessionPayload = {
  papel: "funcionario",
  nome: "João",
  setor: "padaria",
  iat: 1,
};
const gestorSession: SessionPayload = { papel: "gestor", nome: "g", iat: 1 };
const liderSession: SessionPayload = {
  papel: "lider",
  nome: "ana",
  setor: "padaria",
  iat: 1,
};

describe("createSolicitacao — V11 log", () => {
  it("grava em LogSolicitacoes acao=criar", async () => {
    const m = makeMockAirtable("empty");
    const result = await createSolicitacao(m.at, funcSession, {
      produto: "farinha",
      qtd: 5,
      unidade: "kg",
      prioridade: "media",
      setor: "padaria",
    });
    expect(result.ok).toBe(true);
    expect(m.logSolic).toHaveLength(1);
    expect(m.logSolic[0].acao).toBe("criar");
    expect(m.logSolic[0].ator).toBe("João");
  });
});

describe("editSolicitacao — V11 + V15", () => {
  it("bloqueia edição se status≠pendente", async () => {
    const m = makeMockAirtable({ status: "aprovada" });
    const result = await editSolicitacao(m.at, liderSession, "s1", { qtd: 99 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/bloqueada/);
    expect(m.logSolic).toHaveLength(0);
  });
  it("permite edição em pendente e grava log", async () => {
    const m = makeMockAirtable({ status: "pendente" });
    const result = await editSolicitacao(m.at, liderSession, "s1", { qtd: 99 });
    expect(result.ok).toBe(true);
    expect(m.logSolic[0].acao).toBe("editar");
  });
});

describe("changeStatus — V11 + V9", () => {
  it("aprovar grava LogAprovacoes com decisao=aprovada", async () => {
    const m = makeMockAirtable();
    const r = await changeStatus(m.at, gestorSession, "s1", "aprovada");
    expect(r.ok).toBe(true);
    expect(m.logAprov).toHaveLength(1);
    expect(m.logAprov[0].decisao).toBe("aprovada");
    expect(m.logAprov[0].ator).toBe("g");
    expect(m.logAprov[0].motivo).toBeUndefined();
  });

  it("recusar sem motivo falha (V9); com motivo grava motivo no log", async () => {
    const m = makeMockAirtable();
    const semMotivo = await changeStatus(m.at, gestorSession, "s1", "recusada");
    expect(semMotivo.ok).toBe(false);
    expect(m.logAprov).toHaveLength(0);
    const comMotivo = await changeStatus(
      m.at,
      gestorSession,
      "s1",
      "recusada",
      "sem estoque",
    );
    expect(comMotivo.ok).toBe(true);
    expect(m.logAprov[0].decisao).toBe("recusada");
    expect(m.logAprov[0].motivo).toBe("sem estoque");
  });

  it("cancelar grava em LogSolicitacoes (acao=cancelar), não em LogAprovacoes", async () => {
    const m = makeMockAirtable();
    const r = await changeStatus(m.at, liderSession, "s1", "cancelada");
    expect(r.ok).toBe(true);
    expect(m.logSolic.some((l) => l.acao === "cancelar")).toBe(true);
    expect(m.logAprov).toHaveLength(0);
  });
});

describe("validatePrioridade (V17)", () => {
  it("aceita os 4 valores válidos", () => {
    expect(validatePrioridade("baixa")).toBe(true);
    expect(validatePrioridade("media")).toBe(true);
    expect(validatePrioridade("alta")).toBe(true);
    expect(validatePrioridade("urgente")).toBe(true);
  });
  it("rejeita outros valores", () => {
    expect(validatePrioridade("")).toBe(false);
    expect(validatePrioridade(undefined)).toBe(false);
    expect(validatePrioridade("baixinha")).toBe(false);
    expect(validatePrioridade(1)).toBe(false);
  });
});
