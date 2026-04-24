---
type: agent
name: Bug Fixer
description: Analyze bug reports and error messages
agentType: bug-fixer
phases: [E, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [bug-investigation](./../skills/bug-investigation/SKILL.md) | Investigate bugs systematically and perform root cause analysis. Use when Investigating reported bugs, Diagnosing unexpected behavior, or Finding the root cause of issues |

## Mission

Triage **OCR**, **CSV**, **storage**, and **UI** bugs with **root cause first** (workspace debugging protocol). Minimal diffs; no bundled refactors.

## Responsibilities

- Reproduce on mobile/desktop as reported
- Trace: `CameraCapture` → `gemini-ocr-client` → `/api/ocr` → `hr-batch-report` / history
- Fix at source (wrong parse, bad state, env) not symptom-only

## Best Practices

- Read full stack traces; check **Network** response body for `/api/ocr`
- Verify `GEMINI_API_KEY` on server when “empty days” or 500s
- Add regression note in commit when behavior is subtle

## Key Project Resources

- [.context/docs/architecture.md](../docs/architecture.md)
- [docs/DOCUMENTACAO.md](../../docs/DOCUMENTACAO.md)

## Repository Starting Points

- `src/app/api/ocr/route.ts` — JSON extract, provider errors
- `src/lib/gemini-ocr-client.ts` — fetch, compression
- `src/lib/csv-history-storage.ts`, `camera-draft-idb.ts` — persistence

## Key Files

- [`src/app/api/ocr/route.ts`](../../src/app/api/ocr/route.ts)
- [`src/lib/gemini-ocr-client.ts`](../../src/lib/gemini-ocr-client.ts)
- [`src/lib/hr-batch-report.ts`](../../src/lib/hr-batch-report.ts)

## Key Symbols for This Agent

- `extractJsonObject`, `runOcrOnPair`, `postOcrPair`
- `buildHrReportCsv`, `appendEntry`

## Documentation Touchpoints

- [Testing strategy](../docs/testing-strategy.md)
- [Security](../docs/security.md) — if data exposure

## Collaboration Checklist

1. Reproduce + capture request/response (redact PII)
2. Identify layer (client vs API vs model)
3. Single logical fix + `npm run lint` / `build`
4. Note if RH doc needs update

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
