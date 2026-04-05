const DB_NAME = "conta-ponto-camera";
const DB_VERSION = 1;
const STORE = "draft";
const KEY = "v1";

/** ~45MB — evita falha silenciosa em aparelhos com pouco espaço */
const MAX_DRAFT_BYTES = 45 * 1024 * 1024;

type DraftRow = {
  savedAt: number;
  items: Array<{
    name: string;
    type: string;
    lastModified: number;
    buffer: ArrayBuffer;
  }>;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

/**
 * Grava cópia das fotos pendentes (ordem preservada).
 * No celular, isso sobrevive a recarregar a página — ao contrário de beforeunload.
 */
export async function saveCameraDraft(files: File[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    if (files.length === 0) {
      await clearCameraDraft();
      return;
    }

    const items: DraftRow["items"] = [];
    let totalBytes = 0;
    for (const f of files) {
      const buffer = await f.arrayBuffer();
      totalBytes += buffer.byteLength;
      items.push({
        name: f.name,
        type: f.type || "image/jpeg",
        lastModified: f.lastModified,
        buffer,
      });
    }

    if (totalBytes > MAX_DRAFT_BYTES) {
      console.warn(
        "[camera-draft] Rascunho muito grande; não salvo no armazenamento local.",
      );
      return;
    }

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
      tx.objectStore(STORE).put(
        { savedAt: Date.now(), items } satisfies DraftRow,
        KEY,
      );
    });
    db.close();
  } catch (e) {
    console.warn("[camera-draft] Falha ao salvar", e);
  }
}

export async function loadCameraDraft(): Promise<File[] | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const row = await new Promise<DraftRow | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(r.result as DraftRow | undefined);
      r.onerror = () => reject(r.error ?? new Error("IDB read failed"));
    });
    db.close();

    if (!row?.items?.length) return null;

    return row.items.map(
      (it) =>
        new File([it.buffer], it.name, {
          type: it.type,
          lastModified: it.lastModified,
        }),
    );
  } catch {
    return null;
  }
}

export async function clearCameraDraft(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
      tx.objectStore(STORE).delete(KEY);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
