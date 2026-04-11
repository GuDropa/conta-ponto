import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  VisionImagePart,
  VisionOcrProvider,
  isRetryableError,
  sleep,
} from "./types";

const MODEL_FALLBACK_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

export function createGeminiProvider(apiKey: string): VisionOcrProvider {
  return {
    name: "gemini",

    async generateText(systemPrompt, imageParts) {
      const genAI = new GoogleGenerativeAI(apiKey);

      const gImageParts = imageParts.map((p) => ({
        inlineData: { data: p.base64, mimeType: p.mimeType },
      }));

      for (const modelName of MODEL_FALLBACK_ORDER) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
              systemPrompt,
              ...gImageParts,
            ]);
            return { text: result.response.text(), modelUsed: modelName };
          } catch (err) {
            const retryable = isRetryableError(err);

            if (retryable && attempt < MAX_RETRIES) {
              await sleep(RETRY_DELAY_MS * (attempt + 1));
              continue;
            }

            if (retryable) {
              // Exhausted retries for this model — try the next one
              break;
            }

            // Non-retryable error: propagate immediately
            throw err;
          }
        }
      }

      throw new Error(
        "Gemini: todos os modelos indisponíveis ou com quota excedida.",
      );
    },
  };
}
