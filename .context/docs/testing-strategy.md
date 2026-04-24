---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Testing Strategy

Repo ships **no automated test runner** in `package.json` today (no `npm test`). Quality gates are **lint + build** plus **manual OCR validation** with real card photos. Adding tests should target pure functions first (`time-utils`, `hr-batch-report`, `reading-period-map`, JSON parse helpers).

## Test Types

| Type | Framework | Convention | Notes |
|------|-----------|------------|-------|
| **Unit** | *TBD* (e.g. Vitest) | `*.test.ts` next to `src/lib/` | Start with time/CSV parsing |
| **Integration** | *TBD* | API route tests with `next/test` or supertest | Mock vision providers |
| **E2E** | *TBD* (e.g. Playwright) | `e2e/*.spec.ts` | Camera/file input tricky — use fixtures |

## Running Tests

*Not configured yet.* When added, prefer:

```bash
npm run test
npm run test -- --watch
```

Until then:

```bash
npm run lint
npm run build
```

## Quality Gates

- **Lint:** `npm run lint` (ESLint 9 + eslint-config-next)
- **Build:** `npm run build` must pass before merge
- **OCR changes:** manual check with front/back pair; verify CSV columns and day filter
- **Debugging:** follow workspace debugging protocol — root cause before patch

## Troubleshooting

- **Flaky OCR:** lighting and focus dominate; compare with `docs/DOCUMENTACAO.md` photo guidelines.
- **Build failures on Vercel:** check `maxDuration` and env vars for production API route.

## Cross-References

- [Development workflow](./development-workflow.md)
