"use client";

import { useEffect } from "react";

/**
 * Ao fechar ou recarregar a aba/janela, o navegador pode mostrar um aviso nativo.
 * Em muitos celulares (Safari iOS, Chrome Android) isso é ignorado ou não aparece.
 * Para não perder fotos, use persistência (ex.: IndexedDB) além deste hook.
 */
export function useBeforeUnloadWhen(when: boolean) {
  useEffect(() => {
    if (!when || typeof window === "undefined") return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);
}
