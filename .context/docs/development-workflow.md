---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Development Workflow

Day-to-day: pull latest, copy `.env.local` from secure store (never commit), `npm install` when lockfile changes, `npm run dev`, exercise flows on mobile viewport + real photos for OCR. Before PR: `npm run lint`, `npm run build`. Align user-facing copy with Portuguese (Brazil) tone used in UI and `docs/DOCUMENTACAO.md`.

## Branching & Releases

- **Branching:** trunk-based or short-lived `feature/*` / `fix/*` off `main`; no strict Git Flow documented in repo — team convention wins.
- **Releases:** Vercel deploys from `main` (typical); tag releases if internal audit needs version pins.
- **Commits:** Conventional Commits; workspace rule: imperative subject ≤50 chars, body only when “why” non-obvious.

## Local Development

```bash
# Install
npm install

# Dev server (http://localhost:3000)
npm run dev

# Lint
npm run lint

# Production build
npm run build

# Start production build locally
npm run start
```

**Env:** create `.env.local` at repo root:

```env
GEMINI_API_KEY=...
# optional
ANTHROPIC_API_KEY=...
```

## Code Review Expectations

- **OCR / API:** verify prompt and JSON parsing changes against real card samples; watch for breaking response shape.
- **Client storage:** migrations or key changes must not brick existing `localStorage` / IndexedDB without recovery path.
- **UX:** mobile-first, touch targets, camera flow; match existing Tailwind + shadcn patterns.
- **Security:** no keys in client bundles; FormData only to same-origin `/api/ocr` unless explicitly designed otherwise.
- Cross-check [.cursor/rules](../../.cursor/rules) if present (debugging protocol, commit messages, React composition).

## Onboarding Tasks

1. Read [README.md](../../README.md) and [docs/DOCUMENTACAO.md](../../docs/DOCUMENTACAO.md) for product context.
2. Run app with valid `GEMINI_API_KEY`; capture test pair (front/back) and run through **Importar** → **Gerar CSV**.
3. Skim `src/app/api/ocr/route.ts` and `src/lib/gemini-ocr-client.ts` for the main pipeline.

## Cross-References

- [Testing strategy](./testing-strategy.md)
- [Tooling](./tooling.md)
