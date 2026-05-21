/**
 * Airtable client tipado para Solicita Insumos.
 * Tabelas: Setores, Produtos, Usuarios, Solicitacoes, LogSolicitacoes, LogAprovacoes
 *
 * Cites: I.at.* (SPEC §I), V11/V12/V8/V17 (SPEC §V).
 */
import Airtable, { type FieldSet, type Records } from "airtable";

export type Papel = "gestor" | "lider";
export type Status =
  | "pendente"
  | "aprovada"
  | "recusada"
  | "cancelada"
  | "atendida";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";
export type AcaoLog = "criar" | "editar" | "cancelar";
export type DecisaoLog = "aprovada" | "recusada" | "atendida";

export interface Setor {
  id: string;
  nome: string;
}
export interface Produto {
  id: string;
  nome: string;
  setor: string;
  unidade_default: string;
  criado_por: string;
}
export interface Usuario {
  id: string;
  usuario: string;
  senha_hash: string;
  papel: Papel;
  setor?: string;
  ativo: boolean;
}
export interface Solicitacao {
  id: string;
  setor: string;
  solicitante: string;
  produto: string;
  qtd: number;
  unidade: string;
  prioridade: Prioridade;
  obs?: string;
  status: Status;
  criado_em: string;
  atualizado_em: string;
}
export interface LogSolicitacao {
  id: string;
  solicitacao_id: string;
  ator: string;
  acao: AcaoLog;
  payload: string;
  em: string;
}
export interface LogAprovacao {
  id: string;
  solicitacao_id: string;
  ator: string;
  decisao: DecisaoLog;
  motivo?: string;
  em: string;
}

export interface AirtableClient {
  setores: {
    list: () => Promise<Setor[]>;
  };
  produtos: {
    listBySetor: (setor: string) => Promise<Produto[]>;
    listAll: () => Promise<Produto[]>;
    create: (data: Omit<Produto, "id">) => Promise<Produto>;
  };
  usuarios: {
    findByLogin: (usuario: string) => Promise<Usuario | null>;
    list: () => Promise<Usuario[]>;
    create: (data: Omit<Usuario, "id">) => Promise<Usuario>;
    update: (id: string, data: Partial<Omit<Usuario, "id">>) => Promise<Usuario>;
  };
  solicitacoes: {
    list: (filter?: SolicitacaoFilter) => Promise<Solicitacao[]>;
    get: (id: string) => Promise<Solicitacao | null>;
    create: (
      data: Omit<Solicitacao, "id" | "criado_em" | "atualizado_em" | "status"> & {
        status?: Status;
      },
    ) => Promise<Solicitacao>;
    update: (
      id: string,
      data: Partial<Omit<Solicitacao, "id" | "criado_em" | "atualizado_em">>,
    ) => Promise<Solicitacao>;
  };
  logSolicitacoes: {
    create: (data: Omit<LogSolicitacao, "id" | "em">) => Promise<LogSolicitacao>;
    listBySolicitacao: (solicitacaoId: string) => Promise<LogSolicitacao[]>;
  };
  logAprovacoes: {
    create: (data: Omit<LogAprovacao, "id" | "em">) => Promise<LogAprovacao>;
    listBySolicitacao: (solicitacaoId: string) => Promise<LogAprovacao[]>;
  };
}

export interface SolicitacaoFilter {
  setor?: string;
  status?: Status;
  solicitante?: string;
  prioridade?: Prioridade;
  desde?: string; // ISO date
  ate?: string;
}

