---
type: skill
name: Commit Message
description: Generate commit messages that follow conventional commits and repository scope conventions. Use when Creating git commits after code changes, Writing commit messages for staged changes, or Following conventional commit format for the project
skillSlug: commit-message
phases: [E, C]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. Identify **type**: feat | fix | refactor | perf | docs | test | chore | build | ci | style | revert
2. **Scope:** short area — `ocr`, `csv`, `history`, `camera`, `ui`, `api`, `deps`
3. **Subject:** imperative, ≤50 chars, no trailing period
4. **Body:** only if why non-obvious; wrap72 cols; bullets with `-`

## Examples (this repo)

```
fix(ocr): handle truncated JSON from model

Gemini occasionally wrapped JSON in extra text; extractor now balances braces.

```

```
feat(history): persist interval on re-export

```

## Anti-patterns

- “This commit…”, “Updated files”, emoji spam, AI attribution

## Quality Bar

- Matches `.cursor/rules/commit-messages.mdc` if present

## Resource Strategy

- Use `caveman-commit` user skill when user asks `/commit`
