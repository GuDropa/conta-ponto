---
type: agent
name: DevOps Specialist
description: Manage deployment, CI/CD, and infrastructure
agentType: devops-specialist
phases: [E, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Mission

Keep **Next.js** app deployable on **Vercel**: env vars, function duration, build. No secrets in repo.

## Responsibilities

- `GEMINI_API_KEY` / optional `ANTHROPIC_API_KEY` in project settings
- Verify `npm run build` in CI or pre-deploy
- Monitor OCR route timeouts vs `maxDuration = 300`

## Best Practices

- Document required env in README; never commit `.env.local`
- After key rotation: redeploy + clear bad caches if any

## Key Project Resources

- [README.md](../../README.md) — runbook
- [.context/docs/tooling.md](../docs/tooling.md)
- [.context/docs/security.md](../docs/security.md)

## Repository Starting Points

- `package.json` — scripts
- `src/app/api/ocr/route.ts` — serverless constraints
- `next.config.*` if present at root

## Key Files

- [`package.json`](../../package.json)
- [`src/app/api/ocr/route.ts`](../../src/app/api/ocr/route.ts)

## Key Symbols for This Agent

- `export const maxDuration = 300`
- `process.env.GEMINI_API_KEY` usage in route/chain

## Documentation Touchpoints

- [Development workflow](../docs/development-workflow.md)
- [Security](../docs/security.md)

## Collaboration Checklist

1. List env vars for staging/production
2. Run `npm run build` locally before merge
3. Confirm access control on public URL if needed
4. Log any platform limits (payload size, concurrency)

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
