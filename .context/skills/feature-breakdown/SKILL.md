---
type: skill
name: Feature Breakdown
description: Break down features into implementable tasks. Use when Planning new feature implementation, Breaking large tasks into smaller pieces, or Creating implementation roadmap
skillSlug: feature-breakdown
phases: [P]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. State user outcome (RH-facing one sentence)
2. Map to layers: **UI** / **client lib** / **API** / **CSV** / **storage**
3. List tasks **dependency order**; mark risks (OCR contract, PII)
4. Each task ≤1 PR ideal; note manual test (photo pair)

## Example — “Add export format X”

```
1. Types + hr-batch-report builder (pure)
2. UI toggle + wire client download
3. DOCUMENTACAO: new paragraph for RH
4. Manual: generate file, open in Excel
```

## Quality Bar

- Every task names **files** or directories likely touched
- Call out if `route.ts` prompt changes (higher regression risk)

## Resource Strategy

- Use DotContext `scaffoldPlan` + `workflow-init` only when user wants PREVC harness
