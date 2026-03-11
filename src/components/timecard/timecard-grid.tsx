"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { summarizeWorkedTime } from "@/lib/time-utils";
import type { TimecardRow, WorkedTimeSummary } from "@/types/timecard";

type TimecardGridProps = {
  rows: TimecardRow[];
  monthlySummary: WorkedTimeSummary;
};

const PUNCH_LABELS: { key: keyof Omit<TimecardRow, "id" | "dayLabel">; label: string }[] = [
  { key: "entry1", label: "E1" },
  { key: "exit1", label: "S1" },
  { key: "entry2", label: "E2" },
  { key: "exit2", label: "S2" },
  { key: "extraEntry", label: "E+" },
  { key: "extraExit", label: "S+" },
];

function formatPunches(row: TimecardRow): { label: string; value: string }[] {
  return PUNCH_LABELS.map(({ key, label }) => ({ label, value: row[key] })).filter(
    (p) => p.value.trim() !== "",
  );
}

export function TimecardGrid({ rows, monthlySummary }: TimecardGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

      
      <Link href="/relatorio" className="block">
        <Button size="lg" className="w-full bg-unimax-orange text-white hover:bg-unimax-orange/90">
          <FileSpreadsheet className="size-5" />
          Emitir relatório de horas
        </Button>
      </Link>

      <div className="divide-y rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-[3rem_1fr_2.25rem] px-3 py-2.5 text-sm font-medium text-muted-foreground">
          <span>Dia</span>
          <span className="text-right">Horas</span>
          <span aria-hidden />
        </div>

        {rows.map((row) => {
          const summary = summarizeWorkedTime(row);
          const hasData = summary.hhmm !== "00:00";
          const punches = formatPunches(row);
          const isExpanded = expandedId === row.id;

          return (
            <div key={row.id} className="divide-y divide-border/50">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : row.id)}
                className={`grid w-full grid-cols-[3rem_1fr_2.25rem] items-center gap-2 px-3 py-3 text-left text-base transition-colors hover:bg-muted/50 ${
                  hasData ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                <span className="font-medium tabular-nums">{row.dayLabel}</span>
                <span className="text-right tabular-nums">{summary.hhmm}</span>
                <span className="flex items-center justify-center text-muted-foreground">
                  {punches.length > 0 ? (
                    isExpanded ? (
                      <ChevronDown className="size-5" />
                    ) : (
                      <ChevronRight className="size-5" />
                    )
                  ) : null}
                </span>
              </button>
              {isExpanded && punches.length > 0 && (
                <div className="bg-muted/30 px-3 py-2.5 text-sm">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pontos
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                    {punches.map(({ label, value }) => (
                      <span key={label} className="text-foreground">
                        <span className="text-muted-foreground">{label}</span> {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
