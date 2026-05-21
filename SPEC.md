# SPEC

## §G — Goal

App = ferramentas internas supermercado. Três features:
1. **conta-ponto** — já existe. Controle de ponto de funcionários.
2. **check-gondolas** — Encarregado importa lista ERP, bipa produtos, gera relatório de presença/falta.
3. **solicita-insumos** — novo. Funcionários solicitam insumos por setor; líder edita/cancela do setor; gestor aprova/recusa, filtra, exporta. Backend Airtable.

Tela inicial: usuário escolhe qual feature usar.

---

## §C — Constraints

- Stack fixo: Next.js 16, React 19, TypeScript, Tailwind, shadcn, Zustand, xlsx.
- Roda local (desktop/tablet) — sem backend obrigatório, tudo client-side.
- Uso em loja: tela simples, botões grandes, feedback visual imediato.
- Sem autenticação para `conta-ponto` e `check-gondolas`.
- Relatório exportado como `.xlsx` (mesma lib já usada).
- Planilha ERP: formato a confirmar — colunas mínimas esperadas: `codigo_barras`, `descricao`. ?
- Bipagem em `check-gondolas` via câmera do celular: decodificação de código de barras direto no navegador (BarcodeDetector API, fallback lib JS). Requer permissão de câmera; HTTPS obrigatório fora de localhost.
- `solicita-insumos`: backend Airtable (MVP). Demais features seguem client-side.
- `solicita-insumos` auth: 3 papéis.
  - `funcionario` — login leve (nome + setor, sem senha).
  - `lider` — usuário + senha.
  - `gestor` — usuário + senha. Cadastro inicial manual no Airtable; gestor cria outros gestores e líderes.
- Sessão `solicita-insumos`: cookie httpOnly server-side.
- Hash de senha: bcrypt em route handler Next.
- Testes unitários: Vitest + React Testing Library; rodar via `npm test`.

---

## §I — Interfaces

| id | surface | descrição |
|----|---------|-----------|
| I.home | `/` (page.tsx) | tela inicial — 2 cards de navegação |
| I.cp | `/conta-ponto` | feature existente (mover de `/` para cá) |
| I.cg | `/check-gondolas` | nova feature |
| I.cg.import | componente de upload | aceita `.xlsx` / `.csv` da planilha ERP |
| I.cg.scan | componente de bipagem | preview da câmera traseira + decodificação contínua de barcode; lista itens bipados em tempo real |
| I.cg.report | componente de relatório | 2 abas: encontrados / faltantes; botão exportar `.xlsx` |
| I.store.cg | Zustand store | estado da sessão check-gondolas |
| I.si | `/solicita-insumos` | feature nova |
| I.si.login | `/solicita-insumos/login` | duas abas: funcionário (nome+setor) / gestor-líder (usuário+senha) |
| I.si.novo | `/solicita-insumos/nova` | formulário de solicitação; lista produtos do setor; add produto novo |
| I.si.minhas | `/solicita-insumos/minhas` | listagem próprias com status (funcionário/líder) |
| I.si.setor | `/solicita-insumos/setor` | listagem do setor (líder): editar/cancelar |
| I.si.admin | `/solicita-insumos/admin` | gestor: todos setores, filtros, mudar status, exportar |
| I.si.users | `/solicita-insumos/admin/usuarios` | gestor cria/edita gestores e líderes |
| I.si.api.solic | `/api/si/solicitacoes` | CRUD solicitações via Airtable |
| I.si.api.prod | `/api/si/produtos` | CRUD produtos por setor |
| I.si.api.auth | `/api/si/auth` | login/logout/me; cookie httpOnly |
| I.si.api.users | `/api/si/usuarios` | gestão de usuários (gestor only) |
| I.si.api.export | `/api/si/export` | relatório `.xlsx` filtrado |
| I.at.solicitacoes | Airtable `Solicitacoes` | id, setor, solicitante, produto, qtd, unidade, prioridade, obs, status, criado_em, atualizado_em |
| I.at.produtos | Airtable `Produtos` | id, nome, setor, unidade_default, criado_por |
| I.at.setores | Airtable `Setores` | id, nome |
| I.at.usuarios | Airtable `Usuarios` | id, usuario, senha_hash, papel (gestor/lider), setor (líder), ativo |
| I.at.log_solic | Airtable `LogSolicitacoes` | id, solicitacao_id, ator, acao (criar/editar/cancelar), payload, em |
| I.at.log_aprov | Airtable `LogAprovacoes` | id, solicitacao_id, ator, decisao, motivo, em |

---

## §V — Invariants

**V1** — Tela inicial sempre mostra os 2 módulos. Nenhum módulo some da home mesmo se vazio de dados.

