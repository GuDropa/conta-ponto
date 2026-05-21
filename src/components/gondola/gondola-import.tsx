"use client";

/**
 * GondolaImport — upload + parse planilha ERP. Mobile-first.
 * V2: valida existência de coluna barcode. Bloqueia e exibe erro claro se ausente.
 * Aceita .xlsx e .csv. Sem drag-drop (mobile não tem mouse).
 */
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet, RefreshCw } from "lucide-react";
import type { ErpProduct } from "@/lib/gondola-store";

const BARCODE_KEYS = [
  "codigo_barras",
  "cod_barras",
  "barcode",
  "ean",
  "codigo",
  "código",
  "cod",
  "gtin",
];

const DESC_KEYS = [
  "descricao",
  "descrição",
  "description",
  "produto",
  "nome",
  "name",
];

function normalize(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    if (candidates.includes(normalize(h))) return h;
  }
  return null;
}

interface Props {
  onLoad: (products: ErpProduct[]) => void;
}

export function GondolaImport({ onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setLoaded(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        if (rows.length === 0) {
          setError("Planilha vazia. Nenhum produto encontrado.");
          return;
        }

        const headers = Object.keys(rows[0]);
        const barcodeCol = findColumn(headers, BARCODE_KEYS);

        // V2 — coluna de barcode obrigatória
        if (!barcodeCol) {
          setError(
            `Coluna de código de barras não encontrada.\n` +
              `Aceitas: ${BARCODE_KEYS.join(", ")}.\n` +
              `Na planilha: ${headers.join(", ")}.`,
          );
          return;
        }

        const descCol = findColumn(headers, DESC_KEYS);
        const products: ErpProduct[] = rows
          .map((row) => ({
            barcode: String(row[barcodeCol]).trim(),
            description: descCol ? String(row[descCol]).trim() : "—",
          }))
          .filter((p) => p.barcode !== "" && p.barcode !== "undefined");

        if (products.length === 0) {
          setError("Nenhum produto com código de barras válido encontrado.");
          return;
        }

        setLoaded(products.length);
        onLoad(products);
      } catch {
        setError("Erro ao ler o arquivo. Verifique se é um .xlsx ou .csv válido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function openPicker() {
    // reset o input para permitir selecionar o mesmo arquivo de novo
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  // ── Sucesso ──────────────────────────────────────────────────────────────
  if (loaded !== null && !error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-green-300 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="font-bold text-green-700 dark:text-green-300">
              Planilha carregada!
            </p>
            <p className="mt-0.5 text-sm text-green-600 dark:text-green-400">
              {loaded} produto{loaded !== 1 ? "s" : ""} importado{loaded !== 1 ? "s" : ""}
            </p>
            {fileName && (
              <p className="mt-0.5 truncate text-xs text-green-500 dark:text-green-500">
                {fileName}
              </p>
            )}
          </div>
        </div>

        {/* Opção de trocar a planilha */}
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Trocar planilha
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // ── Estado inicial / erro ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Botão principal — toque para selecionar */}
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 active:bg-muted"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-sm">
          <FileSpreadsheet className="h-8 w-8 text-unimax-blue" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-base font-bold text-foreground">
            Toque para selecionar a planilha
          </p>
          <p className="text-sm text-muted-foreground">
            Formatos aceitos: <strong>.xlsx</strong> e <strong>.csv</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            A planilha deve conter coluna de código de barras
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-unimax-blue px-6 py-3 text-sm font-bold text-white">
          <Upload className="h-4 w-4" />
          Selecionar arquivo
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Erro — V2 */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <pre className="whitespace-pre-wrap text-sm text-destructive">{error}</pre>
        </div>
      )}
    </div>
  );
}
