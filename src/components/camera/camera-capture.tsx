"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Loader2,
  ScanSearch,
  Trash2,
  Upload,
  X,
  Bug,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import { recognizeTimecardWithGemini } from "@/lib/gemini-ocr-client";

type CameraCaptureProps = {
  onDetectedTimes: (rows: DetectedDayTimes[]) => void;
};

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export function CameraCapture({ onDetectedTimes }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [lastResultSummary, setLastResultSummary] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [rawResponse, setRawResponse] = useState("");

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  function appendFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newImages = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function removeImage(imageId: string) {
    if (isProcessing) return;
    setImages((current) => {
      const found = current.find((img) => img.id === imageId);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return current.filter((img) => img.id !== imageId);
    });
  }

  function clearAllImages() {
    if (isProcessing) return;
    setImages((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  }

  async function runOcr() {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProgressLabel("Enviando imagens para o Gemini...");
    setRawResponse("");

    try {
      const files = images.map((img) => img.file);
      const result = await recognizeTimecardWithGemini(files);

      setRawResponse(result.raw);
      onDetectedTimes(result.detections);

      setLastResultSummary(
        result.detections.length > 0
          ? `${result.detections.length} dia(s) com horarios detectados`
          : "Nenhum horario detectado na imagem.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      setLastResultSummary(`Erro: ${message}`);
    } finally {
      setIsProcessing(false);
      setProgressLabel("");
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Captura do cartao
        </h3>
        <p className="text-sm text-muted-foreground">
          Tire a foto ou carregue imagens do cartao de ponto.
        </p>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => appendFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => appendFiles(e.target.files)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" />
          Tirar foto
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Galeria
        </Button>
      </div>

      {images.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-lg border"
              >
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={isProcessing}
                  className="absolute top-1 right-1 z-10 rounded-full bg-black/60 p-1 text-white active:bg-black"
                  aria-label={`Excluir ${image.file.name}`}
                >
                  <X className="size-3.5" />
                </button>
                <Image
                  src={image.previewUrl}
                  alt={image.file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              onClick={runOcr}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanSearch className="size-4" />
              )}
              Processar OCR
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={clearAllImages}
              disabled={isProcessing}
              className="w-full"
            >
              <Trash2 className="size-4" />
              Excluir fotos
            </Button>
          </div>
        </>
      )}

      {isProcessing && (
        <div className="rounded-lg bg-accent p-3">
          <p className="text-sm text-muted-foreground">Processando...</p>
          <p className="text-base font-medium">{progressLabel}</p>
        </div>
      )}

      {lastResultSummary && !isProcessing && (
        <p className="rounded-lg bg-accent p-3 text-base text-muted-foreground">
          {lastResultSummary}
        </p>
      )}

      {rawResponse && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowDebug((v) => !v)}
        >
          <Bug className="size-3.5" />
          {showDebug ? "Ocultar debug" : "Ver debug"}
        </Button>
      )}

      {showDebug && rawResponse && (
        <pre className="max-h-48 overflow-auto rounded-lg border border-dashed bg-muted p-3 text-sm whitespace-pre-wrap">
          {rawResponse}
        </pre>
      )}
    </section>
  );
}
