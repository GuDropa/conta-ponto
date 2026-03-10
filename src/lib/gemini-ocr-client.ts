import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";

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

export async function recognizeTimecardWithGemini(
  files: File[],
): Promise<{
  detections: DetectedDayTimes[];
  raw: string;
}> {
  const formData = new FormData();
  for (const file of files) {
    const compressed = await compressImage(file);
    formData.append("images", compressed, file.name);
  }

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `Erro HTTP ${response.status}`);
  }

  return {
    detections: data.detections ?? [],
    raw: data.raw ?? "",
  };
}
