---
type: skill
name: Security Audit
description: Review code and infrastructure for security weaknesses. Use when Reviewing code for security vulnerabilities, Assessing authentication/authorization, or Checking for OWASP top 10 issues
skillSlug: security-audit
phases: [R, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Workflow

1. **Secrets:** grep `API_KEY`, `sk-`, `AIza` in repo history suggestion → use secret scan tools
2. **Client bundle:** ensure Gemini/Anthropic only imported under route or server-only paths
3. **Transport:** app should use HTTPS in prod; cookies N/A unless added later
4. **Input:** multipart size / image count — platform limits + abuse note
5. **Data:** employee photos — logging redaction, localStorage sensitivity

## Conta Ponto specifics

- Public deploy without auth = **policy issue** — document in security.md
- OCR route holds long `maxDuration` — cost/abuse via rate limit at edge

## Quality Bar

- Report: Critical / High / Medium / Low with file refs
- `.context/docs/security.md` updated if new practices agreed

## Resource Strategy

- OWASP ASVS checklist optional appendix in PR comment, not new file
