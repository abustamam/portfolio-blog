# Favicon and Logo Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make favicon, header logo, and social fallback branding consistent using canonical assets while preserving light/dark behavior.

**Architecture:** Centralize brand asset paths in one constants module, then consume those constants from `BaseHead` and header branding components. Keep existing per-page social image behavior and only change fallback behavior. Add a lightweight verification script that validates built HTML metadata and critical asset references.

**Tech Stack:** Astro 5, TypeScript/ESM, SVG assets in `public/`, Node script for build-output checks.

---

## File Structure

- Create: `src/consts/brand.ts`  
  Responsibility: canonical brand asset path constants used by metadata and header components.
- Create: `src/components/BrandLogo.astro`  
  Responsibility: render canonical SVG wordmark in header with sizing and accessible labeling.
- Modify: `src/components/BaseHead.astro`  
  Responsibility: favicon metadata, social image fallback, theme-color correctness.
- Modify: `src/components/SiteHeader.astro`  
  Responsibility: swap text wordmark usage to canonical SVG logo component.
- Modify: `public/bustamam-technology-wordmark.svg`  
  Responsibility: support both light and dark theme contrast via `prefers-color-scheme`.
- Create: `scripts/verify-brand-metadata.mjs`  
  Responsibility: assert build artifacts contain expected favicon/social metadata.
- Modify: `package.json`  
  Responsibility: add repeatable verification command.

---

### Task 1: Centralize Canonical Brand Paths

**Files:**
- Create: `src/consts/brand.ts`
- Modify: `src/components/BaseHead.astro`

- [ ] **Step 1: Write failing metadata assertions first (expected fail before code changes)**

Create a temporary failing expectation snippet in `scripts/verify-brand-metadata.mjs` to enforce canonical path usage in built HTML:

```js
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');

if (!html.includes('href="/bustamam-favicon.svg"')) {
  throw new Error('Missing canonical SVG favicon in homepage head');
}
```

- [ ] **Step 2: Run failing check to confirm baseline failure**

Run: `npm run build && node scripts/verify-brand-metadata.mjs`  
Expected: FAIL (script either missing or assertion failure prior to implementation updates).

- [ ] **Step 3: Add canonical brand constants**

Create `src/consts/brand.ts`:

```ts
export const CANONICAL_FAVICON_SVG = '/bustamam-favicon.svg';
export const CANONICAL_LOGO = '/bustamam-technology-wordmark.svg';
export const SOCIAL_FALLBACK_IMAGE = '/bustamam-technology-wordmark.svg';
```

- [ ] **Step 4: Wire constants into `BaseHead` and normalize favicon links**

Update `src/components/BaseHead.astro` imports and metadata:

```astro
---
import '../styles/global.css';
import type { ImageMetadata } from 'astro';
import FallbackImage from '../assets/site/blog-placeholder-1.jpg';
import { SITE_TITLE } from '../consts';
import {
  CANONICAL_FAVICON_SVG,
  SOCIAL_FALLBACK_IMAGE,
} from '../consts/brand';

interface Props {
  title: string;
  description: string;
  image?: ImageMetadata | string;
}

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const { title, description, image } = Astro.props;
const socialImageSrc =
  typeof image === 'string'
    ? image
    : image?.src ?? SOCIAL_FALLBACK_IMAGE ?? FallbackImage.src;
---

<link rel="icon" type="image/svg+xml" href={CANONICAL_FAVICON_SVG} />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<meta property="og:image" content={new URL(socialImageSrc, Astro.url)} />
<meta property="twitter:image" content={new URL(socialImageSrc, Astro.url)} />
```

- [ ] **Step 5: Re-run build and verify metadata check now passes for canonical favicon**

Run: `npm run build && node scripts/verify-brand-metadata.mjs`  
Expected: PASS for canonical favicon assertion.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/consts/brand.ts src/components/BaseHead.astro scripts/verify-brand-metadata.mjs
git commit -m "feat: centralize brand asset paths and normalize head favicon metadata"
```

---

### Task 2: Canonical Header Logo with Theme-Aware Wordmark SVG

**Files:**
- Create: `src/components/BrandLogo.astro`
- Modify: `src/components/SiteHeader.astro`
- Modify: `public/bustamam-technology-wordmark.svg`

- [ ] **Step 1: Add failing assertion for header logo asset reference**

Extend `scripts/verify-brand-metadata.mjs`:

```js
if (!html.includes('/bustamam-technology-wordmark.svg')) {
  throw new Error('Homepage does not reference canonical wordmark logo');
}
```

- [ ] **Step 2: Run check and confirm it fails before header/logo changes**

Run: `npm run build && node scripts/verify-brand-metadata.mjs`  
Expected: FAIL for missing canonical header logo reference.

- [ ] **Step 3: Create dedicated header logo component**

Create `src/components/BrandLogo.astro`:

```astro
---
import { CANONICAL_LOGO } from '../consts/brand';

interface Props {
  class?: string;
  width?: number;
  height?: number;
}

const { class: className, width = 170, height = 48 } = Astro.props;
---

<img
  class:list={['brand-logo', className]}
  src={CANONICAL_LOGO}
  alt="Bustamam Technology"
  width={width}
  height={height}
  loading="eager"
  decoding="async"
/>

<style>
  .brand-logo {
    display: block;
    width: auto;
    max-width: min(42vw, 170px);
    height: auto;
  }
