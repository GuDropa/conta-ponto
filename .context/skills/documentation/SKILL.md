---
type: skill
name: Documentation
description: Generate and update technical documentation. Use when Documenting new features or APIs, Updating docs for code changes, or Creating README or getting started guides
skillSlug: documentation
phases: [P, C]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Pick audience: **RH** (`docs/DOCUMENTACAO.md`) vs **dev** (`.context/docs`, `README`)
2. Single source of truth — cross-link, don’t duplicate CSV rules
3. For API changes: document multipart field names + response shape in architecture or README
4. Screenshots optional; steps and **pair order** must stay exact

## Conta Ponto touchpoints

| Topic | File |
|-------|------|
| Operator manual | `docs/DOCUMENTACAO.md` |
| Dev architecture | `.context/docs/architecture.md` |
| Setup | `README.md` |
| Terminology | `.context/docs/glossary.md` |

## Quality Bar

- PT-BR for RH doc headings/steps if rest of file is PT
- After edits: quick read for broken links (`../../` from `.context`)

## Resource Strategy

- Prefer editing existing docs; avoid new markdown files unless user asked
