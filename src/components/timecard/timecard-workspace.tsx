"use client";

import { useState } from "react";
import { Camera, History } from "lucide-react";

import { CameraCapture } from "@/components/camera/camera-capture";
import { CsvHistoryPanel } from "@/components/history/csv-history-panel";
import { cn } from "@/lib/utils";

type WorkspaceTab = "import" | "history";

export function TimecardWorkspace() {
  const [tab, setTab] = useState<WorkspaceTab>("import");
  const [historyVersion, setHistoryVersion] = useState(0);

  function bumpHistory() {
    setHistoryVersion((v) => v + 1);
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
          id="tab-import"
          aria-selected={tab === "import"}
          aria-controls="panel-import"
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
          id="tab-history"
          aria-selected={tab === "history"}
          aria-controls="panel-history"
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            tab === "history"
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("history")}
        >
          <History className="size-4 shrink-0 opacity-80" />
          Histórico
        </button>
      </div>

      <div
        id="panel-import"
        role="tabpanel"
        aria-labelledby="tab-import"
        aria-hidden={tab !== "import"}
        hidden={tab !== "import"}
        className={cn(tab !== "import" && "hidden")}
      >
        <CameraCapture onHistoryUpdated={bumpHistory} />
      </div>

      <div
        id="panel-history"
        role="tabpanel"
        aria-labelledby="tab-history"
        aria-hidden={tab !== "history"}
        hidden={tab !== "history"}
        className={cn(tab !== "history" && "hidden")}
      >
        <CsvHistoryPanel historyVersion={historyVersion} />
      </div>
    </div>
  );
}
