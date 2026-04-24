# Responsive layout implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a mobile-first responsive layout across the journal shell and all primary templates, matching `docs/superpowers/specs/2026-04-23-responsive-design.md`.

**Architecture:** Add a **central layout layer** in `src/styles/global.css` (fluid gutter variables, breakpoint-scoped rules, semantic BEM-ish classes). Refactor **inline layout** on targeted `.astro` files to use those classes. **Navigation** below `lg` uses a **menu button + panel** (full-screen `< md`, right sheet `md–lg`) with a small **vanilla `<script>`** in `SiteHeader.astro` for open/close, focus, Escape, and scroll lock. **No new test framework** for this milestone; each task ends with **`bun run build`** plus explicit manual viewport checks (TDD replaced by build + manual verification because the repo has no unit/e2e runner configured).

**Tech stack:** Astro 5, Tailwind 4 (imported in `global.css`), Bun for scripts, existing content collections unchanged.

**Spec reference:** `docs/superpowers/specs/2026-04-23-responsive-design.md`

---

## File map (create / modify)

| File | Responsibility |
|------|------------------|
| `src/styles/global.css` | Breakpoint tokens (comments), `--gutter-x`, `.page-shell`, nav drawer + footer + post list + author + series responsive rules |
| `src/components/TerminalChrome.astro` | Flex truncation for breadcrumb and right cluster |
| `src/components/SiteHeader.astro` | Desktop nav vs menu button, drawer markup, drawer styles (or in global), focus + Escape + backdrop script |
| `src/components/SiteFooter.astro` | Stack vs row layout via classes |
| `src/pages/index.astro` | Hero grid classes, filter bar, post list markup/classes, sync search script if drawer search added |
| `src/components/AuthorBio.astro` | Grid stack classes |
| `src/layouts/BlogPost.astro` | Title block, `<details>` TOC wrapper, body grid, related grid, prose media queries |
| `src/pages/series/index.astro` | Card flex direction at `sm` |
| `src/pages/series/[...slug].astro` | Padding uses fluid gutter variable |
| `src/pages/blog/index.astro` | Optional: token alignment — **only if** touching file in same PR |

---

### Task 1: Global foundation (`global.css`)

**Files:**

- Modify: `src/styles/global.css`

- [ ] **Step 1: Append foundation block**

Add after `:root` token block (keep existing variables; extend, do not remove `--gutter` until consumers are migrated):

```css
/* Responsive foundation — spec 2026-04-23 */
:root {
  --gutter-x: clamp(16px, 4vw, 56px);
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}

.page-shell {
  width: 100%;
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--gutter-x);
  padding-right: var(--gutter-x);
}

@media (min-width: 1600px) {
  .page-shell {
    padding-left: max(var(--gutter-x), calc((100vw - 1280px) / 2));
    padding-right: max(var(--gutter-x), calc((100vw - 1280px) / 2));
  }
}

.display-hero {
  font-size: clamp(2rem, 8vw, 4.25rem);
  line-height: 0.96;
}

.display-post-title {
  font-size: clamp(2rem, 7vw, 4.25rem);
  line-height: 1;
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
cd /media/rasheed-bustamam/Extra/coding/blog && bun run build
```

