"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileDown,
  ImageIcon,
  Loader2,
  ScanSearch,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import type { HrBatchReport } from "@/lib/hr-batch-report";
import {
  chunkFilesIntoPairs,
  downloadHrReportCsv,
  recognizeTimecardBatchWithGemini,
  recognizeTimecardPairWithGemini,
} from "@/lib/gemini-ocr-client";
import { cn } from "@/lib/utils";

type CameraCaptureProps = {
  onDetectedTimes: (rows: DetectedDayTimes[]) => void;
};

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type PairGroup = {
  index: number;
  front: SelectedImage;
  back: SelectedImage;
};

function buildPairGroups(images: SelectedImage[]): {
  pairs: PairGroup[];
  orphan: SelectedImage | null;
} {
  const pairs: PairGroup[] = [];
  let i = 0;
  while (i + 1 < images.length) {
    pairs.push({
      index: pairs.length,
      front: images[i],
      back: images[i + 1],
    });
    i += 2;
  }
  const orphan = i < images.length ? images[i] : null;
  return { pairs, orphan };
}

function ThumbnailSlot({
  label,
  globalIndex,
  image,
  disabled,
  onRemove,
}: {
  label: string;
  globalIndex: number;
  image: SelectedImage;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {globalIndex}
          </span>
          {label}
        </span>
      </div>
      <div
        className={cn(
          "relative aspect-4/3 overflow-hidden rounded-lg border-2 border-border bg-muted/40",
          "ring-offset-2 ring-offset-background",
        )}
      >
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/65 p-1.5 text-white shadow-sm transition-colors hover:bg-black/80 disabled:opacity-40"
          aria-label={`Remover foto ${globalIndex} (${label})`}
        >
          <X className="size-3.5" />
        </button>
        <Image
          src={image.previewUrl}
          alt={`Foto ${globalIndex} ${label}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <p className="truncate text-[11px] text-muted-foreground" title={image.file.name}>
        {image.file.name}
      </p>
    </div>
  );
}

export function CameraCapture({ onDetectedTimes }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [lastResultSummary, setLastResultSummary] = useState("");
  const [rawResponse, setRawResponse] = useState("");
  const [lastBatchReport, setLastBatchReport] = useState<HrBatchReport | null>(
    null,
  );

  const { pairs, orphan } = useMemo(
    () => buildPairGroups(images),
    [images],
  );

  const totalPhotos = images.length;
  const completePairs = pairs.length;
  const hasOdd = orphan !== null;

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
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
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
    setLastBatchReport(null);
    setLastResultSummary("");
  }

  const ctaLabel = useMemo(() => {
    if (completePairs <= 0) return "Processar";
    if (completePairs === 1) return "Ler 1 cartão e preencher o quadro";
    return `Gerar CSV — ${completePairs} funcionários`;
  }, [completePairs]);

  async function runOcr() {
    if (images.length === 0) return;

    const files = images.map((img) => img.file);
    if (files.length < 2) {
      setLastResultSummary(
        "São necessárias pelo menos 2 imagens (frente e verso do mesmo cartão).",
      );
      return;
    }

    const skippedOdd = files.length % 2 !== 0;
    const filesPaired = skippedOdd
      ? files.slice(0, files.length - 1)
      : files;
    const filePairs = chunkFilesIntoPairs(filesPaired);

    setIsProcessing(true);
    setProgressLabel("Enviando para a IA…");
    setRawResponse("");

    try {
      if (filePairs.length === 1) {
        const [a, b] = filePairs[0];
        const result = await recognizeTimecardPairWithGemini(a, b);
        setRawResponse(result.raw);
        onDetectedTimes(result.detections);
        setLastBatchReport(null);

        const namePart = result.employeeName
          ? `Colaborador: ${result.employeeName}. `
          : "";
        setLastResultSummary(
          result.detections.length > 0
            ? `${namePart}${result.detections.length} dia(s) com horários detectados. Abra a aba «Quadro do mês» para conferir e editar.`
            : `${namePart}Nenhum horário detectado nas imagens.`,
        );
        if (skippedOdd) {
          setLastResultSummary(
            (prev) =>
              `${prev} Ainda há 1 foto sem par — ela não foi enviada.`,
          );
        }
        return;
      }

      const batch = await recognizeTimecardBatchWithGemini(filesPaired, {
        onPairProgress: (done, total) => {
          setProgressLabel(`Processando cartões (${done}/${total})…`);
        },
        unpairedImageCount: skippedOdd ? 1 : 0,
      });

      const { report } = batch;
      setLastBatchReport(report);
      const ok = report.employees.filter((e) => !e.error).length;
      const fail = report.employees.filter((e) => e.error).length;

      setRawResponse(
        report.employees.map((e) => e.raw).filter(Boolean).join("\n---\n"),
      );

      downloadHrReportCsv(report);

      let msg = `Relatório pronto: ${ok} cartão(ões) lidos com sucesso`;
      if (fail > 0) {
        msg += `; ${fail} com erro (detalhes na coluna Observação do CSV)`;
      }
      msg +=
        ". O download do CSV já começou — use o botão abaixo se precisar baixar de novo.";

      if (report.skippedImageCount > 0) {
        msg += ` Há ${report.skippedImageCount} foto(s) sem par (não foram enviadas).`;
      }

      setLastResultSummary(msg);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      setLastResultSummary(`Erro: ${message}`);
    } finally {
      setIsProcessing(false);
      setProgressLabel("");
    }
  }

  const canRun = totalPhotos >= 2 && !isProcessing;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          Importar cartões de ponto
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          As fotos entram na ordem em que você as adiciona:{" "}
          <strong className="font-medium text-foreground">
            1 e 2 = mesmo cartão (frente e verso)
          </strong>
          ; 3 e 4 = próximo funcionário; e assim por diante. Confira os blocos
          abaixo antes de processar.
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
          disabled={isProcessing}
        >
          <Camera className="size-4 shrink-0" />
          Tirar foto
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          <Upload className="size-4 shrink-0" />
          Galeria
        </Button>
      </div>

      {totalPhotos > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/35 px-3 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-xs font-medium ring-1 ring-border/60">
            <ImageIcon className="size-3.5 text-muted-foreground" />
            {totalPhotos} {totalPhotos === 1 ? "foto" : "fotos"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-xs font-medium ring-1 ring-border/60">
            <Users className="size-3.5 text-muted-foreground" />
            {completePairs}{" "}
            {completePairs === 1 ? "par completo" : "pares completos"}
          </span>
          {hasOdd && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="text-xs font-medium">
                Falta o verso (ou uma foto a mais) para fechar o último cartão
              </span>
            </span>
          )}
        </div>
      )}

      {pairs.length > 0 && (
        <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto pr-1">
          {pairs.map((pair) => {
            const idxA = pair.index * 2 + 1;
            const idxB = pair.index * 2 + 2;
            return (
              <Card key={`${pair.front.id}-${pair.back.id}`} size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Cartão {pair.index + 1}
                  </CardTitle>
                  <CardDescription>
                    Foto {idxA} = frente · Foto {idxB} = verso (mesmo
                    funcionário)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <ThumbnailSlot
                      label="Frente"
                      globalIndex={idxA}
                      image={pair.front}
                      disabled={isProcessing}
                      onRemove={() => removeImage(pair.front.id)}
                    />
                    <ThumbnailSlot
                      label="Verso"
                      globalIndex={idxB}
                      image={pair.back}
                      disabled={isProcessing}
                      onRemove={() => removeImage(pair.back.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {orphan && (
        <div
          className="rounded-xl border-2 border-dashed border-amber-500/60 bg-amber-500/10 px-3 py-3 dark:bg-amber-500/15"
          role="status"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
            <AlertTriangle className="size-4 shrink-0" />
            Foto sem par ({totalPhotos}ª foto)
          </div>
          <p className="mb-3 text-xs text-amber-900/90 dark:text-amber-100/90">
            Esta imagem não será enviada até existir a segunda foto do mesmo
            cartão. Tire ou envie o verso em seguida, ou remova esta foto.
          </p>
          <div className="flex max-w-sm flex-col gap-2 sm:flex-row">
            <ThumbnailSlot
              label="Aguardando par"
              globalIndex={totalPhotos}
              image={orphan}
              disabled={isProcessing}
              onRemove={() => removeImage(orphan.id)}
            />
          </div>
        </div>
      )}

      {totalPhotos > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="lg"
            onClick={runOcr}
            disabled={!canRun}
            className="w-full sm:flex-1"
          >
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanSearch className="size-4" />
            )}
            {ctaLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={clearAllImages}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            <Trash2 className="size-4" />
            Limpar tudo
          </Button>
        </div>
      )}

      {totalPhotos > 0 && totalPhotos < 2 && (
        <p className="text-sm text-muted-foreground">
          Adicione pelo menos <strong>2 fotos</strong> (frente e verso) para
          processar.
        </p>
      )}

      {isProcessing && (
        <div className="rounded-xl border border-border/60 bg-accent/50 p-4">
          <p className="text-sm text-muted-foreground">Aguarde</p>
          <p className="text-base font-medium">{progressLabel}</p>
        </div>
      )}

      {lastBatchReport && !isProcessing && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 dark:bg-emerald-500/15">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Último relatório em lote
              </p>
              <p className="text-xs text-emerald-900/85 dark:text-emerald-100/85">
                O CSV já foi baixado. Você pode gerar o arquivo novamente sem
                reprocessar.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-fit"
            onClick={() => downloadHrReportCsv(lastBatchReport)}
          >
            <FileDown className="size-4" />
            Baixar CSV novamente
          </Button>
        </div>
      )}

      {lastResultSummary && !isProcessing && (
        <p className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
          {lastResultSummary}
        </p>
      )}

      {process.env.NODE_ENV === "development" && rawResponse && (
        <pre className="max-h-40 overflow-auto rounded-lg border border-dashed bg-muted p-3 text-xs whitespace-pre-wrap">
          {rawResponse.slice(0, 4000)}
          {rawResponse.length > 4000 ? "…" : ""}
        </pre>
      )}
    </section>
  );
}
