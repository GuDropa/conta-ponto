# Melhorias futuras — OCR em lote (Gemini / cadeia)

Notas para evolução do backend e da robustez do processamento. **Nem tudo** abaixo está “pendente” de feature — parte documenta o estado atual. O front mostra **progresso informativo** no lote (fases e estimativa; ver `camera-capture.tsx`), não streaming por par.

**Hoje (resumo):** rota `POST /api/ocr` usa **`runVisionOcrChain`** (Gemini com fallback de modelos; em seguida **Anthropic** se `ANTHROPIC_API_KEY` existir e o erro permitir pular de provedor). A **exportação principal** do RH no browser é **`.xlsx`**, não CSV.

## 1. `Promise.all` vs `Promise.allSettled`

**Contexto:** Em `src/app/api/ocr/route.ts`, o lote usa `Promise.all` sobre os pares. Cada par está em `try/catch` e, em erro, devolve um objeto com `error` em vez de rejeitar a promessa — na prática, um par com falha não cancela os demais.

**Por que considerar `Promise.allSettled`:**

- Deixa explícito que o objetivo é “esperar todos os resultados, com sucesso ou falha”.
- Reduz o risco de um refactor futuro remover o `try/catch` e voltar o comportamento clássico do `Promise.all` (uma rejeição derruba tudo).

**Referência:** `pairs.map` em `POST` de `src/app/api/ocr/route.ts`.

## 2. Controle de concorrência (throttling)

**Contexto:** Hoje as chamadas de **visão** por par do lote são disparadas em paralelo no executor do par (cada par usa a cadeia de provedores). Em lotes grandes isso ainda pode gerar picos de requisições e aumentar a chance de 429 / stress na API.

**Sugestão:** Limitar concorrência (ex.: 10 pares ao mesmo tempo) com algo como `p-limit` no Node:

```ts
import pLimit from "p-limit";

const limit = pLimit(10);
const pairResults = await Promise.all(
  pairs.map((pair, pairIndex) =>
    limit(async () => {
      // runOcrOnPair + tratamento de erro por par
    }),
  ),
);
```

(Adaptar para `Promise.allSettled` se adotarem o item 1.)

**Dependência:** `p-limit` não está hoje em `dependencies` do projeto; só pode aparecer como transitiva no lockfile.

**Impacto no tempo:** Com limite de concorrência, o tempo total do lote pode subir em relação ao “tudo paralelo”, mas tende a ficar mais estável. A rota já usa `maxDuration = 300` (segundos).

## 3. Contador de progresso “real” no front

**Contexto:** O fluxo atual é **uma** requisição HTTP com todas as imagens; o servidor não envia eventos intermediários.

**Para um `[x/y]` fiel ao número de cartões já processados** seria necessário, por exemplo:

- dividir o lote em várias requisições menores e atualizar o UI a cada resposta, ou
- expor progresso via SSE / WebSocket / polling a partir da rota de OCR.

Isso é independente das melhorias 1 e 2 acima.

## 4. Comentário em `gemini-ocr-client.ts`

O nome `recognizeTimecardBatchWithGemini` e comentários próximos podem lembrar só **Gemini**; o **servidor** hoje orquestra **cadeia** (Gemini + optional Anthropic). Se renomear ou documentar, alinhar texto/JSDoc para “batch OCR / HR report”, não “só Gemini”.