Expected: **exit code 0**, no CSS parse errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css && git commit -m "feat(css): add responsive foundation tokens and page-shell"
```

---

### Task 2: Terminal chrome truncation

**Files:**

- Modify: `src/components/TerminalChrome.astro`

- [ ] **Step 1: Wrap breadcrumb and add classes**

Replace the outermost `div` opening tag with a classed version and add `min-width:0` on flex children that should shrink. Example structure (adjust to match exact current markup):

```astro
<div class="term-chrome" style="display:flex; align-items:center; height:34px; border-bottom:1px solid var(--line); background:var(--surface); font-family:var(--font-mono); font-size:11px; color:var(--mute);">
```

In `global.css` add:

```css
.term-chrome { min-width: 0; }
.term-chrome__crumb {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.term-chrome__right {
  min-width: 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.term-chrome__avail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 28vw;
}
@media (min-width: 640px) {
  .term-chrome__avail { max-width: none; }
}
```

Apply `class="term-chrome__crumb"` to the breadcrumb inner wrapper (the segment showing `rasheed@bustamam` and path), and `term-chrome__right` / `term-chrome__avail` on the right availability text wrapper as appropriate.

- [ ] **Step 2: Verify**

Run `bun run build`. Resize devtools to **360px** width on `/` — terminal bar stays **one row**, theme button visible.

- [ ] **Step 3: Commit**

```bash
git add src/components/TerminalChrome.astro src/styles/global.css && git commit -m "fix(chrome): truncate terminal breadcrumb on narrow viewports"
```

---

### Task 3: Footer stack

**Files:**

- Modify: `src/components/SiteFooter.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add footer classes to `SiteFooter.astro`**

Change outer `<footer>` to include `class="site-footer"` and wrap the two current groups in `div.site-footer__group` elements.

- [ ] **Step 2: Add CSS**

```css
.site-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem 1.5rem;
}
@media (min-width: 1024px) {
  .site-footer {
    flex-wrap: nowrap;
  }
}
@media (max-width: 1023px) {
  .site-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

Remove conflicting inline `display:flex` from footer if class handles it, or keep padding/background inline and move only flex rules to class.

- [ ] **Step 3: Verify** — `bun run build`; at **390px** footer stacks without horizontal scroll.

- [ ] **Step 4: Commit** — `feat(footer): stack footer groups on narrow viewports`

---

### Task 4: Site header + navigation drawer

**Files:**

- Modify: `src/components/SiteHeader.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Markup structure in `SiteHeader.astro`**

Implement:

- `header.site-header` with inner `site-header__inner` using flex; brand left.
- **Desktop (`lg+`):** existing `<nav>` with class `site-header__nav site-header__nav--desktop` containing links + search hint.
- **Below `lg`:** `button.site-header__menu-btn` (hamburger SVG + visually hidden text “Open menu”), `aria-expanded="false"`, `aria-controls="site-nav-panel"`.
- **Panel:** `div#site-nav-panel.site-nav-panel` (initially `hidden` or `aria-hidden="true"` + CSS `visibility`/`transform`) containing:
  - Close button `site-nav-panel__close` (“Close menu”).
  - List of links: `/`, `/work`, `/about`, `/contact` (match current hrefs).
  - **Search:** `input type="search"` with `id="nav-search-input"`, `aria-label="Search posts"`.
- **Backdrop:** `div.site-nav-backdrop` as sibling behind panel (or fixed full viewport), click closes.

- [ ] **Step 2: Panel CSS in `global.css`**

Include:

- `@media (max-width: 767px)` — `.site-nav-panel` full viewport fixed inset 0 z-index high; slide/fade in with `transform` + `opacity`; **disable animation** under `@media (prefers-reduced-motion: reduce)`.
- `@media (min-width: 768px) and (max-width: 1023px)` — panel fixed top/right/bottom, `max-width: min(400px, 100vw)`, box-shadow, backdrop dimmed.
- `@media (min-width: 1024px)` — hide `.site-nav-panel`, `.site-nav-backdrop`, `.site-header__menu-btn`; show `.site-header__nav--desktop`.

Body scroll lock when open:

```css
html.nav-open,
html.nav-open body {
  overflow: hidden;
}
```

Toggle class `nav-open` on `<html>` when full-screen; for sheet mode use same if QA shows bleed.

- [ ] **Step 3: Menu script** (end of `SiteHeader.astro`, `<script>` not `is:inline` unless needed)

```javascript
(function () {
  const btn = document.querySelector('.site-header__menu-btn');
  const panel = document.getElementById('site-nav-panel');
  const backdrop = document.querySelector('.site-nav-backdrop');
  const closeBtn = document.querySelector('.site-nav-panel__close');
  if (!btn || !panel) return;

  let lastFocus = null;
  const focusable = () =>
    panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

  function openNav() {
    lastFocus = document.activeElement;
    btn.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('hidden');
    document.documentElement.classList.add('nav-open');
    const first = focusable()[0];
    if (first) first.focus();
  }

  function closeNav() {
    btn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('hidden', '');
    document.documentElement.classList.remove('nav-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    else btn.focus();
  }

  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    if (open) closeNav();
    else openNav();
  });
  closeBtn?.addEventListener('click', closeNav);
  backdrop?.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') closeNav();
  });
})();
```

Extend script with **focus trap** on `Tab` at panel boundary (optional enhancement in same commit: if `Tab` on last element, wrap to first).

- [ ] **Step 4: Search behavior**

In the same script (or a second small block):

- If `window.location.pathname === '/'` or pathname is `/` with trailing slash only: on `input` in `#nav-search-input`, mirror value to `#search-input` if it exists and dispatch `input` so existing `filterPosts` runs; reverse sync optional.
- Else: on `keydown` Enter in nav search, `window.location.href = '/?q=' + encodeURIComponent(input.value)` **or** `location.assign('/')` then on `index` use `DOMContentLoaded` to read `URLSearchParams` — simpler: `location.assign('/#' + ...)` **not** ideal. **Use:** `window.location = '/'` and store pending focus in `sessionStorage.setItem('focusSearch','1')`; in `index.astro` script, if flag set, `searchInput.focus()` and remove flag. Document in commit body.

Pick **one** of: sessionStorage focus hint **or** `/?focus=search` query handled on index. Plan recommends **sessionStorage** key `journal:focus-search` set to `1` before navigation; index script checks and focuses `#search-input`.

- [ ] **Step 5: `/` and ⌘K when drawer-only**

If filter bar search is hidden below `lg` (optional — spec allows keeping search in filter bar): if hidden, extend **existing** `index.astro` keydown listener to call `openNav()` then focus `#nav-search-input`. If search stays visible in filter bar on index at all widths, only ensure keydown does not double-focus.

- [ ] **Step 6: Verify** — `bun run build`. Manual: **360px** open/close, **Tab** cycles, **Escape** closes, backdrop click closes, focus returns to menu button.

- [ ] **Step 7: Commit** — `feat(nav): add responsive hamburger drawer and search handoff`

---

### Task 5: Home page — hero, filter bar, post list

**Files:**

- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Hero section**

Replace inline `display:grid; grid-template-columns:1.15fr 1fr` wrapper with classes, e.g. `class="home-hero"`:

```css
.home-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 2.5rem var(--gutter-x) 2rem;
  border-bottom: 1px solid var(--line);
  align-items: end;
}
@media (min-width: 768px) {
  .home-hero {
    grid-template-columns: 1.15fr 1fr;
    gap: 72px;
    padding: 64px var(--gutter-x) 52px;
  }
}
```

Apply `display-hero` class to `h1` (remove fixed `font-size:68px` inline).

- [ ] **Step 2: Filter bar**

Add wrapper class `home-filter`; use flex-wrap. For sort row:

```css
.home-filter__sort {
  width: 100%;
  margin-left: 0;
}
@media (min-width: 1024px) {
  .home-filter__sort {
    width: auto;
    margin-left: auto;
  }
}
```

- [ ] **Step 3: Post list column header**

Add `class="post-list-header"` to the column header `div`. In CSS:

```css
@media (max-width: 1023px) {
  .post-list-header { display: none !important; }
}
```

- [ ] **Step 4: Post rows — compact layout**

Add `class="post-row"` (already present) and wrap inner columns in spans with BEM classes **or** use a single grid on desktop and flex column on mobile. Recommended: add `post-row__idx`, `post-row__date`, `post-row__main`, `post-row__tag`, `post-row__len`, `post-row__arrow` classes to existing cells.

```css
@media (max-width: 1023px) {
  .post-row {
    display: flex !important;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem 0;
    padding: 1.25rem var(--gutter-x);
  }
  .post-row__idx,
  .post-row__arrow { display: none; }
  .post-row__date { order: 2; font-size: 11px; }
  .post-row__main { order: 1; }
  .post-row__tag { order: 2; display: inline; }
  .post-row__len { order: 2; }
}
```

Consolidate **meta line** on mobile with a single flex row: merge date/tag/length into one line using a wrapper `post-row__meta` in markup (requires small HTML change) — **preferred** for spec “one mono meta line”.

Desktop keeps existing grid via:

```css
@media (min-width: 1024px) {
  .post-row {
    display: grid;
    grid-template-columns: 48px 110px 1fr 150px 90px 24px;
    gap: 24px;
    /* padding etc. from inline or moved to class */
  }
}
```

Move padding/border from inline to `.post-row` class in CSS for both breakpoints to avoid `!important` fights.

- [ ] **Step 5: Dek line-clamp**

```css
@media (max-width: 1023px) {
  .post-row__dek {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

- [ ] **Step 6: Fix `filterPosts` display**

In `index.astro` `<script>`, replace `(row as HTMLElement).style.display = (titleMatch && tagMatch) ? 'grid' : 'none'` with a helper:

```javascript
function rowDisplay(visible) {
  const mq = window.matchMedia('(min-width: 1024px)');
  return visible ? (mq.matches ? 'grid' : 'flex') : 'none';
}
```

Call `rowDisplay(...)` inside `filterPosts`, and add `mq.addEventListener('change', filterPosts)` once so resize updates visibility.

- [ ] **Step 7: Verify** — `bun run build`; manual at **360 / 768 / 1280**; search + tags + row visibility.

- [ ] **Step 8: Commit** — `feat(home): responsive hero, filter bar, and compact post list`

---

### Task 6: Author bio grid

**Files:**

- Modify: `src/components/AuthorBio.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add `class="author-bio"`** to `<section>`; inner grids use `author-bio__grid`, `author-bio__meta`.

```css
.author-bio {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 3.5rem var(--gutter-x);
  border-top: 1px solid var(--line);
  background: var(--surface);
  align-items: start;
}
@media (min-width: 768px) {
  .author-bio {
    grid-template-columns: 1fr 1.4fr;
    gap: 56px;
    padding: 56px var(--gutter-x);
  }
}
.author-bio__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
@media (max-width: 639px) {
  .author-bio__meta {
    grid-template-columns: 1fr;
  }
}
```

Remove duplicate inline `display:grid` where class covers it.

- [ ] **Step 2: Verify** — `bun run build`; **390px** section stacks cleanly.

- [ ] **Step 3: Commit** — `feat(author): stack author bio on narrow viewports`

---

### Task 7: Blog post layout — title, grid, related

**Files:**

- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Title block**

Wrap title block inner in `.page-shell` or replace `padding:72px var(--gutter)` with `padding-top/bottom` + horizontal `var(--gutter-x)`. Apply `display-post-title` to `h1`.

Author strip: add class `post-title__author`; below `480px` use `flex-direction:column; align-items:flex-start`.

- [ ] **Step 2: Three-column collapse**

Wrap the current `grid-template-columns:220px 1fr 220px` container with class `post-body-grid`.

Below `lg`:

```css
@media (max-width: 1023px) {
  .post-body-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2.5rem 0 3rem;
  }
  .post-body-grid > aside.post-aside-left { order: 1; }
  .post-body-grid > article.post-prose { order: 2; }
  .post-body-grid > aside.post-aside-right { order: 3; }
}
@media (min-width: 1024px) {
  .post-body-grid {
    display: grid;
    grid-template-columns: 220px 1fr 220px;
    gap: 56px;
    padding: 56px 0 64px;
  }
  .post-aside-left,
  .post-aside-right {
    position: sticky;
    top: 20px;
    align-self: start;
  }
}
```

- [ ] **Step 3: Wrap left aside in `<details class="post-toc-details">`** for mobile/tablet only: use CSS so on `lg+` the details is always “open” visually — pattern:

```html
<details class="post-toc-details">
  <summary class="post-toc-details__summary">§ contents</summary>
  ... toc + progress ...
</details>
```

```css
.post-toc-details__summary { cursor: pointer; list-style: none; }
.post-toc-details__summary::-webkit-details-marker { display: none; }
@media (min-width: 1024px) {
  .post-toc-details > summary { display: none; }
  .post-toc-details { display: contents; }
}
```

Using `display: contents` on `details` at `lg+` makes children participate in parent grid (verify in **Chrome + Firefox**; if `display:contents` bugs, fallback: duplicate TOC markup hidden on mobile — **only if** QA fails).

- [ ] **Step 4: Related grid**

Replace `repeat(3,1fr)` with class `related-grid`:

```css
.related-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}
@media (min-width: 768px) {
  .related-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .related-grid { grid-template-columns: repeat(3, 1fr); }
}
```

- [ ] **Step 5: Series nav line-clamp**

```css
.series-nav a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 48vw;
}
@media (min-width: 768px) {
  .series-nav a { max-width: none; white-space: normal; }
}
```

- [ ] **Step 6: Verify** — `bun run build`; **375px** post: details opens, article readable, related 1 col.

- [ ] **Step 7: Commit** — `feat(post): responsive title block, TOC details, and related grid`

---

### Task 8: Prose refinements (`BlogPost.astro` global `<style>`)

**Files:**

- Modify: `src/layouts/BlogPost.astro` (the `is:global` style block)

- [ ] **Step 1: Drop cap and headings**

```css
@media (max-width: 767px) {
  .post-prose > p:first-of-type::first-letter {
    font-size: 3rem;
    padding: 4px 8px 0 0;
  }
  .post-prose h2 { font-size: 1.65rem; margin-top: 2rem; }
  .post-prose h3 { font-size: 1.4rem; }
}
```

- [ ] **Step 2: Pre and tables**

```css
.post-prose pre {
  -webkit-overflow-scrolling: touch;
}
.post-prose .table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 1.75rem 0;
  border: 1px solid var(--line);
  border-radius: 4px;
}
.post-prose .table-wrap table { margin: 0; }
```

Add **remark/rehype** or MDX wrapper only if tables exist — **YAGNI path:** add CSS only; if MDX renders bare `<table>`, use:

```css
.post-prose > table {
  display: block;
  overflow-x: auto;
  max-width: 100%;
}
```

Prefer `> table` rule first; add `.table-wrap` only if custom component introduced.

- [ ] **Step 3: Verify** — `bun run build`; spot-check a post with `pre` and optional table.

- [ ] **Step 4: Commit** — `feat(prose): mobile typography and scroll for pre/tables`

---

### Task 9: Series pages

**Files:**

- Modify: `src/pages/series/index.astro`
- Modify: `src/pages/series/[...slug].astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Series index cards**

Add class `series-card` to link row; CSS:

```css
@media (max-width: 639px) {
  .series-card {
    flex-direction: column;
  }
  .series-card img {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}
```

- [ ] **Step 2: Series detail `main`**

Replace fixed `width: 960px` with `.page-shell` or `max-width:960px; margin:0 auto; padding: 1rem var(--gutter-x); width:100%; box-sizing:border-box;`

- [ ] **Step 3: Verify** — `bun run build`; **390px** series index and detail.

- [ ] **Step 4: Commit** — `feat(series): responsive series list and detail shell`

---

### Task 10: Acceptance pass and docs pointer

**Files:**

- Modify: `docs/superpowers/specs/2026-04-23-responsive-design.md` (optional: add line under Testing: “Implemented per plan 2026-04-23-responsive-layout.md”)

- [ ] **Step 1: Run production build**

```bash
bun run build
```

Expected: exit 0.

- [ ] **Step 2: Manual checklist** — Walk through spec §8 every box on Chrome (or Chromium) at widths **360, 390, 768, 1024, 1280, 1440**.

- [ ] **Step 3: Fix regressions** — Any issues found get small focused commits.

- [ ] **Step 4: Final commit** — `chore: complete responsive layout QA` (or amend if trivial doc-only).

---

## Plan self-review

| Spec section | Task coverage |
|--------------|---------------|
| §4 Foundation | Task 1 |
| §5.1 Terminal | Task 2 |
| §5.2 Header / nav / search | Task 4 |
| §5.3 Footer | Task 3 |
| §6.1 Home | Task 5 |
| §6.2 `/blog` archive | Optional in Task 10 if regressions; non-blocking per spec |
| §6.3 Blog post layout | Tasks 7–8 |
| §6.4 Prose | Task 8 |
| §6.5 Series | Task 9 |
| §6.6 About | Inherited via Task 7–8 |
| §6.7 Author bio | Task 6 |
| §7 Accessibility | Task 4 (focus, Escape, scroll lock, reduced motion) |
| §8 Testing | Task 10 |

**Placeholder scan:** No TBD/TODO strings in task bodies. Series breakpoint uses **639px** (`sm` − 1) consistently with foundation `--bp-sm`.

**Consistency:** `nav-open` on `html`; `matchMedia('(min-width: 1024px)')` aligns with `--bp-lg` (1024px).

**Gap closed:** `display:contents` for `<details>` on desktop noted with browser QA fallback.

---

*Plan complete.*
