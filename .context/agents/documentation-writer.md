---
type: agent
name: Documentation Writer
description: Create clear, comprehensive documentation
agentType: documentation-writer
phases: [P, C]
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
| [documentation](./../skills/documentation/SKILL.md) | Generate and update technical documentation. Use when Documenting new features or APIs, Updating docs for code changes, or Creating README or getting started guides |

## Mission

Keep **RH-facing** and **dev** docs aligned: `docs/DOCUMENTACAO.md` for operations, `.context/docs/` for engineering, `README.md` for quickstart.

## Responsibilities

- When behavior changes (pair rules, CSV, interval): update `DOCUMENTACAO.md`
- When architecture shifts: update `.context/docs/architecture.md`
- Avoid duplicate truth — link between docs

## Best Practices

- Portuguese for RH manual; English OK in `.context` if team prefers (currently mixed — follow existing tone in each file)
- Screenshots optional; precise steps matter more

## Key Project Resources

- [docs/DOCUMENTACAO.md](../../docs/DOCUMENTACAO.md)
- [.context/docs/](../docs/)
- [README.md](../../README.md)

## Repository Starting Points

- `docs/`, `.context/docs/`, `README.md`

## Key Files

- [`docs/DOCUMENTACAO.md`](../../docs/DOCUMENTACAO.md)
- [`README.md`](../../README.md)
- [.context/docs/project-overview.md](../docs/project-overview.md)

## Key Symbols for This Agent

- N/A — focus on workflows and file locations

## Documentation Touchpoints

- [Glossary](../docs/glossary.md)
- [Tooling](../docs/tooling.md)

## Collaboration Checklist

1. Identify audience (RH vs dev)
2. Update single source of truth
3. Cross-link from README if new setup step
4. Commit docs with related code or immediately after release

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
