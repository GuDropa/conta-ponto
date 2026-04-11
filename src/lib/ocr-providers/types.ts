export type VisionImagePart = {
  base64: string;
  mimeType: string;
};

export interface VisionOcrProvider {
  /** Human-readable name, used in logs and `modelUsed` field. */
  name: string;
  generateText(
    systemPrompt: string,
    imageParts: VisionImagePart[],
  ): Promise<{ text: string; modelUsed: string }>;
}

/** Errors that warrant a retry within the same provider. */
export function isRetryableError(err: unknown): boolean {
  const msg = errorMessage(err);
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("503") ||
    msg.includes("529") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("overloaded") ||
    msg.includes("overload") ||
    msg.includes("capacity") ||
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("network")
  );
}

/**
 * Errors that should cause the chain to advance to the next provider.
 * Excludes "definitive" client errors (4xx except 429) that won't succeed
 * elsewhere either.
 */
export function shouldAdvanceToNextProvider(err: unknown): boolean {
  const msg = errorMessage(err);

  // Hard client errors — no point trying another provider
  if (
    msg.includes("400") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("invalid_request") ||
    msg.includes("503")
  ) {
    return false;
  }

  return isRetryableError(err);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
