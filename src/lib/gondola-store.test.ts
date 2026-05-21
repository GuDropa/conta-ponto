/** T30 — V3, V4. Store check-gondolas. */
import { beforeEach, describe, expect, it } from "vitest";
import {
  selectFound,
  selectMissing,
  useGondolaStore,
} from "./gondola-store";

beforeEach(() => {
  useGondolaStore.getState().resetSession();
});

describe("useGondolaStore", () => {
  it("V3 — dedup: bipar duas vezes conta como 1", () => {
    useGondolaStore.getState().loadErpList([
      { barcode: "123", description: "A" },
    ]);
    useGondolaStore.getState().scanBarcode("123");
    useGondolaStore.getState().scanBarcode("123");
    expect(useGondolaStore.getState().scannedCodes).toEqual(["123"]);
  });

  it("V4 — bipado fora da lista vai para unknownCodes (não silencia)", () => {
    useGondolaStore.getState().loadErpList([
      { barcode: "111", description: "A" },
    ]);
    useGondolaStore.getState().scanBarcode("999");
    expect(useGondolaStore.getState().scannedCodes).toEqual([]);
    expect(useGondolaStore.getState().unknownCodes).toEqual(["999"]);
  });

  it("selectFound = bipados ∩ lista; selectMissing = lista \\ bipados", () => {
    useGondolaStore.getState().loadErpList([
      { barcode: "1", description: "A" },
      { barcode: "2", description: "B" },
      { barcode: "3", description: "C" },
    ]);
    useGondolaStore.getState().scanBarcode("1");
    useGondolaStore.getState().scanBarcode("3");
    useGondolaStore.getState().scanBarcode("999"); // fora
    const s = useGondolaStore.getState();
    expect(selectFound(s).map((p) => p.barcode)).toEqual(["1", "3"]);
    expect(selectMissing(s).map((p) => p.barcode)).toEqual(["2"]);
    expect(s.unknownCodes).toEqual(["999"]);
  });

  it("ignora código vazio", () => {
    useGondolaStore.getState().loadErpList([{ barcode: "1", description: "A" }]);
    useGondolaStore.getState().scanBarcode("   ");
    expect(useGondolaStore.getState().scannedCodes).toEqual([]);
  });
});
