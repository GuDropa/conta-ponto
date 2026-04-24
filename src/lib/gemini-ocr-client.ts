import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import {
  buildHrBatchReport,
  type BuildHrReportCsvOptions,
  type HrBatchEmployeeResult,
  type HrBatchReport,
} from "@/lib/hr-batch-report";
import { hrReportToXlsxBlob } from "@/lib/hr-report-xlsx";

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
  const [compressedA, compressedB] = await Promise.all([
    compressImage(fileA),
    compressImage(fileB),
  ]);
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

type BatchOcrApiResponse = {
  batch: true;
  pairs: Array<{
    pairIndex: number;
    employeeName?: string;
    detections?: DetectedDayTimes[];
    raw?: string;
    error?: string;
  }>;
};

/**
 * Processa vários funcionários em paralelo no servidor (uma requisição HTTP;
 * o Node dispara todas as chamadas ao Gemini com Promise.all).
 * Falhas em um par não interrompem os demais.
 */
export async function recognizeTimecardBatchWithGemini(
  allFiles: File[],
  options?: {
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

  if (total === 0) {
    return {
      report: buildHrBatchReport([], skippedImageCount),
    };
  }

  const compressedBlobs = await Promise.all(
    allFiles.map((file) => compressImage(file)),
  );
  const formData = new FormData();
  allFiles.forEach((file, i) => {
    formData.append("images", compressedBlobs[i], file.name);
  });

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as BatchOcrApiResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? `Erro HTTP ${response.status}`);
  }

  if (!data.batch || !Array.isArray(data.pairs)) {
    throw new Error("Resposta inesperada do servidor (esperado lote paralelo).");
  }

  const employees: HrBatchEmployeeResult[] = data.pairs.map((p) => {
    if (p.error) {
      console.error(
        `[OCR lote] Falha no par ${(p.pairIndex ?? 0) + 1}:`,
        p.error,
      );
    }
    return {
      pairIndex: p.pairIndex,
      employeeName: p.employeeName ?? "",
      detections: p.detections ?? [],
      raw: p.raw ?? "",
      ...(p.error ? { error: p.error } : {}),
    };
  });

  employees.sort((a, b) => a.pairIndex - b.pairIndex);

  const report = buildHrBatchReport(employees, skippedImageCount);

  return { report };
}

export function downloadHrReportXlsx(
  report: HrBatchReport,
  filename?: string,
  onlyDays?: Set<number> | null,
  options?: Pick<BuildHrReportCsvOptions, "referenceMonth" | "referenceYear">,
) {
  const blob = hrReportToXlsxBlob(report, { onlyDays, ...options });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `relatorio-ponto-rh-${formatDateFile()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateFile() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
