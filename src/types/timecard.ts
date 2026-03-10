export type TimeField =
  | "entry1"
  | "exit1"
  | "entry2"
  | "exit2"
  | "extraEntry"
  | "extraExit";

export type TimecardRow = {
  id: string;
  dayLabel: string;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  extraEntry: string;
  extraExit: string;
};

export type WorkedTimeSummary = {
  minutes: number;
  hhmm: string;
  decimalHours: number;
};
