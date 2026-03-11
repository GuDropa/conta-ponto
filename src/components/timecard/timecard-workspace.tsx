"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/camera/camera-capture";
import { TimecardGrid } from "@/components/timecard/timecard-grid";
import { TIMECARD_STORAGE_KEY, createDefaultRows } from "@/lib/timecard-defaults";
import { calculateMonthlySummary } from "@/lib/time-utils";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import type { TimecardRow } from "@/types/timecard";

export function TimecardWorkspace() {
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
    <div className="space-y-4">
      <CameraCapture onDetectedTimes={applyDetectedTimes} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Horas do mês</h2>
        <Button variant="outline" size="sm" onClick={clearHours}>
          <Trash2 className="size-3.5" />
          Limpar horas
        </Button>
      </div>

      <TimecardGrid rows={rows} monthlySummary={monthlySummary} />
    </div>
  );
}
