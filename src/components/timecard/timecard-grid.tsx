"use client";

import { summarizeWorkedTime } from "@/lib/time-utils";
import type { TimecardRow, WorkedTimeSummary } from "@/types/timecard";

type TimecardGridProps = {
  rows: TimecardRow[];
  monthlySummary: WorkedTimeSummary;
};

export function TimecardGrid({ rows, monthlySummary }: TimecardGridProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-unimax-blue p-4 text-white shadow-sm">
        <p className="text-sm font-medium text-white/70">
          Total mensal
        </p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {monthlySummary.hhmm}
        </p>
      </div>

      <div className="divide-y rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-[3rem_1fr] px-3 py-2.5 text-sm font-medium text-muted-foreground">
          <span>Dia</span>
          <span className="text-right">Horas</span>
        </div>

        {rows.map((row) => {
          const summary = summarizeWorkedTime(row);
          const hasData = summary.hhmm !== "00:00";

          return (
            <div
              key={row.id}
              className={`grid grid-cols-[3rem_1fr] px-3 py-3 text-base ${
                hasData ? "text-foreground" : "text-muted-foreground/50"
              }`}
            >
              <span className="font-medium tabular-nums">{row.dayLabel}</span>
              <span className="text-right tabular-nums">{summary.hhmm}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
