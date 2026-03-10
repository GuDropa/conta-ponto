import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é um sistema de OCR especializado em cartões de ponto mecânicos brasileiros (modelo Evo Ponto Fácil).

O cartão possui uma tabela com dias (1 a 31) e colunas de horários:
- Manhã: Entrada, Saída
- Tarde: Entrada, Saída
- Extra: Entrada, Saída

Os horários são carimbados mecanicamente em vermelho no formato HH:MM.

Analise a imagem do cartão e extraia TODOS os horários visíveis para cada dia.

REGRAS IMPORTANTES:
- Retorne SOMENTE um array JSON válido, sem markdown, sem explicações.
- Cada item: { "day": número, "entry1": "HH:MM", "exit1": "HH:MM", "entry2": "HH:MM", "exit2": "HH:MM", "extraEntry": "HH:MM", "extraExit": "HH:MM" }
- Use string vazia "" para campos sem carimbo visível.
- Se não houver nenhum horário visível, retorne [].
- Inclua APENAS dias que tenham pelo menos um horário carimbado.
- Os horários devem estar no formato HH:MM (24h).
- Preste atenção especial aos dígitos dos carimbos mecânicos que podem estar borrados.`;

const MODEL_FALLBACK_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeminiImagePart = {
  inlineData: { data: string; mimeType: string };
};

type ParsedRow = {
  day: number;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  extraEntry?: string;
  extraExit?: string;
};

async function tryGenerateContent(
  genAI: GoogleGenerativeAI,
  modelName: string,
  imageParts: GeminiImagePart[],
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent([SYSTEM_PROMPT, ...imageParts]);
  return result.response.text();
}

async function callWithFallback(
  genAI: GoogleGenerativeAI,
  imageParts: GeminiImagePart[],
): Promise<{ text: string; modelUsed: string }> {
  for (const modelName of MODEL_FALLBACK_ORDER) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const text = await tryGenerateContent(genAI, modelName, imageParts);
        return { text, modelUsed: modelName };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        const isRateLimit = message.includes("429") || message.includes("quota");
        const isNetworkError =
          message.includes("fetch failed") ||
          message.includes("ECONNRESET") ||
          message.includes("ETIMEDOUT") ||
          message.includes("network");

        if ((isRateLimit || isNetworkError) && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        if (isRateLimit) {
          break;
        }

        throw error;
      }
    }
  }

  throw new Error(
    "Quota excedida em todos os modelos disponíveis. Aguarde alguns minutos e tente novamente.",
  );
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
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

    const genAI = new GoogleGenerativeAI(apiKey);

    const imageParts: GeminiImagePart[] = await Promise.all(
      images.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          inlineData: {
            data: base64,
            mimeType: file.type || "image/jpeg",
          },
        };
      }),
    );

    const { text: responseText, modelUsed } = await callWithFallback(
      genAI,
      imageParts,
    );

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        {
          error: "Resposta do modelo não contém JSON válido.",
          raw: responseText,
          modelUsed,
        },
        { status: 422 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedRow[];

    const detections = parsed.map((item) => ({
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

    return NextResponse.json({
      detections,
      raw: responseText,
      modelUsed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
