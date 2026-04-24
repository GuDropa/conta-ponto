---
type: skill
name: PR Review
description: Review pull requests for quality and completeness. Use when Reviewing pull requests, Checking PR readiness, or Providing structured PR feedback
skillSlug: pr-review
phases: [R, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Read PR title/commits — conventional?
2. Diff stat: unexpected files?
3. **Risk zones:** `route.ts`, `hr-batch-report.ts`, storage keys
4. Verify **lint/build** evidence
5. UX: copy, mobile, error states
6. Output: must-fix vs follow-ups

## Conta Ponto signals

- Secret in diff → **block**
- Prompt JSON schema change without migration note → **block** or request doc
- Only stylistic churn in hot files → **question scope**

## Quality Bar

- Use `caveman-review` skill when user wants ultra-short comments
- Align with workspace debugging protocol for “bugfix” PRs (root cause in description)

## Resource Strategy

- Link to lines on Git host; avoid quoting entire files
