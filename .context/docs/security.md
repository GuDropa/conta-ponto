---
type: doc
name: security
description: Security policies, authentication, secrets management, and compliance requirements
category: security
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Security & Compliance Notes

This app processes **employee timecard photos** (personal + work pattern data). Treat logs, error payloads, and stored history as sensitive. Repo is an **internal HR aid**, not certified legal timekeeping.

## Authentication & Authorization

- **No end-user auth** in current scope: anyone with deployed URL could theoretically call OCR if exposed. Mitigation is **network policy** (Vercel protection, VPN, internal URL) — confirm with deploy owner.
- **API keys:** server-only; never expose in client bundles or `NEXT_PUBLIC_*` for Gemini/Anthropic.

## Secrets & Sensitive Data

| Secret | Where | Notes |
|--------|-------|-------|
| `GEMINI_API_KEY` | `.env.local` / Vercel env | Required for OCR |
| `ANTHROPIC_API_KEY` | optional env | Second provider in chain |
| Employee images | transient multipart → model | Do not persist raw images on server without policy |
| CSV / history | browser `localStorage` | Device-local; clearing browser data wipes it |

**Rotation:** rotate AI keys on leak; update Vercel + local `.env.local`.

**Git:** `.env.local` must stay gitignored; verify no API keys in commits.

## Compliance & Policies

- Align with Unimax **LGPD** / internal data handling for employee imagery.
- CSV downloads land on operator device — follow company rules for file storage and sharing.

## Incident Response

1. Revoke exposed API keys (Google AI Studio / Anthropic console).
2. Rotate Vercel env vars; redeploy.
3. If customer PII in logs, purge logs per platform procedure.
4. Document incident per company policy.

## Cross-References

- [Architecture](./architecture.md) — boundary server vs client