function escape(value: string): string {
  return value.replace(/'/g, "\\'");
}

function mapSetor(r: Records<FieldSet>[number]): Setor {
  return { id: r.id, nome: String(r.get("nome") ?? "") };
}
function mapProduto(r: Records<FieldSet>[number]): Produto {
  return {
    id: r.id,
    nome: String(r.get("nome") ?? ""),
    setor: String(r.get("setor") ?? ""),
    unidade_default: String(r.get("unidade_default") ?? ""),
    criado_por: String(r.get("criado_por") ?? ""),
  };
}
function mapUsuario(r: Records<FieldSet>[number]): Usuario {
  const papel = String(r.get("papel") ?? "lider") as Papel;
  return {
    id: r.id,
    usuario: String(r.get("usuario") ?? ""),
    senha_hash: String(r.get("senha_hash") ?? ""),
    papel,
    setor: (r.get("setor") as string | undefined) || undefined,
    ativo: Boolean(r.get("ativo")),
  };
}
function mapSolicitacao(r: Records<FieldSet>[number]): Solicitacao {
  return {
    id: r.id,
    setor: String(r.get("setor") ?? ""),
    solicitante: String(r.get("solicitante") ?? ""),
    produto: String(r.get("produto") ?? ""),
    qtd: Number(r.get("qtd") ?? 0),
    unidade: String(r.get("unidade") ?? ""),
    prioridade: (String(r.get("prioridade") ?? "media") as Prioridade),
    obs: (r.get("obs") as string | undefined) || undefined,
    status: (String(r.get("status") ?? "pendente") as Status),
    criado_em: String(r.get("criado_em") ?? ""),
    atualizado_em: String(r.get("atualizado_em") ?? ""),
  };
}
function mapLogSolic(r: Records<FieldSet>[number]): LogSolicitacao {
  return {
    id: r.id,
    solicitacao_id: String(r.get("solicitacao_id") ?? ""),
    ator: String(r.get("ator") ?? ""),
    acao: String(r.get("acao") ?? "criar") as AcaoLog,
    payload: String(r.get("payload") ?? ""),
    em: String(r.get("em") ?? ""),
  };
}
function mapLogAprov(r: Records<FieldSet>[number]): LogAprovacao {
  return {
    id: r.id,
    solicitacao_id: String(r.get("solicitacao_id") ?? ""),
    ator: String(r.get("ator") ?? ""),
    decisao: String(r.get("decisao") ?? "aprovada") as DecisaoLog,
    motivo: (r.get("motivo") as string | undefined) || undefined,
    em: String(r.get("em") ?? ""),
  };
}

export function createAirtableClient(opts?: {
  apiKey?: string;
  baseId?: string;
}): AirtableClient {
  const apiKey = opts?.apiKey ?? process.env.AIRTABLE_API_KEY;
  const baseId = opts?.baseId ?? process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error(
      "Airtable: AIRTABLE_API_KEY e AIRTABLE_BASE_ID precisam estar definidos",
    );
  }
  const base = new Airtable({ apiKey }).base(baseId);

  return {
    setores: {
      list: async () => {
        const rows = await base("Setores").select({}).all();
        return rows.map(mapSetor);
      },
    },
    produtos: {
      listBySetor: async (setor) => {
        const rows = await base("Produtos")
          .select({ filterByFormula: `{setor} = '${escape(setor)}'` })
          .all();
        return rows.map(mapProduto);
      },
      listAll: async () => {
        const rows = await base("Produtos").select({}).all();
        return rows.map(mapProduto);
      },
      create: async (data) => {
        const rec = await base("Produtos").create(data as unknown as FieldSet);
        return mapProduto(rec);
      },
    },
    usuarios: {
      findByLogin: async (usuario) => {
        const rows = await base("Usuarios")
          .select({
            maxRecords: 1,
            filterByFormula: `{usuario} = '${escape(usuario)}'`,
          })
          .all();
        return rows[0] ? mapUsuario(rows[0]) : null;
      },
      list: async () => {
        const rows = await base("Usuarios").select({}).all();
        return rows.map(mapUsuario);
      },
      create: async (data) => {
        const rec = await base("Usuarios").create(data as unknown as FieldSet);
        return mapUsuario(rec);
      },
      update: async (id, data) => {
        const rec = await base("Usuarios").update(id, data as unknown as FieldSet);
        return mapUsuario(rec);
      },
    },
    solicitacoes: {
      list: async (filter) => {
        const clauses: string[] = [];
        if (filter?.setor) clauses.push(`{setor} = '${escape(filter.setor)}'`);
        if (filter?.status) clauses.push(`{status} = '${escape(filter.status)}'`);
        if (filter?.solicitante)
          clauses.push(`{solicitante} = '${escape(filter.solicitante)}'`);
        if (filter?.prioridade)
          clauses.push(`{prioridade} = '${escape(filter.prioridade)}'`);
        if (filter?.desde)
          clauses.push(`IS_AFTER({criado_em}, '${escape(filter.desde)}')`);
        if (filter?.ate)
          clauses.push(`IS_BEFORE({criado_em}, '${escape(filter.ate)}')`);
        const select =
          clauses.length > 0
            ? { filterByFormula: `AND(${clauses.join(", ")})` }
            : {};
        const rows = await base("Solicitacoes").select(select).all();
        return rows.map(mapSolicitacao);
      },
      get: async (id) => {
        try {
          const rec = await base("Solicitacoes").find(id);
          return mapSolicitacao(rec);
        } catch {
          return null;
        }
      },
      create: async (data) => {
        const payload = { ...data, status: data.status ?? "pendente" };
        const rec = await base("Solicitacoes").create(
          payload as unknown as FieldSet,
        );
        return mapSolicitacao(rec);
      },
      update: async (id, data) => {
        const rec = await base("Solicitacoes").update(
          id,
          data as unknown as FieldSet,
        );
        return mapSolicitacao(rec);
      },
    },
    logSolicitacoes: {
      create: async (data) => {
        const rec = await base("LogSolicitacoes").create(
          data as unknown as FieldSet,
        );
        return mapLogSolic(rec);
      },
      listBySolicitacao: async (solicitacaoId) => {
        const rows = await base("LogSolicitacoes")
          .select({
            filterByFormula: `{solicitacao_id} = '${escape(solicitacaoId)}'`,
          })
          .all();
        return rows.map(mapLogSolic);
      },
    },
    logAprovacoes: {
      create: async (data) => {
        const rec = await base("LogAprovacoes").create(
          data as unknown as FieldSet,
        );
        return mapLogAprov(rec);
      },
      listBySolicitacao: async (solicitacaoId) => {
        const rows = await base("LogAprovacoes")
          .select({
            filterByFormula: `{solicitacao_id} = '${escape(solicitacaoId)}'`,
          })
          .all();
        return rows.map(mapLogAprov);
      },
    },
  };
}

let _client: AirtableClient | null = null;
export function getAirtable(): AirtableClient {
  if (!_client) _client = createAirtableClient();
  return _client;
}

// Test injection
export function __setAirtableClient(client: AirtableClient | null): void {
  _client = client;
}
