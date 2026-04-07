# Conta Ponto — Supermercado Unimax

Sistema mobile-first para registro e controle de ponto dos colaboradores do Supermercado Unimax (Guarapuava — PR).

O app permite fotografar o cartao de ponto mecanico, extrair os horarios automaticamente via OCR e gerar um relatorio oficial de horas trabalhadas no mes.

## Documentação (apresentação para RH e liderança)

Veja a documentação completa em `docs/DOCUMENTACAO.md`.

## Funcionalidades

### Leitura de cartao de ponto (OCR)

- Tire uma foto do cartao de ponto diretamente pelo celular ou carregue imagens da galeria
- O sistema envia as imagens para o **Gemini Vision** (Google AI), que identifica os horarios carimbados mecanicamente
- Suporte a todas as 6 colunas do cartao: Entrada/Saida Manha, Entrada/Saida Tarde e Entrada/Saida Extra
- Os horarios detectados sao preenchidos automaticamente na tabela

### Controle de horas

- Tabela mensal com os 31 dias mostrando as horas trabalhadas por dia (formato HH:MM)
- Total mensal acumulado em destaque
- Dados persistidos no navegador via LocalStorage (nao perde ao fechar o app)
- Botao para limpar todas as horas registradas

### Emissao de relatorio

- Formulario para informar nome do colaborador, mes e ano
- Gera um documento visual com a identidade do Unimax contendo:
  - Total de horas e dias trabalhados
  - Detalhamento diario
  - Data/hora de emissao
  - Espaco para assinatura
- **Compartilhar** — envia a imagem do relatorio diretamente por WhatsApp, email, etc. (via Web Share API)
- **Salvar imagem** — baixa o relatorio como PNG em alta resolucao

## Tecnologias

| Camada       | Tecnologia                          |
| ------------ | ----------------------------------- |
| Framework    | Next.js 16 (App Router)             |
| UI           | React 19, Tailwind CSS 4, shadcn v4 |
| OCR          | Google Gemini Vision API             |
| Imagem       | html-to-image                        |
| Fonte        | Montserrat (Google Fonts)            |
| Deploy       | Vercel                               |

## Como rodar localmente

### Pre-requisitos

- Node.js 18+
- Chave da API do Google Gemini ([obter aqui](https://aistudio.google.com/apikey))

### Instalacao

```bash
git clone <url-do-repositorio>
cd conta-ponto
npm install
```

### Configuracao

Crie um arquivo `.env.local` na raiz do projeto:

```
GEMINI_API_KEY=sua_chave_aqui
```

### Execucao

```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador (de preferencia no celular ou no modo responsivo do DevTools).

## Deploy na Vercel

1. Suba o repositorio no GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Em **Settings > Environment Variables**, adicione:
   - `GEMINI_API_KEY` com o valor da sua chave
4. Deploy automatico a cada push

A chave da API roda apenas no servidor (API Route) e nunca e exposta ao navegador.

## Estrutura do projeto

```
src/
├── app/
│   ├── api/ocr/         # API Route que chama o Gemini Vision
│   ├── relatorio/       # Pagina de emissao de relatorio
│   ├── layout.tsx       # Layout raiz (Montserrat, viewport mobile)
│   ├── page.tsx         # Pagina principal
│   └── globals.css      # Paleta de cores Unimax (#f58634, #233a95)
├── components/
│   ├── camera/          # Captura de foto e upload de imagens
│   ├── report/          # Relatorio oficial de horas
│   ├── timecard/        # Tabela de horas e workspace principal
│   └── ui/              # Componentes base (shadcn)
├── lib/
│   ├── gemini-ocr-client.ts   # Cliente que envia imagens para /api/ocr
│   ├── ocr-timecard-parser.ts # Parser de palavras OCR para horarios
│   ├── time-utils.ts          # Calculos de horas (HH:MM, diferencas)
│   └── timecard-defaults.ts   # Chave do LocalStorage e dados padrao
└── types/
    └── timecard.ts      # Tipos (TimecardRow, WorkedTimeSummary)
```
