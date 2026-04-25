# Wordmark Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing Impact-based wordmark asset and `bustamam.tech` nav brand with a "Rasheed · Bustamam" wordmark in Geist Variable with weight contrast and a green dot accent.

**Architecture:** A single `Wordmark.astro` component renders the mark as HTML spans styled with CSS — no SVG text rendering, no font embedding issues, CSS variables handle dark mode automatically. The component is used in `SiteHeader.astro`. The static SVG asset is also updated for standalone use (OG images, etc.) using a system font fallback since web fonts don't load in standalone SVGs.

**Tech Stack:** Astro, Geist Variable (already loaded via `@fontsource-variable/geist`), CSS custom properties

---

### Task 1: Create `Wordmark.astro` component

**Files:**
- Create: `src/components/Wordmark.astro`

**Step 1: Create the component**

```astro
---
interface Props {
  size?: string;
  class?: string;
}
const { size = '14px', class: className } = Astro.props;
---

<span
  class:list={['wordmark', className]}
  aria-label="Rasheed Bustamam"
  style={`font-size:${size};`}
>
  <span class="wordmark__first">Rasheed</span
  ><span class="wordmark__dot"> · </span
  ><span class="wordmark__last">Bustamam</span>
</span>

<style>
  .wordmark {
    font-family: 'Geist Variable', -apple-system, system-ui, sans-serif;
    line-height: 1;
    white-space: nowrap;
    display: inline-block;
  }
  .wordmark__first {
    font-weight: 400;
    color: var(--ink);
  }
  .wordmark__dot {
    font-weight: 400;
    color: var(--accent);
  }
  .wordmark__last {
    font-weight: 700;
    color: var(--ink);
  }
</style>
```

Note: the `><` closing/opening tags on the spans are intentional — they prevent whitespace from rendering between the elements, keeping the mark tight.

**Step 2: Verify it renders correctly in isolation**

Open the dev server (`bun run dev`) and add `<Wordmark />` temporarily to any page. Confirm:
- "Rasheed" appears at weight 400
- "·" appears in green (`--accent`)
- "Bustamam" appears at weight 700 (noticeably heavier)
- In dark mode (toggle theme), all colors update via CSS vars with no change to markup

Remove the temporary usage after verifying.

**Step 3: Commit**

```bash
git add src/components/Wordmark.astro
git commit -m "feat: add Wordmark component (Rasheed · Bustamam, Geist Variable)"
```

---

### Task 2: Wire `Wordmark` into `SiteHeader.astro`

**Files:**
- Modify: `src/components/SiteHeader.astro`

The current brand block (lines 8–18) renders a stacked-rectangle SVG icon + `bustamam.tech` monospace text. Replace both with the `Wordmark` component.

**Step 1: Add the import**

In the frontmatter (between the `---` fences at the top of the file), add:

```astro
---
import Wordmark from './Wordmark.astro';
---
```

**Step 2: Replace the brand block**

Find this block (lines 8–18):

```html
<div style="display:flex; align-items:center; gap:14px; min-width:0;">
  <a href="/" style="display:flex; align-items:center; gap:14px; text-decoration:none; min-width:0;">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex-shrink:0;">
      <rect x="3" y="3" width="14" height="7.5" rx="1" stroke="var(--ink)" stroke-width="1.6"/>
      <rect x="7" y="13.5" width="14" height="7.5" rx="1" stroke="var(--ink)" stroke-width="1.6"/>
    </svg>
    <div style="font-family:var(--font-mono); font-size:13px; color:var(--ink); font-weight:500; letter-spacing:-.01em; white-space:nowrap;">
      bustamam<span style="color:var(--accent);">.</span>tech
    </div>
  </a>
  <div class="site-header__slash" style="height:14px; width:1px; background:var(--line); margin:0 4px; flex-shrink:0;"></div>
  <div class="site-header__journal" style="font-family:var(--font-mono); font-size:11px; color:var(--mute); flex-shrink:0;">/journal</div>
</div>
```

Replace with:

```html
<div style="display:flex; align-items:center; gap:14px; min-width:0;">
  <a href="/" style="display:flex; align-items:center; gap:14px; text-decoration:none; min-width:0;">
    <Wordmark size="13px" />
  </a>
  <div class="site-header__slash" style="height:14px; width:1px; background:var(--line); margin:0 4px; flex-shrink:0;"></div>
  <div class="site-header__journal" style="font-family:var(--font-mono); font-size:11px; color:var(--mute); flex-shrink:0;">/journal</div>
</div>
```

**Step 3: Verify in the browser**

Check:
- The header renders "Rasheed · Bustamam" with weight contrast and green dot
- The `/journal` section label still appears to the right of the divider
- Mobile drawer still opens correctly (the brand markup change doesn't affect the drawer logic)
- Dark mode toggle updates the wordmark colors correctly
- No layout shift or overflow on mobile widths

**Step 4: Commit**

```bash
git add src/components/SiteHeader.astro
git commit -m "feat: replace header brand with Wordmark component"
```

---

### Task 3: Update the static SVG asset

**Files:**
- Modify: `src/assets/site/bustamam-technology-wordmark.svg`

The existing file uses Impact/Arial Black and is completely disconnected from the site's design. Replace it with a new version using a system font stack that approximates Geist. Note: standalone SVGs (used as `<img src>`) cannot load web fonts — system-ui is the closest available approximation.

**Step 1: Replace the SVG**

Replace the entire content of `src/assets/site/bustamam-technology-wordmark.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 60" role="img" aria-label="Rasheed Bustamam">
  <title>Rasheed Bustamam</title>
  <text
    y="44"
    font-family="'Geist', system-ui, -apple-system, sans-serif"
    font-size="40"
    fill="#0c0f14"
  >
    <tspan font-weight="400">Rasheed</tspan><tspan font-weight="400" fill="#1f6f43"> · </tspan><tspan font-weight="700">Bustamam</tspan>
  </text>
</svg>
```

The viewBox width (480) is an estimate — adjust if the text overflows or has excessive trailing space when previewed. The colors are hardcoded to the light-mode tokens (`--ink` = `#0c0f14`, `--accent` = `#1f6f43`) since CSS vars don't work in standalone SVGs.

**Step 2: Preview the SVG**

Open the file directly in a browser to confirm:
- Text is visible and readable
- Weight contrast between "Rasheed" and "Bustamam" is visible
- Dot is green
- No clipping at edges (adjust viewBox width if needed)

**Step 3: Commit**

```bash
git add src/assets/site/bustamam-technology-wordmark.svg
git commit -m "chore: update wordmark SVG asset to Rasheed Bustamam mark"
```

---

## Done

The personal brand wordmark is live in the site header and available as a standalone SVG asset. The old "BUSTAMAM TECHNOLOGY" Impact mark is retired.

**Not in scope (future work):**
- Dark-mode variant of the standalone SVG
- Path-converted SVG for PDF/print use (requires fonttools or Inkscape)
- OG image template using the wordmark
