import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import {
  buildHrBatchReport,
  buildHrReportCsv,
  type HrBatchEmployeeResult,
  type HrBatchReport,
} from "@/lib/hr-batch-report";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Falha ao carregar imagem"));
      image.src = url;
    });

    let { naturalWidth: w, naturalHeight: h } = img;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Agrupa arquivos em pares na ordem: [0,1], [2,3], ...
 */
export function chunkFilesIntoPairs(files: File[]): [File, File][] {
  const pairs: [File, File][] = [];
  for (let i = 0; i + 1 < files.length; i += 2) {
    pairs.push([files[i], files[i + 1]]);
  }
  return pairs;
}

type OcrPairResponse = {
  employeeName?: string;
  detections?: DetectedDayTimes[];
  raw?: string;
  error?: string;
};

async function postOcrPair(
  fileA: File,
  fileB: File,
): Promise<OcrPairResponse> {
  const formData = new FormData();
  const compressedA = await compressImage(fileA);
  const compressedB = await compressImage(fileB);
  formData.append("images", compressedA, fileA.name);
  formData.append("images", compressedB, fileB.name);

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as OcrPairResponse & {
    modelUsed?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? `Erro HTTP ${response.status}`);
  }

  return {
    employeeName: data.employeeName ?? "",
    detections: data.detections ?? [],
    raw: data.raw ?? "",
  };
}

/**
 * Uma requisição: frente + verso (2 imagens) de um funcionário.
 */
export async function recognizeTimecardPairWithGemini(
  fileA: File,
  fileB: File,
): Promise<{
  employeeName: string;
  detections: DetectedDayTimes[];
  raw: string;
}> {
  const result = await postOcrPair(fileA, fileB);
  return {
    employeeName: result.employeeName ?? "",
    detections: result.detections ?? [],
    raw: result.raw ?? "",
  };
}

/**
 * Processa vários funcionários em paralelo (um par de fotos por funcionário).
 * Falhas em um par não interrompem os demais.
 */
export async function recognizeTimecardBatchWithGemini(
  allFiles: File[],
  options?: {
    onPairProgress?: (done: number, total: number) => void;
    /** Imagens excluídas antes do lote (ex.: sobra ímpar na fila). */
    unpairedImageCount?: number;
  },
): Promise<{
  report: HrBatchReport;
}> {
  const pairs = chunkFilesIntoPairs(allFiles);
  const skippedImageCount =
    (options?.unpairedImageCount ?? 0) + (allFiles.length - pairs.length * 2);
  const total = pairs.length;

  let completed = 0;
  const employees: HrBatchEmployeeResult[] = await Promise.all(
    pairs.map(async ([a, b], pairIndex) => {
      try {
        const r = await postOcrPair(a, b);
        return {
          pairIndex,
          employeeName: r.employeeName ?? "",
          detections: r.detections ?? [],
          raw: r.raw ?? "",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro desconhecido";
        console.error(
          `[OCR lote] Falha no par ${pairIndex + 1} (${a.name} + ${b.name}):`,
          message,
        );
        return {
          pairIndex,
          employeeName: "",
          detections: [],
          raw: "",
          error: message,
        };
      } finally {
        completed += 1;
        options?.onPairProgress?.(completed, total);
      }
    }),
  );

  employees.sort((a, b) => a.pairIndex - b.pairIndex);

  const report = buildHrBatchReport(employees, skippedImageCount);

  return { report };
}

export function downloadHrReportCsv(report: HrBatchReport, filename?: string) {
  const csv = buildHrReportCsv(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `relatorio-ponto-rh-${formatDateFile()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateFile() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