</style>
```

- [ ] **Step 4: Replace text wordmark usage in header**

Modify `src/components/SiteHeader.astro`:

```astro
---
import BrandLogo from './BrandLogo.astro';
---

<a href="/" style="display:flex; align-items:center; text-decoration:none; min-width:0; padding:8px 0;">
  <BrandLogo />
</a>
```

- [ ] **Step 5: Make canonical wordmark SVG theme-aware**

Modify `public/bustamam-technology-wordmark.svg` to add contrast rules:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1542" height="430" viewBox="0 0 1542 430">
  <defs>
    <style>
      .bg { fill: #ffffff; }
      .ink { fill: #1f2328; }
      @media (prefers-color-scheme: dark) {
        .bg { fill: #1f2328; }
        .ink { fill: #ffffff; }
      }
    </style>
  </defs>
  <rect width="1542" height="430" class="bg" />
  <text x="771" y="292" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-weight="900" font-size="256" letter-spacing="-4" class="ink">BUSTAMAM</text>
  <text x="783" y="370" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="46" letter-spacing="22" class="ink">TECHNOLOGY</text>
</svg>
```

- [ ] **Step 6: Re-run build and verify header/logo assertion passes**

Run: `npm run build && node scripts/verify-brand-metadata.mjs`  
Expected: PASS for canonical wordmark reference.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/components/BrandLogo.astro src/components/SiteHeader.astro public/bustamam-technology-wordmark.svg scripts/verify-brand-metadata.mjs
git commit -m "feat: use canonical theme-aware wordmark in site header"
```

---

### Task 3: Lock Social Fallback Behavior and Add Repeatable Verification Command

**Files:**
- Modify: `scripts/verify-brand-metadata.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing assertion for social fallback image path**

Extend `scripts/verify-brand-metadata.mjs` to verify homepage social metadata:

```js
if (!html.includes('property="og:image"')) {
  throw new Error('Missing og:image meta tag');
}
if (!html.includes('/bustamam-technology-wordmark.svg')) {
  throw new Error('Social fallback logo path missing from homepage metadata');
}
```

- [ ] **Step 2: Run check and confirm failure if fallback behavior not complete**

Run: `npm run build && node scripts/verify-brand-metadata.mjs`  
Expected: FAIL if fallback still points to old image source.

- [ ] **Step 3: Finalize full verification script with explicit pass output**

Update `scripts/verify-brand-metadata.mjs`:

```js
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');

const requiredSnippets = [
  'href="/bustamam-favicon.svg"',
  'href="/favicon-32.png"',
  'href="/favicon.ico"',
  'href="/apple-touch-icon.png"',
  '/bustamam-technology-wordmark.svg',
  'property="og:image"',
  'property="twitter:image"',
];

for (const snippet of requiredSnippets) {
  if (!html.includes(snippet)) {
    throw new Error(`Missing expected snippet in dist/index.html: ${snippet}`);
  }
}

console.log('Brand metadata verification passed');
```

- [ ] **Step 4: Add npm script for repeatable verification**

Modify `package.json`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "verify:brand": "npm run build && node scripts/verify-brand-metadata.mjs"
  }
}
```

- [ ] **Step 5: Run final verification command**

Run: `npm run verify:brand`  
Expected: `Brand metadata verification passed`

- [ ] **Step 6: Manual browser theme checks**

Run: `npm run dev` then validate in browser:
- Light mode tab favicon is visible and correct.
- Dark mode tab favicon inverts/adjusts correctly.
- Header logo is readable in both themes.
- Homepage social fallback metadata points to canonical wordmark.

- [ ] **Step 7: Commit Task 3**

```bash
git add scripts/verify-brand-metadata.mjs package.json
git commit -m "chore: add repeatable brand metadata verification command"
```

---

### Task 4: Final Quality Gate and Documentation Sync

**Files:**
- Modify (if needed): `docs/superpowers/specs/2026-04-27-favicon-logo-display-design.md`

- [ ] **Step 1: Confirm spec-to-implementation coverage**

Checklist:
- Canonical favicon SVG + fallbacks present
- Canonical header logo wired
- Light/dark mode behavior valid for favicon and logo
- Per-page social image behavior preserved with canonical fallback

- [ ] **Step 2: Run full project build**

Run: `npm run build`  
Expected: Astro build succeeds with no new warnings/errors.

- [ ] **Step 3: Commit final polish (only if files changed)**

```bash
git add -A
git commit -m "chore: finalize favicon and logo consistency rollout"
```

---

## Execution complete (2026-04-27)

Shipped on branch `feat/favicon-logo-consistency` (see git log). Summary vs. original tasks:

| Task | Status | Notes |
|------|--------|--------|
| 1 | Done | `src/consts/brand.ts`, `BaseHead` favicon + social fallback, `verify:brand` |
| 2 | Done | `BrandLogo` is inline SVG + `SiteHeader`; public wordmark for OG only |
| 3 | Done | `verify:brand` script + `package.json` script; verifier asserts homepage + sample post `og:image` |
| 4 | Done | **Per-page `image`:** `BaseLayout` accepts optional `image` → `BaseHead`. Wired: `BlogPost` (`heroImage`), `series/[...slug]` (`heroImage`), `work/[...slug]` (`logo`). Spec doc synced to shipped behavior. |

**Manual browser checks** (Task 4 step 6): run `npm run dev` and confirm favicon + header in light/dark toggle; CI-equivalent is `npm run verify:brand`.
