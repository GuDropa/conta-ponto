"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Table2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/camera/camera-capture";
import { TimecardGrid } from "@/components/timecard/timecard-grid";
import { TIMECARD_STORAGE_KEY, createDefaultRows } from "@/lib/timecard-defaults";
import { calculateMonthlySummary } from "@/lib/time-utils";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import type { TimecardRow } from "@/types/timecard";
import { cn } from "@/lib/utils";

type WorkspaceTab = "import" | "month";

export function TimecardWorkspace() {
  const [tab, setTab] = useState<WorkspaceTab>("import");
  const [rows, setRows] = useState<TimecardRow[]>(() => {
    if (typeof window === "undefined") {
      return createDefaultRows();
    }

    const fromStorage = window.localStorage.getItem(TIMECARD_STORAGE_KEY);
    if (!fromStorage) {
      return createDefaultRows();
    }

    try {
      const parsed = JSON.parse(fromStorage) as TimecardRow[];
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : createDefaultRows();
    } catch {
      return createDefaultRows();
    }
  });

  useEffect(() => {
    if (rows.length > 0) {
      window.localStorage.setItem(TIMECARD_STORAGE_KEY, JSON.stringify(rows));
    }
  }, [rows]);

  const monthlySummary = useMemo(() => calculateMonthlySummary(rows), [rows]);

  function applyDetectedTimes(detectedRows: DetectedDayTimes[]) {
    if (detectedRows.length === 0) {
      return;
    }

    setRows((current) =>
      current.map((row) => {
        const day = Number(row.dayLabel);
        const match = detectedRows.find((item) => item.day === day);
        if (!match) {
          return row;
        }

        return {
          ...row,
          ...match.values,
        };
      }),
    );
  }

  function clearHours() {
    window.localStorage.removeItem(TIMECARD_STORAGE_KEY);
    setRows(createDefaultRows());
  }

  return (
    <div className="space-y-5">
      <div
        className="flex rounded-xl border border-border/70 bg-muted/45 p-1 shadow-sm"
        role="tablist"
        aria-label="Áreas do Conta Ponto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "import"}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            tab === "import"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("import")}
        >
          <Camera className="size-4 shrink-0 opacity-80" />
          Importar cartões
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "month"}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            tab === "month"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("month")}
        >
          <Table2 className="size-4 shrink-0 opacity-80" />
          Quadro do mês
        </button>
      </div>

      {tab === "import" && (
        <div className="space-y-2">
          <CameraCapture onDetectedTimes={applyDetectedTimes} />
        </div>
      )}

      {tab === "month" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ajuste manual dos horários ou revise o que foi lido de{" "}
            <strong className="font-medium text-foreground">um único cartão</strong>{" "}
            (1 par de fotos). Importações com vários funcionários geram apenas o
            CSV na aba anterior.
          </p>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Horas do mês</h2>
            <Button variant="outline" size="sm" onClick={clearHours}>
              <Trash2 className="size-3.5" />
              Limpar horas
            </Button>
          </div>

          <TimecardGrid rows={rows} monthlySummary={monthlySummary} />
        </div>
      )}
    </div>
  );
}
