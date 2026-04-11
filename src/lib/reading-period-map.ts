import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";

export type ReadingPeriod = {
  /** ISO date string YYYY-MM-DD (local) */
  start: string;
  /** ISO date string YYYY-MM-DD (local) */
  end: string;
};

export type PeriodMapStats = {
  /** Dias omitidos porque o `day` do cartão aparece mais de uma vez no intervalo */
  ambiguousCount: number;
  /** Dias omitidos porque o `day` do cartão não existe em nenhuma data do intervalo */
  outOfRangeCount: number;
};

export type MappedDetections = {
  detections: DetectedDayTimes[];
  stats: PeriodMapStats;
};

/** Retorna os limites do mês corrente como strings YYYY-MM-DD locais. */
export function currentMonthPeriod(): ReadingPeriod {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { start: toLocalIso(first), end: toLocalIso(last) };
}

/** Converte um `Date` local em string YYYY-MM-DD sem aplicar UTC. */
export function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Formata YYYY-MM-DD como DD/MM/AAAA (pt-BR). */
export function formatLocalIso(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Expande o período em uma lista de datas locais (inclusivo).
 * Retorna vazio se start > end ou intervalo > 31 dias.
 */
function expandPeriod(period: ReadingPeriod): Date[] {
  const start = parseLocalIso(period.start);
  const end = parseLocalIso(period.end);
  if (!start || !end || start > end) return [];

  const msPerDay = 86_400_000;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  if (days > 31) return [];

  const result: Date[] = [];
  for (let i = 0; i < days; i++) {
    result.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return result;
}

function parseLocalIso(iso: string): Date | null {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Valida um período antes de usar.
 * Retorna uma string de erro localizada ou null se válido.
 */
export function validatePeriod(period: ReadingPeriod): string | null {
  const start = parseLocalIso(period.start);
  const end = parseLocalIso(period.end);
  if (!start || !end) return "Datas inválidas.";
  if (start > end) return "A data de início deve ser anterior ou igual ao fim.";
  const msPerDay = 86_400_000;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  if (days > 31) return "O período não pode ultrapassar 31 dias (uma folha de ponto).";
  return null;
}

/**
 * Mês e ano usados nas colunas Data/Mês/Ano do CSV quando uma linha não tem
 * `calendarDate` (ex.: relatório antigo sem mapeamento pelo período).
 * Deriva do primeiro dia do período de leitura (campo `start`).
 */
export function referenceYearMonthFromPeriod(
  period: ReadingPeriod,
): { referenceYear: number; referenceMonth: number } {
  const start = parseLocalIso(period.start);
  if (!start) {
    const now = new Date();
    return {
      referenceYear: now.getFullYear(),
      referenceMonth: now.getMonth() + 1,
    };
  }
  return {
    referenceYear: start.getFullYear(),
    referenceMonth: start.getMonth() + 1,
  };
}

/**
 * Mapeia uma lista de `DetectedDayTimes` para datas de calendário com base no período.
 *
 * - Dias do cartão que não existem no intervalo → omitidos (outOfRangeCount++).
 * - Dias do cartão cujo número de dia (`getDate`) aparece mais de uma vez no intervalo
 *   (caso raro de intervalo longo) → omitidos (ambiguousCount++).
 * - Demais → `calendarDate` preenchido em formato YYYY-MM-DD.
 */
export function mapDetectionsToPeriod(
  detections: DetectedDayTimes[],
  period: ReadingPeriod,
): MappedDetections {
  const dates = expandPeriod(period);
  if (dates.length === 0) {
    return {
      detections,
      stats: { ambiguousCount: 0, outOfRangeCount: 0 },
    };
  }

  // day-of-month (1–31) → list of matching dates in interval
  const byDayNumber = new Map<number, Date[]>();
  for (const d of dates) {
    const dn = d.getDate();
    const existing = byDayNumber.get(dn) ?? [];
    existing.push(d);
    byDayNumber.set(dn, existing);
  }

  let ambiguousCount = 0;
  let outOfRangeCount = 0;
  const mapped: DetectedDayTimes[] = [];

  for (const det of detections) {
    const candidates = byDayNumber.get(det.day);
    if (!candidates || candidates.length === 0) {
      outOfRangeCount++;
      continue;
    }
    if (candidates.length > 1) {
      ambiguousCount++;
      continue;
    }
    mapped.push({ ...det, calendarDate: toLocalIso(candidates[0]) });
  }

  return { detections: mapped, stats: { ambiguousCount, outOfRangeCount } };
}
