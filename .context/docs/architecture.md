---
type: doc
name: architecture
description: System architecture, layers, patterns, and design decisions
category: architecture
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Architecture Notes

Conta Ponto is a **Next.js 16 App Router** app: UI runs in the browser (mobile-first), OCR runs on the **server** so API keys never ship to clients. Client sends image pairs to `POST /api/ocr`; server runs a **pluggable vision chain** (Gemini primary, Anthropic optional) and returns structured day/time detections. CSV build, history, and camera draft persistence are split between **server parsing** (route) and **client orchestration** (`gemini-ocr-client`, storage libs).

## System Architecture Overview

**Topology:** single deployable **monolith** (Vercel-friendly). **Request path:** `CameraCapture` / workspace → `fetch("/api/ocr")` with `FormData` → `src/app/api/ocr/route.ts` → `buildDefaultOcrChain` + `runVisionOcrChain` → provider(s) → JSON parse → normalized detections in response. **Control pivot:** UI owns UX and batching; API owns prompts, env keys, and model calls. **Long jobs:** `maxDuration = 300` on OCR route for large batches.

## Architectural Layers

| Layer | Purpose | Key locations |
|-------|---------|---------------|
| **App / routes** | Pages, metadata, API | `src/app/page.tsx`, `src/app/relatorio/page.tsx`, `src/app/api/ocr/route.ts` |
| **UI components** | Timecard grid, camera, history, report | `src/components/timecard/`, `camera/`, `history/`, `report/`, `ui/` |
| **Client OCR orchestration** | Compress images, chunk pairs, call API, CSV download | `src/lib/gemini-ocr-client.ts` |
| **Domain / HR reporting** | Batch report, CSV (`;`, UTF-8 BOM), day filter | `src/lib/hr-batch-report.ts` |
| **Vision providers** | Chain, Gemini, Anthropic, types | `src/lib/ocr-providers/` |
| **Legacy / auxiliary OCR** | Tesseract pipeline (template path) | `src/lib/timecard-template-ocr.ts`, `ocr-timecard-parser.ts` |
| **Persistence (client)** | CSV history (localStorage), camera draft (IndexedDB) | `src/lib/csv-history-storage.ts`, `camera-draft-idb.ts` |
| **Time / period** | Reading period, mapping detections to month | `src/lib/reading-period-map.ts`, `time-utils.ts` |
| **Types** | Timecard row shapes | `src/types/timecard.ts` |

> Refresh semantic map: DotContext `context({ action: "getMap", section: "all", repoPath: "<repo>" })`.

## Detected Design Patterns

| Pattern | Confidence | Locations | Description |
|---------|------------|-----------|-------------|
| **Provider chain / strategy** | High | `ocr-providers/chain.ts`, `types.ts` | Vision backends swappable; `runVisionOcrChain` tries chain order |
| **Route handler as adapter** | High | `api/ocr/route.ts` | HTTP + multipart in; typed JSON out; prompt co-located |
| **Thin page, fat workspace** | Medium | `page.tsx`, `timecard-workspace.tsx` | Home delegates to workspace component |
| **Client-side persistence adapters** | High | `csv-history-storage.ts`, `camera-draft-idb.ts` | Pluggable storage behind small API |

## Entry Points

- [App home (timecard workspace)](../../src/app/page.tsx)
- [Relatório page](../../src/app/relatorio/page.tsx)
- [OCR API POST](../../src/app/api/ocr/route.ts)
- [Manifest / PWA](../../src/app/manifest.ts)

## Public API (selected exports)

| Symbol | Kind | Location |
|--------|------|----------|
| `POST` (OCR) | route handler | `src/app/api/ocr/route.ts` |
| `recognizeTimecardPairWithGemini`, `recognizeTimecardBatchWithGemini`, `chunkFilesIntoPairs`, `downloadHrReportCsv` | functions | `src/lib/gemini-ocr-client.ts` |
| `buildHrBatchReport`, `buildHrReportCsv`, `batchReportToJson` | functions | `src/lib/hr-batch-report.ts` |
| `buildDefaultOcrChain`, `runVisionOcrChain` | functions | `src/lib/ocr-providers/chain.ts` |
| `loadHistory`, `appendEntry`, `clearHistory` | functions | `src/lib/csv-history-storage.ts` |
| `TimecardWorkspace`, `CameraCapture`, `CsvHistoryPanel`, `HoursReport` | components | under `src/components/` |

## Internal System Boundaries

- **Browser vs server:** only server reads `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`. Client never imports provider SDKs for production OCR path (uses fetch).
- **OCR JSON contract:** API prompt defines `employeeName` + `days[]` with `entry1`/`exit1`/… ; route parses and maps to internal detection types.
- **CSV vs UI state:** grid/workspace state is separate from HR CSV pipeline; history stores export metadata for re-download.

## External Service Dependencies

- **Google Gemini** (vision): primary OCR; configured via env on server.
- **Anthropic** (optional): second provider in chain when key present.
- **Vercel** (typical): serverless limits; `maxDuration` raised for batch OCR.

## Key Decisions & Trade-offs

- **Server-side OCR:** security (keys) + consistent model; cost/latency on server acceptable for HR batch use.
- **Image compression client-side** (`gemini-ocr-client.ts`): reduces payload before upload.
- **Pair ordering:** implicit `[0,1], [2,3], …` — UX contract documented for RH.

## Top Directories Snapshot

- `src/app/` — routes, layout, API (~5–6 TS/TSX)
- `src/components/` — UI by feature (~15+ files)
- `src/lib/` — business logic, OCR, storage (~20 files)
- `src/types/` — shared types (small)
- `docs/` — RH-facing `DOCUMENTACAO.md`
- `public/` — assets (e.g. Unimax logo)

## Related Resources

- [Project overview](./project-overview.md)
- [Security](./security.md)
- [Human manual](../../docs/DOCUMENTACAO.md)
