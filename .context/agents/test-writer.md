---
type: agent
name: Test Writer
description: Write comprehensive unit and integration tests
agentType: test-writer
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
| [test-generation](./../skills/test-generation/SKILL.md) | Generate comprehensive test cases for code. Use when Writing tests for new functionality, Adding tests for bug fixes (regression tests), or Improving test coverage for existing code |

## Mission

Introduce **automated tests** where repo today has none: start with **pure libs** (`time-utils`, `hr-batch-report`, `reading-period-map`, JSON extraction helpers).

## Responsibilities

- Pick framework (Vitest recommended for Next monorepo) + add `npm test`
- Mock vision providers for any route tests
- Regression tests for fixed bugs

## Best Practices

- TDD when fixing subtle parse/math bugs
- Keep tests colocated or under `src/**/__tests__/`

## Key Project Resources

- [.context/docs/testing-strategy.md](../docs/testing-strategy.md)

## Repository Starting Points

- `src/lib/time-utils.ts`
- `src/lib/hr-batch-report.ts`
- `src/lib/reading-period-map.ts`
- `src/app/api/ocr/route.ts` (integration later)

## Key Files

- [`src/lib/hr-batch-report.ts`](../../src/lib/hr-batch-report.ts)
- [`src/lib/time-utils.ts`](../../src/lib/time-utils.ts)

## Key Symbols for This Agent

- `buildHrReportCsv`, `parseIncludedDaysList`, `calculateMonthlySummary`

## Documentation Touchpoints

- [Testing strategy](../docs/testing-strategy.md) — update when runner lands

## Collaboration Checklist

1. Agree framework + config with team
2. First PR: infra + 2–3 unit tests
3. Document `npm run test` in README
4. CI hook when ready

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
