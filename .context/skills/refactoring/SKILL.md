---
type: skill
name: Refactoring
description: Refactor code safely with a step-by-step approach. Use when Improving code structure without changing behavior, Reducing code duplication, or Simplifying complex logic
skillSlug: refactoring
phases: [E]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Lock behavior: manual OCR case or fixture output
2. **Extract** pure functions to `src/lib/` when possible
3. Keep commits small; run `lint` + `build` each step
4. Avoid mixing refactor + feature in same commit

## Targets (high value)

- `hr-batch-report.ts` — CSV + day filtering
- `ocr-providers/` — chain error handling
- Large components → subcomponents (composition)

## Quality Bar

- No user-visible string/CSV column changes unless intentional
- Update `.context/docs/architecture.md` if module boundaries move

## Resource Strategy

- If extract needs tests first, coordinate with test-writer agent
