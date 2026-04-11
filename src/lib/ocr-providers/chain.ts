import { createGeminiProvider } from "./gemini";
import { createAnthropicProvider } from "./anthropic";
import {
  VisionImagePart,
  VisionOcrProvider,
  shouldAdvanceToNextProvider,
  errorMessage,
} from "./types";

export function buildDefaultOcrChain(env: {
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}): VisionOcrProvider[] {
  const chain: VisionOcrProvider[] = [];

  if (env.GEMINI_API_KEY) {
    chain.push(createGeminiProvider(env.GEMINI_API_KEY));
  }

  if (env.ANTHROPIC_API_KEY) {
    chain.push(createAnthropicProvider(env.ANTHROPIC_API_KEY));
  }

  return chain;
}

export async function runVisionOcrChain(
  chain: VisionOcrProvider[],
  systemPrompt: string,
  imageParts: VisionImagePart[],
): Promise<{ text: string; modelUsed: string }> {
  if (chain.length === 0) {
    throw new Error(
      "Nenhum provedor de OCR configurado. Configure GEMINI_API_KEY ou ANTHROPIC_API_KEY.",
    );
  }

  let lastError: unknown;

  for (const provider of chain) {
    try {
      return await provider.generateText(systemPrompt, imageParts);
    } catch (err) {
      lastError = err;

      if (shouldAdvanceToNextProvider(err)) {
        console.warn(
          `[OCR chain] Provedor "${provider.name}" falhou (${errorMessage(err)}); tentando próximo.`,
        );
        continue;
      }

      // Non-recoverable error — propagate immediately
      throw err;
    }
  }

  throw new Error(
    `Todos os provedores de OCR falharam. Último erro: ${errorMessage(lastError)}`,
  );
}
