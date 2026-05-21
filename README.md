# Conta Ponto — Supermercado Unimax

Sistema **mobile-first** (com layout também pensado para desktop) para registro e conferência de ponto dos colaboradores do Supermercado Unimax (Guarapuava — PR).

O fluxo principal usa **duas fotos por colaborador** (frente e verso do cartão de ponto mecânico), **OCR com IA no servidor** (Gemini Vision; cadeia opcional com **Anthropic** se configurada), gera **CSV e planilha Excel (.xlsx)** para o RH e mantém **histórico local** para baixar de novo sem reprocessar. A página **Relatório** concentra a emissão do documento visual de horas (imagem) e exportação em **PNG**, **.xlsx** e compartilhamento.

## Documentação (apresentação para RH e liderança)

Documentação completa do processo, limites e manual do RH: `docs/DOCUMENTACAO.md`.

Contexto de desenvolvimento (mapa do repositório, visão geral): `.context/docs/project-overview.md` e `.context/docs/README.md`.

## Funcionalidades

### Leitura de cartão de ponto (OCR)

- **Par frente + verso**: o envio considera pares consecutivos de imagens (1–2, 3–4, …) por colaborador; fotos ímpar sem par são mantidas como aviso até fechar o par
- **Câmera ou galeria** no celular; processamento no servidor via **`POST /api/ocr`**
- **Provedor principal**: **Google Gemini Vision**; se existir `ANTHROPIC_API_KEY`, a cadeia pode usar **Anthropic** como reforço (ver `.env` abaixo)
- **Intervalo de dias (1–31)**: filtra o que entra no CSV/planilha, sem alterar a leitura feita pela IA; preferência salva no aparelho
- **Lote**: vários colaboradores em sequência, com processamento **paralelo** no servidor e resiliência (falha em um par não bloqueia os demais; mensagens de erro no export)
- **Barra de progresso e avisos** durante o processamento
- Rascunho de fotos pendentes em **IndexedDB** para reduzir perda ao recarregar

### Histórico de exportações (RH)

- Armazenamento local dos relatórios gerados
- Re-download de **CSV**, ajuste do intervalo de dias por leitura, exclusão e limpeza do histórico

### Página Relatório (`/relatorio`)

- Formulário com nome, mês e ano; totais e detalhamento diário
- **Compartilhar** imagem (Web Share API), **salvar PNG** em alta resolução, **exportar .xlsx** (abre nativamente no Excel)
- Tema claro/escuro (`next-themes`); aviso ao sair com dados não salvos quando aplicável

### Controle de horas (fluxo clássico na grade)

- Tabela mensal (até 31 dias), totais e persistência no **navegador (localStorage)**
- Botão para limpar horas registradas

## Tecnologias

| Camada    | Tecnologia |
| --------- | ---------- |
| Framework | Next.js 16 (App Router), React 19 |
| UI        | Tailwind CSS 4, shadcn v4, @base-ui/react, Lucide |
| Estado / tema | Zustand, next-themes |
| OCR (servidor) | @google/generative-ai; opcional @anthropic-ai/sdk |
| Planilhas | xlsx (export .xlsx) |
| Relatório visual | html-to-image (PNG) |
| Outras   | tesseract.js (caminho alternativo/template no projeto) |
| Fonte    | Montserrat (Google Fonts) |
| Deploy   | Vercel (rota OCR com `maxDuration` ampliado para lotes) |

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Chave **Gemini** ([Google AI Studio](https://aistudio.google.com/apikey)) — **obrigatória** a menos que use só Anthropic em cenários avançados; o código exige **pelo menos uma** das duas chaves

### Instalação

```bash
git clone <url-do-repositorio>
cd conta-ponto
npm install
```

### Configuração

Crie `.env.local` na raiz:

```env
GEMINI_API_KEY=sua_chave_gemini
# Opcional — habilita provedor/cadeia Anthropic no servidor
# ANTHROPIC_API_KEY=sua_chave_anthropic
```

### Execução

```bash
npm run dev
```

Acesse `http://localhost:3000` — no fluxo de piso, prefira **celular** ou modo responsivo do DevTools; a home também se adapta a telas largas.

## Deploy na Vercel

1. Suba o repositório no GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Em **Settings > Environment Variables**, defina `GEMINI_API_KEY` e, se for o caso, `ANTHROPIC_API_KEY`
4. Deploy automático a cada push

As chaves rodam **apenas no servidor** (API Route) e não são expostas ao navegador.

## Estrutura do projeto (resumo)

```
src/
├── app/
│   ├── api/ocr/           # Rota POST multipart — OCR em cadeia (Gemini / Anthropic)
│   ├── relatorio/         # Relatório visual + PNG + xlsx
│   ├── layout.tsx, page.tsx, globals.css, manifest.ts
├── components/
│   ├── camera/            # Captura, galeria, pré-visualização de pares
│   ├── history/           # Painel de histórico de CSV
│   ├── report/            # hours-report (PNG + xlsx)
│   ├── timecard/          # Grade, workspace, importação em lote
│   ├── providers/         # Tema
│   └── ui/                # shadcn / base
├── hooks/                 # Ex.: aviso beforeunload
├── lib/
│   ├── ocr-providers/     # gemini, anthropic, chain, types
│   ├── gemini-ocr-client.ts, ocr-timecard-parser.ts, timecard-template-ocr.ts
│   ├── hr-batch-report.ts, hr-report-xlsx.ts
│   ├── csv-history-storage.ts, camera-draft-idb.ts, reading-period-map.ts
│   ├── time-utils.ts, timecard-defaults.ts, utils.ts
└── types/
    └── timecard.ts
```
