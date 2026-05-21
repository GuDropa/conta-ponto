/**
 * gondola-store — estado volátil da sessão check-gondolas.
 * V3: dedup — Set<string> garante unicidade por código.
 * V6: sem persistência — não usa persist middleware.
 */
import { create } from "zustand";

export interface ErpProduct {
  barcode: string;
  description: string;
}

type SessionStatus = "idle" | "ready" | "scanning" | "done";

interface GondolaState {
  /** Lista importada do ERP */
  erpList: ErpProduct[];
  /** Barcodes bipados (V3 — dedup via Set serializado como Array para Zustand) */
  scannedCodes: string[];
  /** Barcodes bipados que NÃO estão na lista ERP */
  unknownCodes: string[];
  status: SessionStatus;

  // actions
  loadErpList: (products: ErpProduct[]) => void;
  scanBarcode: (code: string) => void;
  finishSession: () => void;
  resetSession: () => void;
}

export const useGondolaStore = create<GondolaState>()((set, get) => ({
  erpList: [],
  scannedCodes: [],
  unknownCodes: [],
  status: "idle",

  loadErpList: (products) =>
    set({ erpList: products, scannedCodes: [], unknownCodes: [], status: "ready" }),

  scanBarcode: (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const { erpList, scannedCodes, unknownCodes } = get();

    // V3 — dedup: ignora se já foi bipado
    if (scannedCodes.includes(trimmed)) return;

    const inList = erpList.some((p) => p.barcode === trimmed);

    if (inList) {
      set({ scannedCodes: [...scannedCodes, trimmed] });
    } else {
      // V4 — fora da lista: registra separadamente, não silencia
      if (!unknownCodes.includes(trimmed)) {
        set({ unknownCodes: [...unknownCodes, trimmed] });
      }
    }
  },

  finishSession: () => set({ status: "done" }),

  resetSession: () =>
    set({ erpList: [], scannedCodes: [], unknownCodes: [], status: "idle" }),
}));

// ── Selectors ──────────────────────────────────────────────────────────────

/** Produtos da lista ERP que foram bipados. */
export function selectFound(state: GondolaState): ErpProduct[] {
  const set = new Set(state.scannedCodes);
  return state.erpList.filter((p) => set.has(p.barcode));
}

/** Produtos da lista ERP que NÃO foram bipados. */
export function selectMissing(state: GondolaState): ErpProduct[] {
  const set = new Set(state.scannedCodes);
  return state.erpList.filter((p) => !set.has(p.barcode));
}
