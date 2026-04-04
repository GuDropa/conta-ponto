import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é um sistema de OCR especializado em cartões de ponto mecânicos brasileiros (modelo Evo Ponto Fácil).

Você recebe EXATAMENTE 2 imagens do MESMO cartão de ponto de UM ÚNICO funcionário:
- Imagem 1 = FRENTE do cartão
- Imagem 2 = VERSO do cartão

Sua tarefa é:
1) Ler o NOME DO COLABORADOR impresso/manuscrito no cartão (campo de identificação do funcionário).
2) Extrair TODOS os horários carimbados mecanicamente (tinta vermelha, formato HH:MM) em AMBAS as faces e CONSOLIDAR em uma única lista por dia do mês (1 a 31).

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

const MODEL_FALLBACK_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
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

    if (images.length !== 2) {
      return NextResponse.json(
        {
          error:
            "Envie exatamente 2 imagens por requisição (frente e verso do mesmo cartão).",
        },
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

    let parsed: ParsedResponse;
    try {
      parsed = extractJsonObject(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "Resposta do modelo não contém JSON válido.",
          raw: responseText,
          modelUsed,
        },
        { status: 422 },
      );
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

    return NextResponse.json({
      employeeName,
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
