"use client";

/**
 * GondolaScanner — scanner via câmera do celular.
 * V3: dedup via store.
 * V4: itens fora da lista alertados separadamente.
 * V5: câmera traseira; permissão negada/indisponível bloqueia + erro claro;
 *     release do stream ao desmontar.
 * V20: feedback (vibração) + debounce ≤1s para o mesmo código.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CameraOff, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useGondolaStore } from "@/lib/gondola-store";

type CameraState = "idle" | "initializing" | "active" | "denied" | "unavailable";

const STATUS_STYLE = {
  found: {
    bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-300",
    label: "✅ Produto encontrado",
  },
  unknown: {
    bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    label: "⚠️ Fora da lista",
  },
  duplicate: {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    label: "↩ Já bipado",
  },
};

const DEBOUNCE_MS = 1000;

export function GondolaScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastDecodeRef = useRef<{ code: string; at: number } | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<{
    code: string;
    status: "found" | "unknown" | "duplicate";
  } | null>(null);

  const { scanBarcode, scannedCodes, unknownCodes, erpList } = useGondolaStore();

  // store actions/state read inside callback — ref para evitar reinit do scanner
  const submitCode = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return;

      // V20 — debounce do mesmo código em janela curta
      const now = Date.now();
      const last = lastDecodeRef.current;
      if (last && last.code === code && now - last.at < DEBOUNCE_MS) return;
      lastDecodeRef.current = { code, at: now };

      const inList = erpList.some((p) => p.barcode === code);
      const alreadyScanned = scannedCodes.includes(code);
      const status = alreadyScanned ? "duplicate" : inList ? "found" : "unknown";

      setLastScanned({ code, status });

      // V20 — feedback tátil (quando suportado)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(status === "duplicate" ? [30, 40, 30] : 60);
      }

      // V3 — store dedup ainda protege a contagem
      scanBarcode(code);
    },
    [erpList, scannedCodes, scanBarcode]
  );

  // Mantém referência estável para o callback usado pelo decoder
  const submitCodeRef = useRef(submitCode);
  useEffect(() => {
    submitCodeRef.current = submitCode;
  }, [submitCode]);

  // V5 — câmera só inicia após gesto explícito (clique em "Permitir câmera")
  const requestCamera = useCallback(async () => {
    if (!videoRef.current) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraState("unavailable");
      setErrorMsg("Este dispositivo/navegador não expõe câmera.");
      return;
    }

    setCameraState("initializing");
    setErrorMsg("");

    const reader = new BrowserMultiFormatReader();
    try {
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result) => {
          if (result) submitCodeRef.current(result.getText());
        }
      );
      controlsRef.current = controls;
      setCameraState("active");
    } catch (err) {
      const name = (err as { name?: string } | null)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraState("denied");
        setErrorMsg(
          "Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador e toque em 'Tentar novamente'."
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraState("unavailable");
        setErrorMsg("Nenhuma câmera traseira disponível neste dispositivo.");
      } else {
        setCameraState("unavailable");
        setErrorMsg(
          `Não foi possível iniciar a câmera${name ? ` (${name})` : ""}.`
        );
      }
    }
  }, []);

  // V5 — release do stream ao desmontar
  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  const foundCount = scannedCodes.length;
  const missingCount = Math.max(0, erpList.length - foundCount);
  const blocked = cameraState === "denied" || cameraState === "unavailable";
  const videoHidden = blocked || cameraState === "idle";

  return (
    <div className="space-y-4">
      {/* Contadores — 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-green-50 py-4 dark:bg-green-950">
          <span className="text-3xl font-extrabold tabular-nums text-green-700 dark:text-green-300">
            {foundCount}
          </span>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            Encontrados
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-red-50 py-4 dark:bg-red-950">
          <span className="text-3xl font-extrabold tabular-nums text-red-700 dark:text-red-300">
            {missingCount}
          </span>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
            Faltantes
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-amber-50 py-4 dark:bg-amber-950">
          <span className="text-3xl font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
            {unknownCodes.length}
          </span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Fora lista
          </span>
        </div>
      </div>

      {/* Área da câmera */}
      <div className="overflow-hidden rounded-2xl border-2 border-unimax-blue bg-black">
        <div className="relative aspect-[3/4] w-full">
          <video
            ref={videoRef}
            className={[
              "h-full w-full object-cover",
              videoHidden ? "hidden" : "",
            ].join(" ")}
            playsInline
            muted
          />

          {/* Overlay de mira */}
          {cameraState === "active" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-1/3 w-4/5 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-unimax-blue" />
              </div>
            </div>
          )}

          {/* Estado: idle — aguardando gesto de consentimento (V5) */}
          {cameraState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
              <Camera className="h-10 w-10" />
              <p className="text-base font-bold">Acesso à câmera</p>
              <p className="text-sm text-white/85">
                Para bipar os produtos precisamos usar a câmera do seu dispositivo.
              </p>
              <button
                type="button"
                onClick={requestCamera}
                className="min-h-[48px] rounded-xl bg-unimax-blue px-5 text-sm font-bold text-white active:scale-95 active:opacity-90"
              >
                Permitir câmera
              </button>
            </div>
          )}

          {/* Estado: inicializando */}
          {cameraState === "initializing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-semibold">Iniciando câmera…</p>
            </div>
          )}

          {/* Estado: erro bloqueante (V5) */}
          {blocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-950/90 px-6 text-center text-white">
              <CameraOff className="h-10 w-10" />
              <p className="text-base font-bold">Câmera indisponível</p>
              <p className="text-sm text-white/85">{errorMsg}</p>
              {cameraState === "denied" && (
                <button
                  type="button"
                  onClick={requestCamera}
                  className="mt-1 min-h-[44px] rounded-xl bg-white px-4 text-sm font-bold text-red-950 active:scale-95"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {/* Rótulo "ao vivo" */}
          {cameraState === "active" && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              <Camera className="h-3.5 w-3.5" />
              Aponte para o código
            </div>
          )}
        </div>
      </div>

      {/* Feedback do último item */}
      {lastScanned && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-4 ${STATUS_STYLE[lastScanned.status].bg}`}
        >
          <div className="flex-1">
            <p className={`text-base font-bold ${STATUS_STYLE[lastScanned.status].text}`}>
              {STATUS_STYLE[lastScanned.status].label}
            </p>
            <p className={`font-mono text-sm ${STATUS_STYLE[lastScanned.status].text} opacity-80`}>
              {lastScanned.code}
            </p>
          </div>
        </div>
      )}

      {/* Alerta — itens fora da lista (V4) */}
      {unknownCodes.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Fora da lista ERP ({unknownCodes.length})
            </p>
          </div>
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {unknownCodes.map((code) => (
              <li
                key={code}
                className="rounded-lg bg-amber-100 px-3 py-1.5 font-mono text-sm text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              >
                {code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
