# Wordmark Design — Rasheed Bustamam

**Date:** 2026-04-24
**Status:** Approved

---

## Brand decision

The public-facing identity is **Rasheed Bustamam the person**, not "Bustamam Technology" the company. The LLC exists for invoicing/contracts but lives in legal copy, not the brand. Everything public — blog, consulting, resume — runs under the personal name.

---

## The mark

```
Rasheed · Bustamam
```

| Element | Spec |
|---|---|
| Font | Geist Variable (already loaded on site — no new dependency) |
| "Rasheed" | weight 400 (regular), color `--ink` |
| "·" | weight 400, color `--accent` (green) |
| "Bustamam" | weight 700 (bold), color `--ink` |

The weight contrast does the work — "Rasheed" recedes slightly, "Bustamam" anchors. The green dot echoes the `bustamam.` motif already in the nav, making the system feel intentional.

---

## Color tokens

| Mode | `--ink` | `--accent` (dot) |
|---|---|---|
| Light | `#0c0f14` | `#1f6f43` |
| Dark | `#eceae3` | `#8cff5c` |

Dark mode is handled via CSS variables when the SVG is rendered inline — no separate asset needed.

---

## Format

SVG with `<text>` elements referencing Geist Variable. Reliable when used inline in Astro pages where Geist is already loaded. For standalone use (OG images, PDF resume), convert to paths as a later step.

---

## What this replaces

- `bustamam-technology-wordmark.svg` — the Impact/Arial Black "BUSTAMAM / TECHNOLOGY" mark. Inconsistent with site typography, no connection to the actual design system.
- The existing `bustamam-tech-logo-dark.png` / `bustamam-tech-logo-white.png` circuit-B marks remain as-is for now (used on the consulting entity if needed), but are not the primary public brand.

---

## Audience and tone

- **Consulting:** startups and technical founders
- **Employment:** startups and enterprise
- **Tone:** credible and polished, peer energy — "senior engineer who could run the company"

---

## Out of scope

- Favicon / social avatar (the existing stacked-rectangle icon in the header serves this for now)
- OG image template
- Path-converted standalone SVG for PDF/print use