**V2** — Planilha ERP deve ter coluna com código de barras. Se coluna não encontrada, bloqueia sessão e exibe erro claro.

**V3** — Mesmo código bipado duas vezes = conta como 1 item encontrado (dedup por código).

**V4** — Relatório "faltantes" = itens da lista ERP NÃO bipados. Relatório "encontrados" = bipados que ESTÃO na lista. Itens bipados fora da lista = alertados separadamente (não somem silenciosamente).

**V5** — Bipagem usa câmera traseira (`facingMode: environment`). Câmera só inicia após gesto explícito do usuário (botão "Permitir câmera"); antes disso o stream permanece desligado. Permissão negada ou indisponível → bloqueia sessão e exibe erro claro com instrução de habilitar. Câmera é liberada ao sair da etapa de scanning.

**V6** — Estado da sessão check-gondolas não persiste entre reloads (memória volátil). Usuário deve importar nova lista a cada sessão.

**V7** — Exportação `.xlsx` gera dois sheets: "Encontrados" e "Faltantes".

**V8** — Status de solicitação ∈ {pendente, aprovada, recusada, cancelada, atendida}. Default = pendente.

**V9** — Recusa sempre exige `motivo` não-vazio. Sem motivo → bloqueia transição.

**V10** — Funcionário só vê/edita produtos e solicitações do próprio setor. Líder idem (todas do setor). Gestor vê todos.

**V11** — Toda criação/edição/cancelamento de solicitação grava em `LogSolicitacoes`. Toda mudança de status grava em `LogAprovacoes` com ator e (se recusa) motivo.

**V12** — Senhas em `Usuarios` armazenadas como hash bcrypt. Nunca em texto claro. Login compara hash server-side.

**V13** — Só gestor cria/edita usuários (gestor ou líder). Líder não cria usuários.

**V14** — Funcionário (sessão leve) não acessa `/setor`, `/admin`, `/admin/usuarios`. Middleware bloqueia por papel.

**V15** — Edição de solicitação só se status = pendente. Após aprovada/recusada/atendida = imutável; só cancelamento permitido (por líder/gestor) → vira `cancelada`, log.

**V16** — Produto novo criado por funcionário entra direto na lista do setor (sem moderação) com flag `criado_por`.

**V17** — Solicitação tem campo `prioridade` ∈ {baixa, media, alta, urgente}. Obrigatório no form.

**V18** — Sessão de `solicita-insumos` via cookie httpOnly server-side. Nunca expõe senha/hash no client.

**V19** — Toda invariante de lógica crítica (V2, V3, V4, V8, V9, V10, V11, V12, V15, V17) tem cobertura por teste unitário. PR que toca essas regras sem teste = bloqueado.

**V20** — Toda leitura bem-sucedida emite feedback imediato (visual + som/vibração quando suportado). Mesmo código lido em sequência dentro de janela curta (≤1s) = ignorado (debounce além do dedup de V3).

---

## §T — Tasks

