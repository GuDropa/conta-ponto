---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Tooling & Productivity Guide

Scripts are minimal **npm** wrappers around Next.js and ESLint. Use **Node 18+**. IDE: VS Code / Cursor with TypeScript server, ESLint extension, Tailwind IntelliSense.

## Required Tooling

| Tool | Version / notes |
|------|-----------------|
| Node.js | 18+ |
| npm | ships with Node |
| Google AI key | [AI Studio](https://aistudio.google.com/apikey) for Gemini |

## Recommended Automation

```bash
npm run dev      # HMR local dev
npm run lint     # ESLint
npm run build    # Production compile
npm run start    # Run after build
```

**React Compiler:** `babel-plugin-react-compiler` in devDependencies — follow Next 16 docs for any config drift.

No repo-managed pre-commit hooks documented; optional: `lint-staged` locally.

## IDE / Editor Setup

- Enable **format on save** if team uses Prettier (not always in repo — check).
- Path alias `@/*` → `src/*` (tsconfig)
- For OCR work: keep DevTools **network** tab open to inspect `/api/ocr` payloads

## Productivity Tips

- Test on **real device** or responsive mode; camera APIs differ from desktop.
- Use **Application** tab to inspect `localStorage` history keys and IndexedDB draft when debugging loss of data.

## Cross-References

- [Development workflow](./development-workflow.md)
