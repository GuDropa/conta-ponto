import type { TimecardRow, WorkedTimeSummary } from "@/types/timecard";

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeTimeString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (HHMM_REGEX.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 3) {
    return `${digitsOnly[0].padStart(2, "0")}:${digitsOnly.slice(1, 3)}`;
  }
  if (digitsOnly.length === 4) {
    return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
  }

  return null;
}

export function isValidTimeString(raw: string): boolean {
  const normalized = normalizeTimeString(raw);
  return normalized !== null && HHMM_REGEX.test(normalized);
}

export function timeStringToMinutes(raw: string): number | null {
  const normalized = normalizeTimeString(raw);
  if (!normalized || !HHMM_REGEX.test(normalized)) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

export function minutesToDecimalHours(totalMinutes: number): number {
  return Number((totalMinutes / 60).toFixed(2));
}

function diffInMinutes(start: string, end: string): number {
  const startMinutes = timeStringToMinutes(start);
  const endMinutes = timeStringToMinutes(end);
  if (startMinutes === null || endMinutes === null) {
    return 0;
  }
  if (endMinutes < startMinutes) {
    // Turno que cruza meia-noite: ex. 23:00–02:00 = (1440 - 23*60) + 2*60
    return 1440 - startMinutes + endMinutes;
  }
  return endMinutes - startMinutes;
}

const NIGHT_START = 22 * 60; // 22:00 em minutos
const NIGHT_END = 6 * 60;    // 06:00 em minutos

/**
 * Minutos noturnos (22:00–06:00) de um único par entrada/saída.
 * Trata corretamente turnos que cruzam meia-noite (exit < entry).
 */
export function nightWorkedMinutesForSegment(entry: string, exit: string): number {
  const start = timeStringToMinutes(entry);
  const end = timeStringToMinutes(exit);
  if (start === null || end === null) return 0;

  // Sobreposição de [a, b) com a janela noturna [22:00, 24:00) ∪ [00:00, 06:00)
  function overlapWithNight(a: number, b: number): number {
    if (a >= b) return 0;
    // Faixa [22:00, 24:00)
    const overlapEvening = Math.max(0, Math.min(b, 1440) - Math.max(a, NIGHT_START));
    // Faixa [00:00, 06:00)
    const overlapMorning = Math.max(0, Math.min(b, NIGHT_END) - Math.max(a, 0));
    return overlapEvening + overlapMorning;
  }

  if (end >= start) {
    // Turno dentro do mesmo dia civil
    return overlapWithNight(start, end);
  } else {
    // Turno que cruza meia-noite: [start, 24:00) ∪ [00:00, end)
    return overlapWithNight(start, 1440) + overlapWithNight(0, end);
  }
}

type WorkedFieldsForNight = Pick<Parameters<typeof calculateWorkedMinutes>[0],
  "entry1" | "exit1" | "entry2" | "exit2" | "extraEntry" | "extraExit">;

export function calculateNightWorkedMinutes(row: WorkedFieldsForNight): number {
  return (
    nightWorkedMinutesForSegment(row.entry1 ?? "", row.exit1 ?? "") +
    nightWorkedMinutesForSegment(row.entry2 ?? "", row.exit2 ?? "") +
    nightWorkedMinutesForSegment(row.extraEntry ?? "", row.extraExit ?? "")
  );
}

type WorkedFields = Pick<TimecardRow, "entry1" | "exit1" | "entry2" | "exit2" | "extraEntry" | "extraExit">;

export function calculateWorkedMinutes(row: WorkedFields): number {
  const morningShift = diffInMinutes(row.entry1, row.exit1);
  const afternoonShift = diffInMinutes(row.entry2, row.exit2);
  const extraShift = diffInMinutes(row.extraEntry, row.extraExit);
  return morningShift + afternoonShift + extraShift;
}

export function summarizeWorkedTime(row: WorkedFields): WorkedTimeSummary {
  const minutes = calculateWorkedMinutes(row);
  return {
    minutes,
    hhmm: minutesToTimeString(minutes),
    decimalHours: minutesToDecimalHours(minutes),
  };
}

export function calculateMonthlySummary(rows: TimecardRow[]): WorkedTimeSummary {
  const minutes = rows.reduce((accumulator, row) => {
    return accumulator + calculateWorkedMinutes(row);
  }, 0);

  return {
    minutes,
    hhmm: minutesToTimeString(minutes),
    decimalHours: minutesToDecimalHours(minutes),
  };
}
