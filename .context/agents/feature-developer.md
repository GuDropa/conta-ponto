---
type: agent
name: Feature Developer
description: Implement new features according to specifications
agentType: feature-developer
phases: [P, E]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [commit-message](./../skills/commit-message/SKILL.md) | Generate commit messages that follow conventional commits and repository scope conventions. Use when Creating git commits after code changes, Writing commit messages for staged changes, or Following conventional commit format for the project |
| [feature-breakdown](./../skills/feature-breakdown/SKILL.md) | Break down features into implementable tasks. Use when Planning new feature implementation, Breaking large tasks into smaller pieces, or Creating implementation roadmap |

## Mission

Implement features touching **timecard UI**, **OCR pipeline**, or **exports** with smallest coherent diffs and matching types.

## Responsibilities

- Place logic in correct layer (see architecture doc)
- Extend `hr-batch-report` / client lib instead of duplicating CSV rules
- Preserve mobile-first layouts

## Best Practices

- Feature breakdown before large PRs
- Conventional commits; scope in subject (`feat(ocr): …`)

## Key Project Resources

- [.context/docs/architecture.md](../docs/architecture.md)
- [.context/docs/glossary.md](../docs/glossary.md)

## Repository Starting Points

- `src/components/timecard/`, `src/lib/`, `src/app/api/ocr/`

## Key Files

- [`src/components/timecard/timecard-workspace.tsx`](../../src/components/timecard/timecard-workspace.tsx)
- [`src/lib/gemini-ocr-client.ts`](../../src/lib/gemini-ocr-client.ts)
- [`src/lib/hr-batch-report.ts`](../../src/lib/hr-batch-report.ts)

## Key Symbols for This Agent

- `chunkFilesIntoPairs`, `buildHrBatchReport`, `downloadHrReportCsv`
- Workspace tab types in `timecard-workspace.tsx`

## Documentation Touchpoints

- [Development workflow](../docs/development-workflow.md)
- [docs/DOCUMENTACAO.md](../../docs/DOCUMENTACAO.md)

## Collaboration Checklist

1. Clarify CSV/OCR contract with architect/reviewer if needed
2. Implement + lint + build
3. Update RH doc if user-visible behavior changes
4. Commit with clear scope

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
