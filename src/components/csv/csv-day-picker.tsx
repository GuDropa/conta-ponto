"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CsvDayPickerProps = {
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
  disabled?: boolean;
  className?: string;
};

function clampDay(n: number): number {
  return Math.min(31, Math.max(1, Math.trunc(n)));
}

function buildIntervalSet(lo: number, hi: number): Set<number> {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const next = new Set<number>();
  for (let d = a; d <= b; d += 1) next.add(d);
  return next;
}

function serializeSelection(s: Set<number>): string {
  return [...s].sort((x, y) => x - y).join(",");
}

function boundsFromSet(s: Set<number>): { from: number; to: number } {
  if (s.size === 0) return { from: 1, to: 31 };
  const arr = [...s];
  return { from: Math.min(...arr), to: Math.max(...arr) };
}

/** Vazio ou inválido: mantém o fallback (último intervalo confirmado naquele campo). */
function parseField(raw: string, fallback: number): number {
  const t = raw.trim();
  if (t === "") return fallback;
  const n = Number(t);
  if (!Number.isFinite(n)) return fallback;
  return clampDay(n);
}

export function CsvDayPicker({
  selected,
  onSelectedChange,
  disabled,
  className,
}: CsvDayPickerProps) {
  const fieldId = useId();
  const syncedKey = useRef(serializeSelection(selected));
  const lastInterval = useRef(boundsFromSet(selected));
  const b0 = boundsFromSet(selected);
  const [fromStr, setFromStr] = useState(() => String(b0.from));
  const [toStr, setToStr] = useState(() => String(b0.to));

  useEffect(() => {
    if (selected.size === 0) {
      const next = buildIntervalSet(1, 31);
      syncedKey.current = serializeSelection(next);
      lastInterval.current = { from: 1, to: 31 };
      setFromStr("1");
      setToStr("31");
      onSelectedChange(next);
      return;
    }
    const key = serializeSelection(selected);
    if (key !== syncedKey.current) {
      syncedKey.current = key;
      const { from, to } = boundsFromSet(selected);
      lastInterval.current = { from, to };
      setFromStr(String(from));
      setToStr(String(to));
    }
  }, [selected, onSelectedChange]);

  function commitInterval() {
    const cur = lastInterval.current;
    const f = parseField(fromStr, cur.from);
    const t = parseField(toStr, cur.to);
    const lo = Math.min(f, t);
    const hi = Math.max(f, t);
    lastInterval.current = { from: lo, to: hi };
    setFromStr(String(lo));
    setToStr(String(hi));
    const next = buildIntervalSet(lo, hi);
    syncedKey.current = serializeSelection(next);
    onSelectedChange(next);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  const { from: dispLo, to: dispHi } = boundsFromSet(selected);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-18 flex-col gap-1">
          <label
            htmlFor={`${fieldId}-from`}
            className="text-xs font-medium text-muted-foreground"
          >
            De (dia)
          </label>
          <Input
            id={`${fieldId}-from`}
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            disabled={disabled}
            value={fromStr}
            onChange={(e) => setFromStr(e.target.value)}
            onBlur={commitInterval}
            onKeyDown={onInputKeyDown}
            className="h-9 w-18"
            aria-label="Primeiro dia do intervalo no CSV (1 a 31)"
          />
        </div>
        <div className="flex min-w-18 flex-col gap-1">
          <label
            htmlFor={`${fieldId}-to`}
            className="text-xs font-medium text-muted-foreground"
          >
            Até (dia)
          </label>
          <Input
            id={`${fieldId}-to`}
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            disabled={disabled}
            value={toStr}
            onChange={(e) => setToStr(e.target.value)}
            onBlur={commitInterval}
            onKeyDown={onInputKeyDown}
            className="h-9 w-18"
            aria-label="Último dia do intervalo no CSV (1 a 31)"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Período no CSV: dias{" "}
        <span className="font-medium text-foreground">
          {dispLo} a {dispHi}
        </span>{" "}
        (inclusive).
      </p>
      <p className="text-xs text-muted-foreground">
        Ajuste os números e toque fora do campo ou pressione Enter para aplicar.
      </p>
    </div>
  );
}
