---
type: agent
name: Frontend Specialist
description: Build and optimize user interfaces
agentType: frontend-specialist
phases: [P, E]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Mission

Ship **mobile-first** UI for timecard import, preview pairs, interval selection, history — aligned with Tailwind + shadcn patterns and React 19.

## Responsibilities

- `TimecardWorkspace`, `CameraCapture`, grids, history panel
- Loading/error states around `/api/ocr` fetch
- Accessibility for touch and small viewports

## Best Practices

- Follow workspace **React composition** rules: avoid boolean prop explosion; prefer variants / composition
- Client components only where needed (`"use client"`)
- Match **Unimax** header/branding on home

## Key Project Resources

- [.context/docs/architecture.md](../docs/architecture.md)
- [docs/DOCUMENTACAO.md](../../docs/DOCUMENTACAO.md) — UX truth for RH

## Repository Starting Points

- `src/components/timecard/`
- `src/components/camera/`
- `src/components/history/`
- `src/components/ui/`

## Key Files

- [`src/components/timecard/timecard-workspace.tsx`](../../src/components/timecard/timecard-workspace.tsx)
- [`src/components/camera/camera-capture.tsx`](../../src/components/camera/camera-capture.tsx)
- [`src/components/history/csv-history-panel.tsx`](../../src/components/history/csv-history-panel.tsx)
- [`src/app/page.tsx`](../../src/app/page.tsx)

## Key Symbols for This Agent

- `CameraCapture`, `CsvHistoryPanel`, `TimecardWorkspace`
- `useBeforeUnloadWarning` (draft loss)

## Documentation Touchpoints

- [Project overview](../docs/project-overview.md)
- [Glossary](../docs/glossary.md)

## Collaboration Checklist

1. Test on narrow viewport + real device when camera involved
2. Verify pair preview matches documented order (frente/verso)
3. Check history + IndexedDB draft after flow
4. Run `npm run lint`

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
