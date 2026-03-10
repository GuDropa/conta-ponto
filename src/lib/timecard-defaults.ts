import type { TimecardRow } from "@/types/timecard";

export const TIMECARD_STORAGE_KEY = "conta-ponto.timecard.rows.v1";

export function createDefaultRows(totalDays = 31): TimecardRow[] {
  return Array.from({ length: totalDays }, (_, index) => ({
    id: `day-${index + 1}`,
    dayLabel: String(index + 1).padStart(2, "0"),
    entry1: "",
    exit1: "",
    entry2: "",
    exit2: "",
    extraEntry: "",
    extraExit: "",
  }));
}
