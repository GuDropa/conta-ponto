import Anthropic from "@anthropic-ai/sdk";
import {
  VisionImagePart,
  VisionOcrProvider,
  isRetryableError,
  sleep,
} from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

export function createAnthropicProvider(apiKey: string): VisionOcrProvider {
  return {
    name: "anthropic",

    async generateText(systemPrompt, imageParts) {
      const client = new Anthropic({ apiKey });

      const imageBlocks: Anthropic.ImageBlockParam[] = imageParts.map((p) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: p.mimeType as Anthropic.Base64ImageSource["media_type"],
          data: p.base64,
        },
      }));

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: [
                  ...imageBlocks,
                  {
                    type: "text",
                    text: "Processe as imagens do cartão de ponto conforme as instruções.",
                  },
                ],
              },
            ],
          });

          const block = response.content.find((b) => b.type === "text");
          const text = block?.type === "text" ? block.text : "";
          return { text, modelUsed: `anthropic:${MODEL}` };
        } catch (err) {
          if (isRetryableError(err) && attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
          throw err;
        }
      }

      throw new Error("Anthropic: modelo indisponível após retries.");
    },
  };
}
