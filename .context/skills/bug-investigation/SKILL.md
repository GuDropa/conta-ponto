---
type: skill
name: Bug Investigation
description: Investigate bugs systematically and perform root cause analysis. Use when Investigating reported bugs, Diagnosing unexpected behavior, or Finding the root cause of issues
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Reproduce (device + browser); capture **pair order** and **interval** settings
2. **Network:** `POST /api/ocr` status, response JSON, timing
3. **Console:** client errors from `gemini-ocr-client`, storage APIs
4. Bisect if regression; check recent prompt/parse changes in `route.ts`
5. Hypothesis → verify (e.g. env missing, JSON parse, CSV filter)
6. Document root cause; plan **one** fix

## Examples

**OCR returns empty days but HTTP 200**

```
Repro: 2 photos, known good card
Network: raw body shows employeeName OK, days: []
→ model/prompt issue or image quality; not client pair bug
Check: route prompt edits, provider error swallowed?
```

**CSV missing days**

```
Repro: interval 1–15, expect day 10
Trace: reading period + filterReportDays in hr-batch-report.ts
→ included-days set wrong vs UI state
```

## Quality Bar

- Reproduce before code changes
- Trace across **client → API → lib** boundary
- No fix until root cause documented (workspace debugging rule)

## Resource Strategy

- Keep notes in issue/PR; avoid new folders unless shared runbook needed
