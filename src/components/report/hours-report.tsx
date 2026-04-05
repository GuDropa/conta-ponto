"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Pencil, Share2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useBeforeUnloadWhen } from "@/hooks/use-before-unload-warning";
import { TIMECARD_STORAGE_KEY } from "@/lib/timecard-defaults";
import {
  calculateMonthlySummary,
  summarizeWorkedTime,
} from "@/lib/time-utils";
import type { TimecardRow } from "@/types/timecard";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatEmissionDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} as ${hours}:${minutes}`;
}

export function HoursReport() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<TimecardRow[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(TIMECARD_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TimecardRow[];
        if (Array.isArray(parsed)) setRows(parsed);
      } catch {
        /* empty */
      }
    }
  }, []);

  const monthlySummary = useMemo(() => calculateMonthlySummary(rows), [rows]);

  const workedDays = useMemo(
    () =>
      rows
        .map((row) => ({ row, summary: summarizeWorkedTime(row) }))
        .filter(({ summary }) => summary.minutes > 0),
    [rows],
  );

  useBeforeUnloadWhen(
    isGenerating ||
      (!submitted &&
        (employeeName.trim().length > 0 || workedDays.length > 0)),
  );

  const emissionDate = useMemo(() => formatEmissionDate(new Date()), []);

  const canSubmit = employeeName.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) setSubmitted(true);
  }

  async function generateImage() {
    if (!reportRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });

      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File(
          [blob],
          `relatorio-horas-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.png`,
          { type: "image/png" },
        );

        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      const link = document.createElement("a");
      link.download = `relatorio-horas-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      /* user cancelled share or error */
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadImage() {
    if (!reportRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `relatorio-horas-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      /* error generating */
    } finally {
      setIsGenerating(false);
    }
  }

  function downloadCsv() {
    const header = "Dia;Entrada 1;Saida 1;Entrada 2;Saida 2;Entrada Extra;Saida Extra;Horas Trabalhadas";
    const lines = workedDays.map(({ row, summary }) =>
      [
        row.dayLabel,
        row.entry1,
        row.exit1,
        row.entry2,
        row.exit2,
        row.extraEntry,
        row.extraExit,
        summary.hhmm,
      ].join(";"),
    );

    const footer = [
      "",
      `Total de Horas;${monthlySummary.hhmm}`,
      `Dias Trabalhados;${workedDays.length}`,
      `Colaborador;${employeeName}`,
      `Periodo;${MONTHS[selectedMonth]} de ${selectedYear}`,
    ];

    const bom = "\uFEFF";
    const csv = bom + [header, ...lines, ...footer].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-horas-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!submitted) {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Preencha os dados abaixo para gerar o relatorio oficial de horas.
        </p>

        <label className="block text-sm font-medium text-foreground">
          Nome do colaborador
          <input
            type="text"
            required
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Digite o nome completo"
            className="mt-1 block w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/50 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-foreground">
            Mes
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground focus:border-ring focus:ring-2 focus:ring-ring/50 focus:outline-none"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-foreground">
            Ano
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground focus:border-ring focus:ring-2 focus:ring-ring/50 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
        >
          <FileText className="size-5" />
          Gerar relatorio
        </Button>

        <Link href="/" className="block">
          <Button type="button" variant="outline" size="lg" className="w-full">
            <ArrowLeft className="size-5" />
            Voltar
          </Button>
        </Link>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2.5">
        <div className="text-sm">
          <p className="font-medium">{employeeName}</p>
          <p className="text-muted-foreground">
            {MONTHS[selectedMonth]} de {selectedYear}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSubmitted(false)}
        >
          <Pencil className="size-4" />
          Editar
        </Button>
      </div>

      {/* ---- REPORT DOCUMENT ---- */}
      <div
        ref={reportRef}
        className="overflow-hidden rounded-xl border bg-white shadow-sm"
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: "#233a95" }}
        >
          <div>
            <p
              className="text-lg font-bold tracking-tight"
              style={{ color: "#ffffff" }}
            >
              Supermercado Unimax
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              Guarapuava — PR
            </p>
          </div>
          <div
            className="rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: "#f58634", color: "#ffffff" }}
          >
            OFICIAL
          </div>
        </div>

        {/* Title */}
        <div className="border-b px-5 py-4">
          <h2
            className="text-base font-bold"
            style={{ color: "#233a95" }}
          >
            Relatorio de Horas Trabalhadas
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "#666" }}>
            {MONTHS[selectedMonth]} de {selectedYear}
          </p>
        </div>

        {/* Employee info */}
        <div className="border-b px-5 py-3">
          <p className="text-xs" style={{ color: "#999" }}>
            Colaborador
          </p>
          <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
            {employeeName}
          </p>
        </div>

        {/* Summary */}
        <div className="border-b px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "#233a95" }}
            >
              <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                Total de Horas
              </p>
              <p
                className="text-xl font-bold tabular-nums"
                style={{ color: "#ffffff" }}
              >
                {monthlySummary.hhmm}
              </p>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "#f58634" }}
            >
              <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                Dias Trabalhados
              </p>
              <p
                className="text-xl font-bold tabular-nums"
                style={{ color: "#ffffff" }}
              >
                {workedDays.length}
              </p>
            </div>
          </div>
        </div>

        {/* Daily breakdown */}
        {workedDays.length > 0 && (
          <div className="border-b px-5 py-3">
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#999" }}
            >
              Detalhamento diario
            </p>
            <div className="divide-y" style={{ borderColor: "#f0f0f0" }}>
              <div className="grid grid-cols-[2.5rem_1fr] py-1.5 text-xs font-medium" style={{ color: "#999" }}>
                <span>Dia</span>
                <span className="text-right">Horas</span>
              </div>
              {workedDays.map(({ row, summary }) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[2.5rem_1fr] py-1.5 text-sm"
                  style={{ color: "#1a1a1a" }}
                >
                  <span className="font-medium tabular-nums">
                    {row.dayLabel}
                  </span>
                  <span className="text-right tabular-nums">
                    {summary.hhmm}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: "#999" }}>
                Emitido em
              </p>
              <p className="text-xs font-medium" style={{ color: "#666" }}>
                {emissionDate}
              </p>
            </div>
            <p className="text-xs font-medium" style={{ color: "#999" }}>
              Conta Ponto — Unimax
            </p>
          </div>

          <div className="mt-6 border-t pt-15" style={{ borderColor: "#e5e5e5" }}>
            <div
              className="mx-auto w-48 border-t pt-2 text-center"
              style={{ borderColor: "#1a1a1a" }}
            >
              <p className="text-xs" style={{ color: "#666" }}>
                {employeeName}
              </p>
              <p className="text-xs" style={{ color: "#999" }}>
                Assinatura do colaborador
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={generateImage}
          disabled={isGenerating || workedDays.length === 0}
        >
          <Share2 className="size-5" />
          Compartilhar
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={downloadImage}
          disabled={isGenerating || workedDays.length === 0}
        >
          <Download className="size-5" />
          Salvar imagem
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="col-span-2 w-full"
          onClick={downloadCsv}
          disabled={workedDays.length === 0}
        >
          <FileSpreadsheet className="size-5" />
          Exportar CSV
        </Button>
      </div>

      <Link href="/" className="block">
        <Button variant="outline" size="lg" className="w-full">
          <ArrowLeft className="size-5" />
          Voltar
        </Button>
      </Link>
    </div>
  );
}
