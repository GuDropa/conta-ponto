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
  if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
    return 0;
  }
  return endMinutes - startMinutes;
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
