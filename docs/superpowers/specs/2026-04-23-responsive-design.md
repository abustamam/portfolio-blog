# Responsive layout — design spec

**Date:** 2026-04-23  
**Status:** Approved for implementation planning  
**Scope:** Astro blog (`bustamam.technology` journal) — all primary templates and global shell.

---

## 1. Summary

Make the site **fully responsive** with a **mobile-first** CSS strategy: solid from **~360px** phones, intentional layout at **tablet** widths, and **polish at large / ultra-wide** desktop (contained content, fluid gutters, scaled display type). **Navigation** on small viewports uses a **hamburger + panel** (full-screen overlay on the smallest breakpoints, **right slide-in sheet** from tablet until desktop inline nav returns). The **home post index** uses a **compact list** on narrow screens (no horizontal scroll for the list). Implementation preference: **central layout layer** in `global.css` with **semantic classes**, incremental replacement of layout-only inline styles — not a full Tailwind rewrite.

---

## 2. Decisions (from brainstorming)

| Topic | Choice |
|--------|--------|
| Viewport priority | **C** — Phone (~360px) + tablet (~768px) + large desktop polish |
| Nav (narrow) | **C** — Hamburger + panel |
| Panel presentation | **C** — Implement **full-screen overlay** on smallest widths; **right slide-in + dimmed backdrop** from **`md`** until **`lg`**; **inline nav** from **`lg`** (~1024px). Agent may tune exact breakpoints during implementation if visual balance requires it. |
| Post index (narrow) | **B** — Compact list: **title + one meta line**; fewer fields; **no horizontal scroll** for the index |

---

## 3. Approaches considered

1. **Patch in place** — Per-page `<style>` and ad hoc media queries next to inline layout. *Rejected:* duplicated breakpoints, hard to maintain.

2. **Central layout layer (chosen)** — Breakpoints, fluid gutter, and layout primitives in `global.css`; semantic classes (`.page-shell`, `.site-header`, `.post-index`, etc.); small component `<script>` only for menu behavior (focus, Escape). *Chosen:* matches token-based handoff and multi-file layout.

3. **Tailwind-first rewrite** — Re-express layouts with responsive utilities. *Rejected for this pass:* large churn vs. current inline-heavy `.astro` files.

---

## 4. Foundation (Section 1 — locked)

- **Breakpoints (`min-width`):** `640px` (sm), `768px` (md), `1024px` (lg), `1280px` (xl). Default styles target the smallest phones; enhance upward.
- **Gutter:** Replace a single fixed `56px` gutter with **fluid horizontal padding** (e.g. `clamp(16px, 4vw, 56px)` or stepped values by breakpoint), applied consistently via a shared **`.page-shell`** / CSS variable pattern.
- **Wide desktop:** Retain **`max-width: 1280px`** (or handoff-equivalent) for primary content; add **symmetric outer padding** on very wide viewports so content does not hug the monitor edge.
- **Display typography:** **Fluid or stepped scaling** for home hero H1 and post title H1 on narrow screens; preserve handoff feel at `lg+`.
- **Touch targets:** Minimum **~44px** for menu control, drawer links, primary pills, and critical actions where they are currently tight.

---

## 5. Global shell (Section 2 — locked)

### 5.1 Terminal chrome (`TerminalChrome.astro`)

- Keep current structure (traffic lights, path, availability, theme).
- **Narrow phones:** Long breadcrumb text truncates with **ellipsis** in the flexible region (`min-width: 0` on flex children) so the bar stays **one row**. If still cramped after QA, optionally shorten the static label (e.g. emphasize `~/journal` + path) without removing the path prop behavior.
- **Right cluster** (availability + theme): truncate or slightly shorten availability text if needed so **theme toggle** remains visible.

### 5.2 Site header + navigation (`SiteHeader.astro`)

- **`lg` (~1024px) and up:** Current layout — wordmark, optional `/journal`, full `<nav>` + search hint.
- **Below `lg`:** **Menu button** visible; **inline horizontal nav hidden**. Wordmark + `/journal` remain; if `/journal` crowds the bar on the narrowest width, it may hide **only below `sm`** and reappear from `sm+`.
- **Menu panel:** **Full-screen overlay** below `md`; **`md`–below-`lg`:** **slide-in sheet from the right** with dimmed backdrop; **Escape**, **click on backdrop**, and **focus return** to the menu button on close. **`aria-expanded`**, **`aria-controls`**, dialog or navigation pattern consistent with a11y guidance; **focus moves into the panel** on open.
- **Panel contents:** Same destinations as today — `writing` (`/`), `work`, `about`, `contact`, plus **search**:
  - On **`/`:** search field **wired to the same filter behavior** as `#search-input` (shared id or synchronized inputs — implementation detail).
  - On **other routes:** **Navigate to `/`** and **focus** the main journal search input (documented default).
- **Theme:** Remains **only** in terminal chrome (no duplicate in header unless a QA pass proves necessary).

### 5.3 Footer (`SiteFooter.astro`)

- **Narrow:** **Stack** into two logical groups (copyright + feeds + colophon; then “built with…” + status) with comfortable vertical spacing.
- **Wide:** Restore horizontal **space-between** layout.

---

## 6. Page templates and prose (Section 3 — locked)

### 6.1 Home (`src/pages/index.astro`)

- **Hero:** Single column by default; **two columns** from **`md`**; terminal card **below** text on narrow, **right column** from `md`.
- **Filter bar:** Preserve wrap; **sort** control moves to **own row** on narrow widths.
- **Post list below `lg`:**
  - Hide **column header** row.
  - **`.post-row`:** compact block — **title**, **one mono meta line** (`date · tag · N min`; word count optional from `sm+`), **dek** with **line-clamp** (~2 lines). Hide **№** and dedicated **arrow column** on narrow; optional inline arrow from `sm+` if it stays clean.
  - **Latest row** surface background unchanged.