| id | status | descrição | cites |
|----|--------|-----------|-------|
| T1 | x | criar tela inicial `/` com 2 cards: conta-ponto e check-gondolas | I.home, V1 |
| T2 | x | mover feature conta-ponto para rota `/conta-ponto` | I.cp |
| T3 | x | criar rota `/check-gondolas` com layout base | I.cg |
| T4 | x | componente de import de planilha ERP (xlsx/csv); parse colunas; validação de coluna barcode | I.cg.import, V2 |
| T5 | x | Zustand store para sessão check-gondolas: lista ERP, set de bipados, status | I.store.cg, V3, V6 |
| T6 | x | componente de bipagem: input oculto + foco automático + dedup + feedback visual por item | I.cg.scan, V3, V5 |
| T7 | x | componente de relatório: contadores em tempo real (encontrados/faltantes/fora-lista) | I.cg.report, V4 |
| T8 | x | exportação `.xlsx` dois sheets (Encontrados, Faltantes) | I.cg.report, V7 |
| T9 | x | alerta visual para itens bipados fora da lista ERP | I.cg.scan, V4 |
| T10 | x | responsividade tablet (uso em loja) | I.home, I.cg |
| T11 | x | revisão mobile-first: touch targets ≥44px, sem hover como único feedback, inputMode=none no scanner, layout single-column em todos os breakpoints | I.home, I.cg, I.cg.import, I.cg.scan, I.cg.report, I.cp |
| T12 | x | card `solicita-insumos` na home `/` | I.home, V1 |
| T13 | x | configurar Airtable: tables Setores, Produtos, Usuarios, Solicitacoes, LogSolicitacoes, LogAprovacoes + envs AIRTABLE_BASE_ID / AIRTABLE_API_KEY | I.at.solicitacoes, I.at.produtos, I.at.setores, I.at.usuarios, I.at.log_solic, I.at.log_aprov |
| T14 | x | cliente Airtable interno `lib/airtable.ts` com helpers tipados por table | I.at.solicitacoes, I.at.produtos, I.at.setores, I.at.usuarios, I.at.log_solic, I.at.log_aprov |
| T15 | x | `/api/si/auth`: login funcionário (nome+setor) e gestor/líder (bcrypt); logout; me; cookie httpOnly | I.si.api.auth, V12, V18 |
| T16 | x | middleware Next bloqueia rotas `/solicita-insumos/*` por papel | V10, V13, V14 |
| T17 | x | `/solicita-insumos/login` duas abas (funcionário / gestor-líder) | I.si.login |
| T18 | x | `/api/si/produtos` GET por setor + POST criar (sem moderação) | I.si.api.prod, V10, V16 |
| T19 | x | `/api/si/solicitacoes` CRUD + grava `LogSolicitacoes` em toda mutação; bloqueia edição se status ≠ pendente | I.si.api.solic, V11, V15, V17 |
| T20 | x | endpoint mudança de status + grava `LogAprovacoes`; motivo obrigatório se recusa | I.si.api.solic, V8, V9, V11 |
| T21 | x | tela `/solicita-insumos/nova`: lista produtos setor + form (qtd, unidade, prioridade, obs) + add produto novo | I.si.novo, V16, V17 |
| T22 | x | tela `/solicita-insumos/minhas`: listagem própria com status | I.si.minhas, V10 |
| T23 | x | tela `/solicita-insumos/setor` (líder): listar + editar + cancelar | I.si.setor, V10, V15 |
| T24 | x | tela `/solicita-insumos/admin`: tabela todos setores + filtros (setor/status/data/solicitante/prioridade) + ação mudar status (modal motivo se recusa) | I.si.admin, V9, V10, V17 |
| T25 | x | `/api/si/export` xlsx solicitações filtradas | I.si.api.export |
| T26 | x | `/solicita-insumos/admin/usuarios`: gestor cria/edita/inativa gestores e líderes (bcrypt no POST) | I.si.users, I.si.api.users, V12, V13 |
| T27 | x | doc: seed manual no Airtable (setores iniciais + 1 gestor) no README da feature | I.at.setores, I.at.usuarios |
| T28 | x | setup Vitest + RTL + jsdom; script `npm test`; mock helper para `lib/airtable.ts` | C, V19 |
| T29 | x | unit: parser planilha ERP (colunas válidas / coluna barcode ausente / linhas vazias) | T4, V2 |
| T30 | x | unit: store check-gondolas — dedup de bipados + classificação encontrado/faltante/fora-lista | T5, T6, T7, V3, V4 |
| T31 | x | unit: hash/verify bcrypt + login (funcionário leve x gestor/líder com senha) + emissão de cookie httpOnly | T15, V12, V18 |
| T32 | x | unit: middleware de papel — funcionário bloqueado em /setor /admin; líder bloqueado em /admin/usuarios; gestor passa | T16, V10, V13, V14 |
| T33 | x | unit: transições de status (pendente→aprovada/recusada/cancelada/atendida); recusa sem motivo falha; edição com status≠pendente falha | T19, T20, V8, V9, V15 |
| T34 | x | unit: scoping por setor — funcionário/líder não enxerga solicitações/produtos fora do setor; gestor enxerga tudo | T18, T19, T22, T23, V10 |
| T35 | x | unit: logs — toda mutação grava em LogSolicitacoes; toda decisão grava em LogAprovacoes com ator e motivo (se recusa) | T19, T20, V11 |
| T36 | x | unit: validação de form — prioridade obrigatória ∈ {baixa,media,alta,urgente} | T21, V17 |
| T37 | x | unit: exportação `.xlsx` filtrada (mock xlsx) gera linhas corretas conforme filtros | T25, I.si.api.export |
| T38 | x | substituir bipagem HID por scanner via câmera no `GondolaScanner`: BarcodeDetector API com fallback (ex.: zxing-js/browser); permissão + erro; dedup + debounce; feedback visual/sonoro; release do stream ao trocar de etapa | I.cg.scan, V3, V5, V20 |
| T39 | . | unit: scanner câmera — permissão negada bloqueia; debounce ≤1s; dedup mantido | T38, V5, V20 |
| T40 | x | gate de consentimento explícito antes de getUserMedia no `GondolaScanner` (botão "Permitir câmera" como gesto disparador) | I.cg.scan, V5 |

---

## §B — Bug log

| id | date | cause | fix |
|----|------|-------|-----|
