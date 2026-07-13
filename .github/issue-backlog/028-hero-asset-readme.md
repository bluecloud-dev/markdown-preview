---
title: Re-capture hero GIF + README listing pass after UX changes land
labels: needs-human,docs,marketing,P2,phase:now
---
## Why mostly human

The hero is the listing's conversion asset — pacing, content choice, and "does this feel calm" are judgment calls. Capture can be semi-automated (the E2E suite already produced `assets/muninn-demo.gif` via wdio-video-reporter) but the 30-second story is editorial.

## Prerequisites

#011 (measure), #012 (toolbar), #013 (single preview), #016 (header) merged — the current GIF shows UI that will no longer exist.

## Steps

1. Script the 30s story (per MARKET_POSITION §5 lead with reading-first + honest round-trip): open teammate's README (calm reading surface) → edit a heading inline → toggle source, show the diff-clean markdown → table cell edit with Enter-flow → Mermaid block preview. End card: "The WYSIWYG that doesn't touch your bytes."
2. Capture at 1280×800, Default Dark Modern + one light frame; export GIF ≤ 8 MB (Marketplace renders GIFs; keep `assets/hero.png` as static fallback).
3. README pass: Highlights rewritten against shipped UI; claims synced with ROUNDTRIP_REPORT (#003) and a11y conformance note (#018); commands/settings tables regenerated.
4. AI-assistable: a `scripts/capture-demo.ts` WDIO scenario that drives the exact click path for re-capture reproducibility — worth doing, file as sub-task if pursued.

## Acceptance criteria

- [ ] New GIF + README merged; listing preview verified via `npm run package`
- [ ] Old asset removed; file size budget met
