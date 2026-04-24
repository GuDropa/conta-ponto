---
type: agent
name: Performance Optimizer
description: Improve application performance and efficiency
agentType: performance-optimizer
phases: [E, V]
generated: 2026-04-15
updated: 2026-04-14
status: filled
scaffoldVersion: "2.0.0"
---

## Mission

Reduce **latency and payload** for OCR batch: image compression, parallel requests, avoid unnecessary re-renders on large grids.

## Responsibilities

- Client image pipeline in `gemini-ocr-client.ts` (`MAX_DIMENSION`, JPEG quality)
- Batch concurrency — balance server limits vs UX
- React: memoization where hot (grid rows) if profiling shows need

## Best Practices

- Measure before micro-optimizing; **network + model** dominate OCR
- Keep `compressImage` fast; avoid double decode
- Respect Vercel **function duration**; don’t inflate single requests beyond need

## Key Project Resources

- [.context/docs/architecture.md](../docs/architecture.md)

## Repository Starting Points

- `src/lib/gemini-ocr-client.ts`
- `src/components/timecard/` (render cost)
- `src/app/api/ocr/route.ts` (server timeouts)

## Key Files

- [`src/lib/gemini-ocr-client.ts`](../../src/lib/gemini-ocr-client.ts)
- [`src/app/api/ocr/route.ts`](../../src/app/api/ocr/route.ts)

## Key Symbols for This Agent

- `compressImage`, `chunkFilesIntoPairs`, `recognizeTimecardBatchWithGemini`
- `maxDuration`

## Documentation Touchpoints

- [Tooling](../docs/tooling.md)

## Collaboration Checklist

1. Baseline: Network tab size/time per pair
2. After change: compare batch N pairs total time
3. Run `npm run build` for bundle regressions
4. Document any new limits (concurrency cap)

## Cross-References

- [../docs/README.md](../docs/README.md)
- [../../README.md](../../README.md)
