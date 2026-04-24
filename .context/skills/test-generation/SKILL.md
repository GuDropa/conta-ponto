---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code. Use when Writing tests for new functionality, Adding tests for bug fixes (regression tests), or Improving test coverage for existing code
skillSlug: test-generation
phases: [E, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Choose **Vitest** (or team standard) — add to `package.json` when introducing tests
2. First targets: `time-utils.ts`, `hr-batch-report.ts` (`parseIncludedDaysList`, `buildHrReportCsv` with fixed inputs)
3. Bugfix: failing test first when possible (TDD)
4. Route tests: mock `runVisionOcrChain`, assert HTTP JSON shape

## Example cases

- `parseIncludedDaysList` edge: empty, out of range, unordered
- `minutesToTimeString` round-trip
- CSV: separator `;`, BOM prefix if required by spec

## Quality Bar

- Tests deterministic; no live API calls in CI
- Update `.context/docs/testing-strategy.md` when runner added

## Resource Strategy

- Fixtures: small JSON blobs under `src/lib/__fixtures__/` if needed
