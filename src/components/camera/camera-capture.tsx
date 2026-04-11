"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
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
import { appendEntry } from "@/lib/csv-history-storage";
import { buildHrBatchReport } from "@/lib/hr-batch-report";
import {
  currentMonthPeriod,
  mapDetectionsToPeriod,
  referenceYearMonthFromPeriod,
  validatePeriod,
  type ReadingPeriod,
} from "@/lib/reading-period-map";
import {
  chunkFilesIntoPairs,
  downloadHrReportCsv,
  recognizeTimecardBatchWithGemini,
  recognizeTimecardPairWithGemini,
} from "@/lib/gemini-ocr-client";
import { useBeforeUnloadWhen } from "@/hooks/use-before-unload-warning";
import {
  clearCameraDraft,
  loadCameraDraft,
  saveCameraDraft,
} from "@/lib/camera-draft-idb";
import { cn } from "@/lib/utils";

type CameraCaptureProps = {
  onHistoryUpdated?: () => void;
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

function newDraftImageId(file: File) {
  const suffix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Math.random()).slice(2);
  return `${file.name}-${file.lastModified}-draft-${suffix}`;
}

export function CameraCapture({ onHistoryUpdated }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressHint, setProgressHint] = useState("");
  const [lastResultSummary, setLastResultSummary] = useState("");
  const [previewsExpanded, setPreviewsExpanded] = useState(false);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [readingPeriod, setReadingPeriod] =
    useState<ReadingPeriod>(currentMonthPeriod);
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

  useEffect(() => {
    return () => {
      if (batchProgressIntervalRef.current) {
        clearInterval(batchProgressIntervalRef.current);
        batchProgressIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const files = await loadCameraDraft();
      if (cancelled || !files?.length) return;
      setImages((current) => {
        if (current.length > 0) return current;
        return files.map((file) => ({
          id: newDraftImageId(file),
          file,
          previewUrl: URL.createObjectURL(file),
        }));
      });
      if (!cancelled) setDraftRecovered(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const files = images.map((img) => img.file);
    if (files.length === 0) {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      void clearCameraDraft();
      return;
    }
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      void saveCameraDraft(files);
    }, 400);
    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [images]);

  useEffect(() => {
    function flushDraft() {
      const list = imagesRef.current.map((i) => i.file);
      if (list.length > 0) void saveCameraDraft(list);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flushDraft();
    }
    function onPageHide() {
      flushDraft();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useBeforeUnloadWhen(isProcessing || images.length > 0);

  function appendFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newImages = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((current) => {
      const next = [...current, ...newImages];
      void saveCameraDraft(next.map((i) => i.file));
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function removeImage(imageId: string) {
    if (isProcessing) return;
    setImages((current) => {
      const found = current.find((img) => img.id === imageId);
      if (found) URL.revokeObjectURL(found.previewUrl);
      const next = current.filter((img) => img.id !== imageId);
      if (next.length === 0) void clearCameraDraft();
      else void saveCameraDraft(next.map((i) => i.file));
      return next;
    });
  }

  function clearAllImages() {
    if (isProcessing) return;
    setImages((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
    setLastResultSummary("");
    void clearCameraDraft();
  }

  const ctaLabel = useMemo(() => {
    if (completePairs <= 0) return "Processar";
    if (completePairs === 1) return "Ler 1 cartão e gerar CSV";
    return `Gerar CSV — ${completePairs} funcionários`;
  }, [completePairs]);

  async function runOcr() {
    if (images.length === 0) return;

    const periodError = validatePeriod(readingPeriod);
    if (periodError) {
      setLastResultSummary(`Período de leitura inválido: ${periodError}`);
      return;
    }

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
    setProgressHint("");
    setProgressLabel("Enviando para a IA…");

    function clearBatchProgressTicker() {
      if (batchProgressIntervalRef.current) {
        clearInterval(batchProgressIntervalRef.current);
        batchProgressIntervalRef.current = null;
      }
    }

    try {
      if (filePairs.length === 1) {
        const [a, b] = filePairs[0];
        const result = await recognizeTimecardPairWithGemini(a, b);

        const { detections: mappedDetections, stats } = mapDetectionsToPeriod(
          result.detections,
          readingPeriod,
        );

        const report = buildHrBatchReport(
          [
            {
              pairIndex: 0,
              employeeName: result.employeeName,
              detections: mappedDetections,
              raw: result.raw,
            },
          ],
          skippedOdd ? 1 : 0,
        );

        downloadHrReportCsv(
          report,
          undefined,
          null,
          referenceYearMonthFromPeriod(readingPeriod),
        );
        appendEntry(report, readingPeriod);
        onHistoryUpdated?.();

        const namePart = result.employeeName
          ? `Colaborador: ${result.employeeName}. `
          : "";
        const omittedParts: string[] = [];
        if (stats.outOfRangeCount > 0)
          omittedParts.push(`${stats.outOfRangeCount} fora do período`);
        if (stats.ambiguousCount > 0)
          omittedParts.push(`${stats.ambiguousCount} ambíguo(s)`);
        const omittedNote =
          omittedParts.length > 0
            ? ` (${omittedParts.join("; ")} omitido(s))`
            : "";
        setLastResultSummary(
          mappedDetections.length > 0
            ? `${namePart}${mappedDetections.length} dia(s) detectados${omittedNote}. CSV baixado e salvo no histórico — aba «Histórico» para baixar de novo.`
            : `${namePart}Nenhum horário detectado${omittedNote}; CSV e histórico foram gerados mesmo assim.`,
        );
        if (skippedOdd) {
          setLastResultSummary(
            (prev) =>
              `${prev} Ainda há 1 foto sem par — ela não foi enviada.`,
          );
        }
        return;
      }

      const totalPairs = filePairs.length;
      const startedAt = Date.now();
      const estimatedMs = Math.min(
        150_000,
        Math.max(20_000, totalPairs * 1_800),
      );

      function updateBatchProgressUi() {
        const elapsed = Date.now() - startedAt;
        const ratio = Math.min(1, elapsed / estimatedMs);
        let shown = Math.max(1, Math.ceil(ratio * totalPairs));
        if (shown >= totalPairs) shown = totalPairs - 1;
        setProgressLabel(
          `Processando cartões [${shown}/${totalPairs}]`,
        );
        setProgressHint(
          "Compactação e envio das fotos, depois leitura no servidor. Em lotes grandes costuma levar cerca de 1 a 2 minutos — não feche nem atualize esta aba. O contador [x/y] é uma estimativa de andamento, não cada cartão já concluído.",
        );
      }

      clearBatchProgressTicker();
      updateBatchProgressUi();
      batchProgressIntervalRef.current = setInterval(updateBatchProgressUi, 450);

      const batch = await recognizeTimecardBatchWithGemini(filesPaired, {
        unpairedImageCount: skippedOdd ? 1 : 0,
      });

      clearBatchProgressTicker();
      setProgressLabel(`Finalizando [${totalPairs}/${totalPairs}]`);
      setProgressHint("Gerando o relatório e o CSV…");

      const rawReport = batch.report;

      let totalOmittedOutOfRange = 0;
      let totalOmittedAmbiguous = 0;
      const mappedEmployees = rawReport.employees.map((emp) => {
        if (emp.error) return emp;
        const { detections: mapped, stats } = mapDetectionsToPeriod(
          emp.detections,
          readingPeriod,
        );
        totalOmittedOutOfRange += stats.outOfRangeCount;
        totalOmittedAmbiguous += stats.ambiguousCount;
        return { ...emp, detections: mapped };
      });
      const report = { ...rawReport, employees: mappedEmployees };

      const ok = report.employees.filter((e) => !e.error).length;
      const fail = report.employees.filter((e) => e.error).length;

      downloadHrReportCsv(
        report,
        undefined,
        null,
        referenceYearMonthFromPeriod(readingPeriod),
      );
      appendEntry(report, readingPeriod);
      onHistoryUpdated?.();

      let msg = `Relatório pronto: ${ok} cartão(ões) lidos com sucesso`;
      if (fail > 0) {
        msg += `; ${fail} com erro (nome do colaborador indica o problema no CSV)`;
      }
      msg +=
        ". O CSV foi baixado e guardado — aba «Histórico» para baixar de novo quando quiser.";
      const batchOmittedParts: string[] = [];
      if (totalOmittedOutOfRange > 0)
        batchOmittedParts.push(`${totalOmittedOutOfRange} dia(s) fora do período`);
      if (totalOmittedAmbiguous > 0)
        batchOmittedParts.push(`${totalOmittedAmbiguous} dia(s) ambíguo(s)`);
      if (batchOmittedParts.length > 0)
        msg += ` ${batchOmittedParts.join("; ")} omitido(s) do relatório.`;

      if (report.skippedImageCount > 0) {
        msg += ` Há ${report.skippedImageCount} foto(s) sem par (não foram enviadas).`;
      }

      setLastResultSummary(msg);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      setLastResultSummary(`Erro: ${message}`);
    } finally {
      clearBatchProgressTicker();
      setIsProcessing(false);
      setProgressLabel("");
      setProgressHint("");
    }
  }

  const canRun =
    totalPhotos >= 2 && !isProcessing && !validatePeriod(readingPeriod);

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

      {draftRecovered && (
        <div
          className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm dark:bg-emerald-500/15"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              Fotos recuperadas neste aparelho
            </p>
            <p className="text-xs text-emerald-900/90 dark:text-emerald-100/85">
              As imagens foram salvas automaticamente (mesmo se a página
              recarregar no celular). Você pode continuar ou processar de novo.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-emerald-800 dark:text-emerald-200 border-emerald-500 dark:border-emerald-400"
              onClick={() => setDraftRecovered(false)}
            >
              Entendi
            </Button>
          </div>
        </div>
      )}

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

      <div className="rounded-xl border border-border/80 bg-muted/25 p-3 space-y-3">
        <div>
          <p className="mb-0.5 text-sm font-medium text-foreground">
            Período desta leitura
          </p>
          <p className="text-xs text-muted-foreground">
            Primeiro e último dia que entram nesta fotografia do cartão. Use datas
            de meses diferentes quando a contagem cruzar o fim do mês (ex.: 29/04 a
            03/05).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="period-start"
            >
              De
            </label>
            <input
              id="period-start"
              type="date"
              value={readingPeriod.start}
              max={readingPeriod.end}
              disabled={isProcessing}
              onChange={(e) =>
                setReadingPeriod((prev) => ({ ...prev, start: e.target.value }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="period-end"
            >
              Até
            </label>
            <input
              id="period-end"
              type="date"
              value={readingPeriod.end}
              min={readingPeriod.start}
              disabled={isProcessing}
              onChange={(e) =>
                setReadingPeriod((prev) => ({ ...prev, end: e.target.value }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
        {validatePeriod(readingPeriod) && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {validatePeriod(readingPeriod)}
          </p>
        )}
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

      {(pairs.length > 0 || orphan) && (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/20">
          <button
            type="button"
            id="camera-previews-trigger"
            aria-expanded={previewsExpanded}
            aria-controls="camera-previews-panel"
            onClick={() => setPreviewsExpanded((open) => !open)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
              "hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary",
              )}
            >
              {completePairs}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                Pré-visualização dos cartões
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {completePairs === 0
                  ? "Nenhum par completo"
                  : completePairs === 1
                    ? "1 par adicionado"
                    : `${completePairs} pares adicionados`}
                {orphan ? " · 1 foto aguardando verso" : ""}
                {" · "}
                {totalPhotos} {totalPhotos === 1 ? "foto" : "fotos"} no total
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                previewsExpanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          <div
            id="camera-previews-panel"
            role="region"
            aria-labelledby="camera-previews-trigger"
            hidden={!previewsExpanded}
            className={cn(!previewsExpanded && "hidden")}
          >
            <div className="space-y-3 border-t border-border/60 p-3">
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
                    Esta imagem não será enviada até existir a segunda foto do
                    mesmo cartão. Tire ou envie o verso em seguida, ou remova
                    esta foto.
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
            </div>
          </div>
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
          <p className="text-base font-medium text-foreground">{progressLabel}</p>
          {progressHint ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {progressHint}
            </p>
          ) : null}
        </div>
      )}

      {lastResultSummary && !isProcessing && (
        <p className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
          {lastResultSummary}
        </p>
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

    </section>
  );
}