- **Filter script:** When showing/hiding rows, use the **display mode that matches the active layout** (`grid` vs `block`/`flex`) so filters do not break mobile layout.

### 6.2 Archive (`src/pages/blog/index.astro`)

- Keep **responsive card list** (already uses narrow media rules). When this file is touched, **align colors** with `:root` tokens — **non-blocking** for the responsive milestone but noted for consistency.

### 6.3 Blog post (`src/layouts/BlogPost.astro`)

- **Title block:** Fluid title/dek; breadcrumb wraps; author strip may **stack** on very narrow viewports.
- **Body grid:**
  - **`lg+`:** `220px 1fr 220px`, sticky sidebars unchanged.
  - **Below `lg`:** Single column order: **`<details>` “§ contents”** (TOC + progress) → **article** → **right-column cards** (about post / series) **stacked** under article.
- **Series prev/next:** Wrap-friendly; **line-clamp** on long titles if needed.
- **Related posts:** `1` col default, `2` cols from `md`, `3` cols from `lg`.

### 6.4 Prose (`.post-prose` global styles)

- **`pre`:** `overflow: auto`; add **touch-friendly horizontal scrolling** where helpful (e.g. `-webkit-overflow-scrolling: touch` on wrapper if added).
- **Tables:** Wrap tables in a **scroll container** with visible bounds if wide tables appear in content.
- **Drop cap:** Smaller `::first-letter` on narrow viewports.
- **`h2` / `h3`:** Slightly reduced sizes below `md`.

### 6.5 Series (`src/pages/series/index.astro`, `src/pages/series/[...slug].astro`)

- **Index:** Cards **stack** (image full width above text) below **`sm`** or **`md`** (pick one during implementation and verify against real titles).
- **Detail:** Keep **max-width** + **fluid side padding**; avoid edge-to-edge text on phones.

### 6.6 About (`src/pages/about.astro`)

- Uses **`BlogPost`**; **inherits** post responsive behavior.

### 6.7 Author bio (`src/components/AuthorBio.astro`)

- **Two-column grid** stacks to **one column** below `md`; inner **2×2** metadata grid becomes **single column** on very narrow screens.

---

## 7. Accessibility, motion, and edge cases (Section 4)

- **Keyboard:** **Escape** closes the nav panel; **Tab** cycles within the panel while open; **restore focus** to the menu button on close.
- **Screen readers:** Menu button has **accessible name** (e.g. “Menu” / “Open navigation”); panel has appropriate **role** and **label**.
- **Body scroll:** **Lock** `overflow` on `body` while the **full-screen** menu is open; for **sheet** mode, locking is **recommended** if focus loss or scroll bleed is observed in QA.
- **`prefers-reduced-motion`:** Respect for **panel transitions** (instant open/close or opacity-only if `reduce` is set).
- **`/` and ⌘K`:** Continue to **focus search** when not typing in an input; ensure shortcuts **do not steal keys** when the drawer search is focused or when `textarea`/`input` elsewhere has focus. If the search input lives **only** in the drawer on some breakpoints, shortcuts should still **open + focus** search where applicable.

---

## 8. Testing checklist (acceptance)

Manual pass at widths **360, 390, 768, 1024, 1280, 1440+** (or browser device mode):

- [ ] No unintended **horizontal page scroll** on home, post, series index/detail, `/blog`, about.
- [ ] **Nav:** open/close, focus trap, Escape, backdrop click, focus return.
- [ ] **Home:** filter + tag pills + search still work after row `display` changes.
- [ ] **Post:** TOC/progress inside `<details>` works; reading progress script still runs; related grid reflows.
- [ ] **Code blocks** and **wide tables** scroll inside their containers.
- [ ] **Theme toggle** and terminal bar remain usable on **320–360px** width (if supported target).

Automated checks are optional (no requirement in this spec); **visual regression** is optional follow-up.

---

## 9. Non-goals (this spec)

- Redesigning **Terminal Sharp** look and feel beyond **responsive adaptation**.
- **Migrating** all inline styles to Tailwind in one pass.
- **PWA**, **offline**, or **installable** behavior.
- Changing **content** or **information architecture** (URLs, copy) except truncation/short labels strictly for fit.

---

## 10. Primary files to touch (implementation hint)

- `src/styles/global.css` — breakpoints, shell classes, fluid gutter variables.
- `src/components/SiteHeader.astro` — menu markup + small client script for a11y behavior.
- `src/components/TerminalChrome.astro` — truncation / flex fixes.
- `src/components/SiteFooter.astro` — responsive stack.
- `src/pages/index.astro` — hero, filter bar, post rows, script display compatibility.
- `src/components/AuthorBio.astro` — stacked layout.
- `src/layouts/BlogPost.astro` — title block, three-column collapse, related grid, prose tweaks in `<style is:global>`.
- `src/pages/series/index.astro`, `src/pages/series/[...slug].astro` — card stack, padding.
- `src/pages/blog/index.astro` — optional token alignment when edited.

---

## 11. Spec self-review

- **Placeholders:** None intentional; breakpoint `sm` vs `md` for series card stack left as **implementation choice with QA** (Section 6.5).
- **Consistency:** Panel behavior aligns with Sections 2 and 7; post list aligns with Section 6.1 and decision table.
- **Scope:** Single implementation plan is appropriate; `/blog` token alignment is explicitly non-blocking.

---

*End of spec.*
