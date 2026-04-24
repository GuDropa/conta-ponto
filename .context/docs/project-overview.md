---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Project Overview

**Conta Ponto** helps **Supermercado Unimax** HR digitize **mechanical timecard** stamps: two photos per employee (front/back) go to **Gemini (and optionally Anthropic)** on the server, structured times come back, app builds a **CSV** for Excel and keeps **local history** for re-download. Mobile-first UX targets phones on the shop floor.

> **Semantic snapshot:** DotContext `context({ action: "getMap", section: "all", repoPath: "<repo>" })` for stack, key files, dependencies.

## Quick Facts

- **Root:** `conta-ponto` (Next.js app at repo root; package name `web` in `package.json`)
- **Languages:** TypeScript, TSX, CSS (Tailwind)
- **Primary entry (UI):** [`src/app/page.tsx`](../../src/app/page.tsx)
- **Primary entry (API):** [`src/app/api/ocr/route.ts`](../../src/app/api/ocr/route.ts)
- **Human manual:** [`docs/DOCUMENTACAO.md`](../../docs/DOCUMENTACAO.md)

## Entry Points

- [`src/app/page.tsx`](../../src/app/page.tsx) — home, `TimecardWorkspace`
- [`src/app/relatorio/page.tsx`](../../src/app/relatorio/page.tsx) — hours report / share flow
- [`src/app/api/ocr/route.ts`](../../src/app/api/ocr/route.ts) — multipart OCR
- [`src/app/layout.tsx`](../../src/app/layout.tsx) — root layout, fonts, theme

## Key Exports / Surfaces

- **HTTP:** `POST /api/ocr` (multipart `images`, pairs processed server-side in route).
- **Client lib:** `gemini-ocr-client.ts` — pair chunking, compression, fetch, CSV download helpers.
- **Reporting:** `hr-batch-report.ts` — batch merge, CSV string, day inclusion set.

## File Structure & Code Organization

- `src/app/` — App Router pages, layout, OCR API
- `src/components/` — feature UI (timecard, camera, history, report, shadcn `ui/`)
- `src/lib/` — OCR providers, HR CSV, storage, time math, parsing
- `src/types/` — shared timecard types
- `docs/` — leadership/RH documentation
- `public/` — static assets

## Technology Stack Summary

- **Next.js 16** (App Router), **React 19**, **Tailwind 4**, **shadcn/ui**-style components
- **Zustand** (state where used), **next-themes**
- **@google/generative-ai**, optional **@anthropic-ai/sdk** on server
- **html-to-image** for report capture; **tesseract.js** present for alternate/template path
- **ESLint** (eslint-config-next), **TypeScript 5**

## Core Framework Stack

- **Frontend:** RSC-capable app; interactive pieces are client components in feature folders
- **API:** Route handlers only for OCR in this codebase scope
- **Deploy:** Vercel assumed (`maxDuration` on OCR route)

## Getting Started Checklist

1. `npm install`
2. Add `.env.local` with `GEMINI_API_KEY`
3. `npm run dev` → open `/` (mobile viewport recommended)
4. Capture or select two images → **Gerar CSV**
5. Read [Development workflow](./development-workflow.md) before contributing

## Next Steps

- Product and operational detail: [`docs/DOCUMENTACAO.md`](../../docs/DOCUMENTACAO.md)
- Architecture: [architecture.md](./architecture.md)
