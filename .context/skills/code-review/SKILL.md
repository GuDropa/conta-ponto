---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices. Use when Reviewing code changes for quality, Checking adherence to coding standards, or Identifying potential bugs or issues
skillSlug: code-review
phases: [R, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Scope: OCR route, client fetch, CSV lib, or UI?
2. **Security:** env only on server; no keys in client
3. **Contract:** JSON fields `entry1`…`extraExit`, `day` 1–31 unchanged unless versioned
4. **UX:** mobile layout, Portuguese strings
5. **Style:** match existing components; composition rules (no boolean soup)
6. Summarize: blockers vs nits

## Checklist (Conta Ponto)

- [ ] `npm run lint` / CI green
- [ ] `/api/ocr` errors surfaced to user sensibly
- [ ] History/storage migrations safe
- [ ] Docs updated if RH-visible behavior changed

## Quality Bar

- Every comment: **location, problem, fix** (actionable)
- Prefer linking to `.context/docs/architecture.md` for layer violations

## Resource Strategy

- Link to files in GitHub/Git instead of pasting huge blocks
