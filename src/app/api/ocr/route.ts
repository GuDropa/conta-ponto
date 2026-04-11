import { NextRequest, NextResponse } from "next/server";
import { buildDefaultOcrChain, runVisionOcrChain } from "@/lib/ocr-providers/chain";
import type { VisionImagePart } from "@/lib/ocr-providers/types";

/** Lotes grandes podem exceder o default em deploy (ex.: Vercel). */
export const maxDuration = 300;

const SYSTEM_PROMPT = `Você é um sistema de OCR especializado em cartões de ponto mecânicos brasileiros (modelo Evo Ponto Fácil).

Você recebe EXATAMENTE 2 imagens do MESMO cartão de ponto de UM ÚNICO funcionário:
- Imagem 1 = FRENTE do cartão
- Imagem 2 = VERSO do cartão

Sua tarefa é:
1) Ler o NOME DO COLABORADOR impresso/manuscrito no cartão (campo de identificação do funcionário).
2) Extrair TODOS os horários carimbados mecanicamente (tinta vermelha, formato HH:MM) em AMBAS as faces e CONSOLIDAR em uma única lista por dia do mês (1 a 31).

No JSON, o campo "day" de cada item em "days" deve ser sempre o número do dia do mês (1 a 31) tal como aparece na numeração da linha do cartão (primeira coluna da tabela), para conferência no RH — não use outro critério para "day".

Estrutura típica da tabela:
- Manhã: Entrada, Saída
- Tarde: Entrada, Saída
- Extra: Entrada, Saída

Se o mesmo dia aparecer parcialmente na frente e no verso, una os dados num único registro para aquele dia.
Use os campos entry1/exit1 para o período da manhã, entry2/exit2 para a tarde (período após o intervalo), e extraEntry/extraExit para horas extras.

REGRAS DE SAÍDA (obrigatório):
- Retorne SOMENTE um único objeto JSON válido, sem markdown, sem texto antes ou depois.
- Formato exato:
{
  "employeeName": "nome completo como no cartão ou string vazia se ilegível",
  "days": [
    {
      "day": 1,
      "entry1": "HH:MM",
      "exit1": "HH:MM",
      "entry2": "HH:MM",
      "exit2": "HH:MM",
      "extraEntry": "HH:MM",
      "extraExit": "HH:MM"
    }
  ]
}
- Use string vazia "" para campos sem carimbo visível.
- Inclua em "days" APENAS dias que tenham pelo menos um horário carimbado (após consolidar frente e verso).
- Horários no formato HH:MM (24h).
- Se não houver nenhum horário legível, use "days": [].
- Atenção a dígitos borrados nos carimbos mecânicos.`;

type ParsedRow = {
  day: number;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  extraEntry?: string;
  extraExit?: string;
};

type ParsedResponse = {
  employeeName?: string;
  days?: ParsedRow[];
};

function extractJsonObject(text: string): ParsedResponse {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("Resposta não contém objeto JSON.");
  }

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        return JSON.parse(slice) as ParsedResponse;
      }
    }
  }

  throw new Error("JSON incompleto na resposta.");
}

async function filesToImageParts(files: File[]): Promise<VisionImagePart[]> {
  return Promise.all(
    files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return { base64, mimeType: file.type || "image/jpeg" };
    }),
  );
}

type OcrPairSuccessBody = {
  employeeName: string;
  detections: Array<{
    day: number;
    values: Record<string, string>;
  }>;
  raw: string;
  modelUsed: string;
};

async function runOcrOnPair(
  pair: [File, File],
): Promise<OcrPairSuccessBody> {
  const chain = buildDefaultOcrChain({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });

  const imageParts = await filesToImageParts([pair[0], pair[1]]);
  const { text: responseText, modelUsed } = await runVisionOcrChain(
    chain,
    SYSTEM_PROMPT,
    imageParts,
  );

  let parsed: ParsedResponse;
  try {
    parsed = extractJsonObject(responseText);
  } catch {
    throw new Error("Resposta do modelo não contém JSON válido.");
  }

  const days = Array.isArray(parsed.days) ? parsed.days : [];
  const employeeName =
    typeof parsed.employeeName === "string" ? parsed.employeeName : "";

  const detections = days.map((item) => ({
    day: item.day,
    values: {
      ...(item.entry1 ? { entry1: item.entry1 } : {}),
      ...(item.exit1 ? { exit1: item.exit1 } : {}),
      ...(item.entry2 ? { entry2: item.entry2 } : {}),
      ...(item.exit2 ? { exit2: item.exit2 } : {}),
      ...(item.extraEntry ? { extraEntry: item.extraEntry } : {}),
      ...(item.extraExit ? { extraExit: item.extraExit } : {}),
    },
  }));

  return { employeeName, detections, raw: responseText, modelUsed };
}

function chunkIntoPairs(files: File[]): [File, File][] {
  const pairs: [File, File][] = [];
  for (let i = 0; i + 1 < files.length; i += 2) {
    pairs.push([files[i], files[i + 1]]);
  }
  return pairs;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Nenhuma chave de API configurada. Configure GEMINI_API_KEY ou ANTHROPIC_API_KEY.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const images = formData.getAll("images") as File[];

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem enviada." },
        { status: 400 },
      );
    }

    if (images.length % 2 !== 0) {
      return NextResponse.json(
        {
          error:
            "Quantidade par de imagens: cada funcionário precisa de frente e verso (2 fotos).",
        },
        { status: 400 },
      );
    }

    if (images.length === 2) {
      try {
        const body = await runOcrOnPair([images[0], images[1]]);
        return NextResponse.json(body);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro desconhecido";
        if (message.includes("JSON")) {
          return NextResponse.json(
            { error: message, raw: "", modelUsed: "" },
            { status: 422 },
          );
        }
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const pairs = chunkIntoPairs(images);

    // Uma instância da cadeia por par para manter concorrência real no event loop.
    const pairResults = await Promise.all(
      pairs.map(async (pair, pairIndex) => {
        try {
          const r = await runOcrOnPair(pair);
          return {
            pairIndex,
            employeeName: r.employeeName,
            detections: r.detections,
            raw: r.raw,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erro desconhecido";
          return {
            pairIndex,
            employeeName: `Par ${pairIndex + 1}`,
            detections: [] as OcrPairSuccessBody["detections"],
            raw: "",
            error: message,
          };
        }
      }),
    );

    pairResults.sort((a, b) => a.pairIndex - b.pairIndex);

    return NextResponse.json({
      batch: true as const,
      pairs: pairResults,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
