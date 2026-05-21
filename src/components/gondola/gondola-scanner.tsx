"use client";

/**
 * GondolaScanner — mobile-first. Scanner BT HID.
 * V3: dedup via store.
 * V4: itens fora da lista alertados separadamente.
 * V5: foco permanente no input.
 *
 * inputMode="none" → scanner BT envia keystrokes sem abrir teclado virtual.
 * Botão "Digitar" troca para inputMode="text" para digitação manual.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ScanLine, AlertTriangle, Keyboard, Scan } from "lucide-react";
import { useGondolaStore } from "@/lib/gondola-store";

type InputMode = "scanner" | "manual";

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

export function GondolaScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("scanner");
  const [lastScanned, setLastScanned] = useState<{
    code: string;
    status: "found" | "unknown" | "duplicate";
  } | null>(null);

  const { scanBarcode, scannedCodes, unknownCodes, erpList } = useGondolaStore();

  // V5 — foco automático permanente (sem abrir teclado se inputMode=none)
  const forceFocus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    forceFocus();
    document.addEventListener("touchend", forceFocus);
    return () => document.removeEventListener("touchend", forceFocus);
  }, [forceFocus]);

  // Refoca ao trocar de modo
  useEffect(() => {
    forceFocus();
  }, [inputMode, forceFocus]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitCode(inputValue);
    }
  }

  function submitCode(raw: string) {
    const code = raw.trim();
    if (!code) return;

    const inList = erpList.some((p) => p.barcode === code);
    const alreadyScanned = scannedCodes.includes(code);

    setLastScanned({
      code,
      status: alreadyScanned ? "duplicate" : inList ? "found" : "unknown",
    });

    scanBarcode(code);
    setInputValue("");
  }

  function toggleMode() {
    setInputMode((m) => (m === "scanner" ? "manual" : "scanner"));
    setInputValue("");
  }

  const foundCount = scannedCodes.length;
  const missingCount = Math.max(0, erpList.length - foundCount);

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

      {/* Área de bipagem */}
      <div className="rounded-2xl border-2 border-unimax-blue bg-unimax-blue/5 p-4">
        {/* Modo toggle */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-unimax-blue">
            <Scan className="h-4 w-4" />
            <span className="text-sm font-bold">
              {inputMode === "scanner" ? "Modo scanner" : "Digitar código"}
            </span>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleMode();
            }}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-unimax-blue/30 bg-background px-3 py-1.5 text-xs font-semibold text-unimax-blue active:bg-unimax-blue/10"
          >
            <Keyboard className="h-3.5 w-3.5" />
            {inputMode === "scanner" ? "Digitar" : "Scanner"}
          </button>
        </div>

        {/* Input — inputMode="none" em modo scanner (BT HID não abre teclado virtual) */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode={inputMode === "scanner" ? "none" : "text"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={
              inputMode === "scanner"
                ? "Aguardando scanner…"
                : "Digite o código + OK"
            }
            className="min-h-[52px] w-full rounded-xl border border-border bg-background px-4 text-base font-mono outline-none ring-2 ring-unimax-blue/40 placeholder:text-muted-foreground focus:ring-unimax-blue"
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              submitCode(inputValue);
            }}
            className="flex min-h-[52px] min-w-[52px] items-center justify-center rounded-xl bg-unimax-blue text-white active:opacity-80"
          >
            <ScanLine className="h-6 w-6" />
          </button>
        </div>

        {inputMode === "scanner" && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Toque em qualquer lugar para manter o foco no leitor
          </p>
        )}
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
