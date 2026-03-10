import Tesseract from "tesseract.js";

import { normalizeTimeString } from "@/lib/time-utils";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import type { TimeField } from "@/types/timecard";

const COLUMN_ORDER: TimeField[] = [
  "entry1",
  "exit1",
  "entry2",
  "exit2",
  "extraEntry",
  "extraExit",
];

const TIME_PATTERN = /\d{1,2}[:.]\d{2}/g;

export type DebugCanvas = {
  label: string;
  dataUrl: string;
};

async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new globalThis.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function upscale(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * factor);
  canvas.height = Math.round(source.height * factor);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function isolateRedChannel(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imageData.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const redSignal = Math.max(0, r - Math.max(g, b));
    const isRed = redSignal > 15 && r > 80;
    px[i] = isRed ? 0 : 255;
    px[i + 1] = isRed ? 0 : 255;
    px[i + 2] = isRed ? 0 : 255;
    px[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function grayscaleHighContrast(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imageData.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const redDominant = r > g + 15 && r > b + 15 && r > 60;
    const dark = luma < 110;
    const isInk = redDominant || dark;
    const v = isInk ? 0 : 255;
    px[i] = v;
    px[i + 1] = v;
    px[i + 2] = v;
    px[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function adaptiveThreshold(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  const gray = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    const redBoost = r > g + 15 && r > b + 15 ? r * 0.3 : 0;
    gray[i] = Math.max(0, Math.min(255, 255 - Math.round(0.299 * r + 0.587 * g + 0.114 * b + redBoost)));
  }

  const radius = Math.max(15, Math.round(Math.min(w, h) * 0.02));
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
    }
  }

  function regionSum(x1: number, y1: number, x2: number, y2: number): number {
    const a = x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0;
    const b = y1 > 0 ? integral[(y1 - 1) * w + x2] : 0;
    const c = x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0;
    const d = integral[y2 * w + x2];
    return d - b - c + a;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - radius);
      const y1 = Math.max(0, y - radius);
      const x2 = Math.min(w - 1, x + radius);
      const y2 = Math.min(h - 1, y + radius);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const mean = regionSum(x1, y1, x2, y2) / count;
      const val = gray[y * w + x] > mean * 0.65 ? 0 : 255;
      const idx = (y * w + x) * 4;
      px[idx] = val;
      px[idx + 1] = val;
      px[idx + 2] = val;
      px[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

type PreprocessingStrategy = {
  name: string;
  apply: (source: HTMLCanvasElement) => HTMLCanvasElement;
};

const STRATEGIES: PreprocessingStrategy[] = [
  {
    name: "Canal vermelho isolado",
    apply: (src) => upscale(isolateRedChannel(src), 3),
  },
  {
    name: "Grayscale alto contraste",
    apply: (src) => upscale(grayscaleHighContrast(src), 3),
  },
  {
    name: "Threshold adaptativo",
    apply: (src) => upscale(adaptiveThreshold(src), 2),
  },
];

function parseTimesFromText(text: string): DetectedDayTimes[] {
  const lines = text.split(/\n/).filter((line) => line.trim().length > 0);
  const detections: DetectedDayTimes[] = [];
  const usedDays = new Set<number>();

  for (const line of lines) {
    const cleaned = line
      .replace(/[oO]/g, "0")
      .replace(/[iIl|]/g, "1")
      .replace(/[sS]/g, "5");

    const times = Array.from(cleaned.matchAll(TIME_PATTERN))
      .map((m) => normalizeTimeString(m[0]))
      .filter((t): t is string => t !== null);

    if (times.length === 0) {
      continue;
    }

    const dayMatch = cleaned.match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
    let day: number | null = null;
    if (dayMatch) {
      const d = Number(dayMatch[1]);
      if (d >= 1 && d <= 31 && !usedDays.has(d)) {
        day = d;
      }
    }

    if (day === null) {
      for (let d = 1; d <= 31; d++) {
        if (!usedDays.has(d)) {
          day = d;
          break;
        }
      }
    }

    if (day === null) {
      continue;
    }

    usedDays.add(day);
    const values: Partial<Record<TimeField, string>> = {};
    times.slice(0, COLUMN_ORDER.length).forEach((time, index) => {
      values[COLUMN_ORDER[index]] = time;
    });

    detections.push({ day, values });
  }

  return detections;
}

async function runOcrOnCanvas(
  canvas: HTMLCanvasElement,
): Promise<{ text: string; rawText: string }> {
  const worker = await Tesseract.createWorker("eng");
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: "0123456789:. \n",
    });
    const result = await worker.recognize(canvas);
    return { text: result.data.text, rawText: result.data.text };
  } finally {
    await worker.terminate();
  }
}

async function runOcrNoWhitelist(
  canvas: HTMLCanvasElement,
): Promise<{ text: string; rawText: string }> {
  const worker = await Tesseract.createWorker("eng");
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    });
    const result = await worker.recognize(canvas);
    return { text: result.data.text, rawText: result.data.text };
  } finally {
    await worker.terminate();
  }
}

export async function detectTimesFromTimecardImage(
  file: File,
  onProgress?: (step: string) => void,
): Promise<{
  detections: DetectedDayTimes[];
  score: number;
  templateName: string;
  debugCanvases: DebugCanvas[];
  rawTexts: string[];
}> {
  const debugCanvases: DebugCanvas[] = [];
  const rawTexts: string[] = [];

  onProgress?.("Carregando imagem...");
  const fullCanvas = await loadImageToCanvas(file);
  debugCanvases.push({
    label: "Original",
    dataUrl: fullCanvas.toDataURL("image/jpeg", 0.7),
  });

  let bestDetections: DetectedDayTimes[] = [];
  let bestScore = 0;
  let bestName = "none";

  for (const strategy of STRATEGIES) {
    onProgress?.(`Processando: ${strategy.name}...`);
    const processed = strategy.apply(fullCanvas);
    debugCanvases.push({
      label: strategy.name,
      dataUrl: processed.toDataURL("image/jpeg", 0.7),
    });

    onProgress?.(`OCR (whitelist): ${strategy.name}...`);
    const result1 = await runOcrOnCanvas(processed);
    rawTexts.push(`[${strategy.name} whitelist] ${result1.rawText}`);
    const detections1 = parseTimesFromText(result1.text);
    if (detections1.length > bestScore) {
      bestDetections = detections1;
      bestScore = detections1.length;
      bestName = `${strategy.name} (whitelist)`;
    }

    onProgress?.(`OCR (sem whitelist): ${strategy.name}...`);
    const result2 = await runOcrNoWhitelist(processed);
    rawTexts.push(`[${strategy.name} full] ${result2.rawText}`);
    const detections2 = parseTimesFromText(result2.text);
    if (detections2.length > bestScore) {
      bestDetections = detections2;
      bestScore = detections2.length;
      bestName = `${strategy.name} (full)`;
    }
  }

  return {
    detections: bestDetections,
    score: bestScore,
    templateName: bestName,
    debugCanvases,
    rawTexts,
  };
}
