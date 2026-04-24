---
type: doc
name: glossary
description: Project terminology, type definitions, domain entities, and business rules
category: glossary
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Glossary & Domain Concepts

**Conta Ponto:** internal Unimax tool for **conferência** of mechanical timecards (Evo Ponto Fácil style), not a legal payroll system.

**Par (pair):** two images — **frente** then **verso** — same employee. Order in list = grouping rule.

**Intervalo no CSV:** day range1–31 filter for export; does not re-run OCR.

**Histórico:** past CSV exports metadata + re-download without reprocessing images.

**Rascunho / draft:** pending photos in **IndexedDB** so refresh does not lose work.

## Type Definitions (exported)

| Name | Location |
|------|----------|
| `TimeField`, `TimecardRow`, `WorkedTimeSummary` | [`src/types/timecard.ts`](../../src/types/timecard.ts) |
| `ReadingPeriod`, `MappedDetections`, `PeriodMapStats` | [`src/lib/reading-period-map.ts`](../../src/lib/reading-period-map.ts) |
| `DetectedDayTimes`, `OcrWord`, … | [`src/lib/ocr-timecard-parser.ts`](../../src/lib/ocr-timecard-parser.ts) |
| `HrBatchReport`, `HrBatchEmployeeResult`, `BuildHrReportCsvOptions` | [`src/lib/hr-batch-report.ts`](../../src/lib/hr-batch-report.ts) |
| `CsvHistoryEntry` | [`src/lib/csv-history-storage.ts`](../../src/lib/csv-history-storage.ts) |
| `VisionImagePart`, `VisionOcrProvider` | [`src/lib/ocr-providers/types.ts`](../../src/lib/ocr-providers/types.ts) |

## Enumerations

No shared `enum` blocks in core types; day fields use numeric1–31 and time strings `HH:MM`.

## Core Terms

- **entry1 / exit1:** morning period stamps (API JSON contract).
- **entry2 / exit2:** afternoon after break.
- **extraEntry / extraExit:** overtime columns.
- **detections:** parsed per-day time maps after OCR normalization.
- **chunkFilesIntoPairs:** splits file list `[0,1],[2,3],…`.

## Acronyms & Abbreviations

| Term | Meaning |
|------|---------|
| OCR | Optical character recognition (here: vision LLM + optional classic pipeline) |
| RH | Recursos humanos (HR) |
| CSV | Export format; `;` separator, UTF-8 BOM for Excel |
| IDB | IndexedDB (`camera-draft-idb.ts`) |

## Personas / Actors

- **RH operator:** photographs cards in sequence, checks preview pairs, sets interval, generates CSV, uses history for re-export.
- **Developer:** maintains OCR accuracy, resilience, and storage; rarely end-user.

## Domain Rules & Invariants

- Odd number of photos → last image has no pair; excluded from batch until paired (see product doc).
- Invalid time math (e.g. negative duration) handled in time utils — may show zero; business validation stays with RH.
- OCR model must return **single JSON object**; route strips/extracts JSON from model text.

## Cross-References

- [Project overview](./project-overview.md)
