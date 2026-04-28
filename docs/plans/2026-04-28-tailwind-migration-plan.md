# Tailwind CSS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Astro blog from custom CSS + inline styles to idiomatic Tailwind CSS v4, with all design tokens in `@theme` and utility classes throughout.

**Architecture:** Phase 1 wires the Tailwind `@theme` token system, switches dark mode from `data-theme` attribute to `.dark` class, and adds backward-compat CSS variable aliases so nothing breaks mid-migration. Phase 2 migrates each component and page file-by-file, deleting CSS from `global.css` as each file is done. Phase 3 removes the compat aliases and any leftover dead CSS.

**Tech Stack:** Astro 5, Tailwind CSS v4 + `@tailwindcss/vite` (already installed), no additional packages needed.

---

## What stays as custom CSS (do not convert to Tailwind utilities)

These stay as named CSS classes in `global.css` because they can't be expressed without `[]` arbitrary syntax:

| Class | Why it stays |
|---|---|
| `.page-shell` | `padding: clamp(1rem, 4vw, 3.5rem)` gutter can't go in a utility |
| `.post-body-grid` | 5-column grid with `minmax(22rem, 48rem)` center track |
| `.display-hero`, `.display-post-title` | `clamp()` font sizes |
| `.site-nav-backdrop`, `.site-nav-panel` | Complex z-index stacking + responsive drawer geometry |
| `.post-row` (desktop grid), `.post-list-header` | 6-column grid with fixed pixel columns |
| `html.nav-open` | JS-toggled scroll lock |
| `.astro-code` Shiki overrides | `!important` dual-theme token injection |
| `@keyframes` (termBlink, shimmer, dialogIn, fadeUp) | Animation definitions |
| `.text-shimmer` | Gradient animation utility |
| `.animate-fade-up` | References `@keyframes fadeUp` |

---

## Task 1: @theme foundation — `global.css`

**Files:**
- Modify: `src/styles/global.css`

**Step 1: Replace the existing `:root` design token blocks with `@theme` + compat aliases**

Replace the two `:root` blocks (lines 9–55 in current `global.css`) with:

```css
/* ── Tailwind theme — design tokens ──────────────── */
@theme {
  /* Colors — generates bg-*, text-*, border-* utilities */
  --color-bg:         #f5f4ef;
  --color-surface:    #ffffff;
  --color-ink:        #0c0f14;
  --color-mute:       #565c66;
  --color-faint:      #8a8f98;
  --color-line:       #dcdad2;
  --color-line-soft:  #e8e6dd;
  --color-accent:     #1f6f43;
  --color-accent-bg:  #dbeadf;
  --color-accent-ink: #0f3f23;
  --color-code:       #f1efe6;
  --color-danger:     #b4432b;
  --color-kbd:        #edebe3;

  /* Fonts — generates font-sans, font-mono, font-serif */
  --font-sans:  'Geist Variable', -apple-system, system-ui, sans-serif;
  --font-mono:  'JetBrains Mono Variable', ui-monospace, Menlo, monospace;
  --font-serif: 'Newsreader Variable', 'Iowan Old Style', Georgia, serif;

  /* Custom text sizes for common UI sizes not in Tailwind's default scale */
  --text-10: 0.625rem;    /* 10px */
  --text-11: 0.6875rem;   /* 11px */
  --text-13: 0.8125rem;   /* 13px */

  /* Custom letter-spacing for the mono UI patterns */
  --tracking-caps:  0.12em;   /* uppercase mono labels */
  --tracking-loose: 0.08em;   /* wider mono text */
  --tracking-snug:  0.02em;   /* base mono tracking */

  /* Gutter spacing — clamp-based, generates px-gutter, py-gutter */
  --spacing-gutter: clamp(1rem, 4vw, 3.5rem);
}

/* ── Dark mode token overrides (on .dark class on <html>) ── */
.dark {
  --color-bg:         #0a0c10;
  --color-surface:    #10141a;
  --color-ink:        #eceae3;
  --color-mute:       #8a8f98;
  --color-faint:      #5a5f68;
  --color-line:       #1c2129;
  --color-line-soft:  #141820;
  --color-accent:     #8cff5c;
  --color-accent-bg:  #172010;
  --color-accent-ink: #b8ff8a;
  --color-code:       #0d1016;
  --color-danger:     #ff6b4a;
  --color-kbd:        #181c24;
}

/* ── Compat aliases — OLD token names pointing to NEW names.
   Remove this block once every component uses Tailwind utilities. ─── */
:root {
  --bg:        var(--color-bg);
  --surface:   var(--color-surface);
  --ink:       var(--color-ink);
  --mute:      var(--color-mute);
  --faint:     var(--color-faint);
  --line:      var(--color-line);
  --line-soft: var(--color-line-soft);
  --accent:    var(--color-accent);
  --accent-bg: var(--color-accent-bg);
  --accent-ink:var(--color-accent-ink);
  --code:      var(--color-code);
  --danger:    var(--color-danger);
  --kbd:       var(--color-kbd);
  --gutter-x:  var(--spacing-gutter);
}
```

**Step 2: Delete the `--bp-*` and `--gutter` variables**

The `--bp-sm/md/lg/xl` custom properties go away (use Tailwind's `sm:`, `md:`, `lg:`, `xl:` prefixes instead). The old `--gutter: 56px` is replaced by `--spacing-gutter` above.

**Step 3: Update remaining custom CSS selectors in `global.css`**

The custom CSS classes that stay (from the "What stays" table above) use `var(--line)`, `var(--bg)`, etc. These still work because of the compat aliases. No changes needed in those blocks yet — they get updated in Task 3 (final cleanup).

Also change the `.site-nav-backdrop` dark override from:
```css
[data-theme='dark'] .site-nav-backdrop { ... }
```
to:
```css
.dark .site-nav-backdrop { ... }
```

**Step 4: Run the dev server and verify the site looks identical**

```bash
bun run dev
```

Open `http://localhost:4321`. Both light and dark themes should look exactly the same as before — the compat aliases bridge the gap. If anything looks broken, check the browser console for CSS variable resolution errors.

**Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(tailwind): add @theme tokens and compat aliases, switch dark to .dark"
```

---

## Task 2: ThemeToggle.astro — switch to `.dark` class

**Files:**
- Modify: `src/components/ThemeToggle.astro`

**Step 1: Update the inline pre-paint script**

Current (runs before CSS paint to prevent flash):
```js
document.documentElement.setAttribute('data-theme', theme);
```
Replace with:
```js
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
```

**Step 2: Update `applyTheme` in the main script**

Current:
```js
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  var isDark = theme === 'dark';
  if (labelLight) labelLight.style.display = isDark ? 'none' : 'inline';
  if (labelDark) labelDark.style.display = isDark ? 'inline' : 'none';
}
var current = document.documentElement.getAttribute('data-theme') || 'light';
```
Replace with:
```js
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
  var isDark = theme === 'dark';
  if (labelLight) labelLight.style.display = isDark ? 'none' : 'inline';
  if (labelDark) labelDark.style.display = isDark ? 'inline' : 'none';
}
var current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
```

**Step 3: Update the toggle click handler**

Current:
```js
var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
```
Replace with:
```js
var next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
```

**Step 4: Convert inline styles to Tailwind**

Current button:
```html
<button
  id="theme-toggle"
  style="background:transparent; border:1px solid var(--line); color:var(--ink); cursor:pointer; font-family:var(--font-mono); font-size:10px; padding:3px 8px; border-radius:2px; letter-spacing:.05em; text-transform:uppercase;"
>
```
Replace with:
```html
<button
  id="theme-toggle"
  class="bg-transparent border border-line text-ink cursor-pointer font-mono text-10 py-0.75 px-2 rounded-sm tracking-wider uppercase"
>
```

Note: `py-0.75` = 3px (0.75 × 4px). Tailwind v4 supports fractional spacing.

**Step 5: Verify toggle works**

Start dev server, click the toggle, confirm the page switches themes correctly. Open DevTools, confirm `<html class="dark">` appears/disappears as expected.

**Step 6: Commit**

```bash
git add src/components/ThemeToggle.astro
git commit -m "feat(tailwind): switch ThemeToggle from data-theme to .dark class"
```

---

## Task 3: BaseLayout.astro — remove `data-theme="light"`

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Step 1: Remove the `data-theme` attribute from `<html>`**

Current:
```html
<html lang="en" data-theme="light">
```
Replace with:
```html
<html lang="en">
```

Light is the default (defined in `@theme`). The pre-paint script in ThemeToggle adds `.dark` if localStorage says dark. No flash.

**Step 2: Verify on hard reload**

Hard-reload the page in dark-preference. Confirm no FOUC (flash of unstyled content). If flash occurs, double-check the ThemeToggle `is:inline` script runs before the `<head>` finishes.

**Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(tailwind): remove data-theme attribute from html root"
```

---

## Task 4: SiteHeader.astro

**Files:**
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/styles/global.css` (delete `.site-header*`, `.site-header__journal`, `.site-header__nav--desktop`, `.site-header__menu-btn` CSS blocks)

**What stays as CSS in `global.css`:** `.site-nav-backdrop`, `.site-nav-panel` (complex z-index + responsive geometry).

**Step 1: Convert the header and its inner wrapper**

```html
<!-- BEFORE -->
<header class="site-header" style="border-bottom:1px solid var(--line); background:var(--bg);">
  <div class="site-header__inner" style="padding:22px var(--gutter-x); display:flex; align-items:center; justify-content:space-between; gap:1rem; max-width:100%; min-width:0;">

<!-- AFTER -->
<header class="border-b border-line bg-bg">
  <div class="px-gutter py-5.5 flex items-center justify-between gap-4 min-w-0">
```

**Step 2: Convert brand area**

```html
<!-- BEFORE -->
<div style="display:flex; align-items:center; gap:14px; min-width:0;">
  <a href="/" style="display:flex; align-items:center; text-decoration:none; min-width:0; padding:8px 0;">
    <BrandLogo />
  </a>
  <div class="site-header__slash" style="height:14px; width:1px; background:var(--line); margin:0 4px; flex-shrink:0;"></div>
  <div class="site-header__journal" style="font-family:var(--font-mono); font-size:11px; color:var(--mute); flex-shrink:0;">/journal</div>
</div>

<!-- AFTER -->
<div class="flex items-center gap-3.5 min-w-0">
  <a href="/" class="flex items-center no-underline min-w-0 py-2">
    <BrandLogo />
  </a>
  <div class="h-3.5 w-px bg-line mx-1 shrink-0"></div>
  <div class="hidden sm:block font-mono text-11 text-mute shrink-0">/journal</div>
</div>
```

**Step 3: Convert menu button**

```html
<!-- BEFORE -->
<button type="button" class="site-header__menu-btn" ...>

<!-- AFTER -->
<button type="button" class="lg:hidden shrink-0" ...>
```
(Keep `id`, `aria-*` attributes unchanged. Remove only the `class="site-header__menu-btn"` which was controlling the `lg:hidden` behavior via CSS.)

**Step 4: Convert desktop nav**

```html
<!-- BEFORE -->
<nav class="site-header__nav site-header__nav--desktop" aria-label="Primary" style="font-family:var(--font-mono); font-size:12px;">
  <a href="/writing" style="color:var(--ink); text-decoration:none;">writing</a>
  <a href="/work" style="color:var(--mute); text-decoration:none;">work</a>
  <a href="/about" style="color:var(--mute); text-decoration:none;">about</a>
  <a href="/contact" style="color:var(--mute); text-decoration:none;">contact</a>
  <div style="display:flex; align-items:center; gap:6px; padding:5px 10px; border:1px solid var(--line); border-radius:2px; color:var(--faint); font-size:11px; cursor:default;">
    <svg .../>
    <span>search</span>
    <span style="font-size:10px; padding:1px 5px; background:var(--kbd); border-radius:2px; color:var(--mute);">⌘K</span>
  </div>
</nav>

<!-- AFTER -->
<nav class="hidden lg:flex items-center gap-7 font-mono text-xs" aria-label="Primary">
  <a href="/writing" class="text-ink no-underline">writing</a>
  <a href="/work" class="text-mute no-underline">work</a>
  <a href="/about" class="text-mute no-underline">about</a>
  <a href="/contact" class="text-mute no-underline">contact</a>
  <div class="flex items-center gap-1.5 py-1.25 px-2.5 border border-line rounded-sm text-faint text-11 cursor-default">
    <svg .../>
    <span>search</span>
    <span class="text-10 py-px px-1.25 bg-kbd rounded-sm text-mute">⌘K</span>
  </div>
</nav>
```

Note: `gap-7` = 28px ✓, `py-1.25` = 5px ✓, `px-2.5` = 10px ✓, `py-px` = 1px ✓, `px-1.25` = 5px ✓.

**Step 5: Convert mobile nav panel top bar and links**

The panel container itself keeps the `site-nav-panel` class (CSS stays). Convert the inner content:

```html
<!-- BEFORE (inside site-nav-panel) -->
<div class="site-nav-panel__top" style="display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:0.5rem;">
  <span style="font-family:var(--font-mono); font-size:12px; color:var(--faint); letter-spacing:0.08em; text-transform:uppercase;">menu</span>
  <button type="button" class="site-nav-panel__close" style="font-family:var(--font-mono); font-size:12px; padding:8px 12px; border:1px solid var(--line); border-radius:2px; background:var(--surface); color:var(--ink); cursor:pointer;">
    close
  </button>
</div>
<nav style="display:flex; flex-direction:column; gap:4px; font-family:var(--font-mono); font-size:14px;">
  <a href="/writing" style="color:var(--ink); text-decoration:none; padding:12px 0; border-bottom:1px solid var(--line-soft);">writing</a>
  ...
</nav>
<div style="margin-top:1.25rem;">
  <label ... style="...display:block; margin-bottom:8px;">search posts</label>
  <input ... style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid var(--line); border-radius:2px; background:var(--surface); font-family:var(--font-mono); font-size:13px; color:var(--ink);" />
</div>

<!-- AFTER -->
<div class="flex items-center justify-between gap-4 mb-2">
  <span class="font-mono text-xs text-faint tracking-loose uppercase">menu</span>
  <button type="button" class="site-nav-panel__close font-mono text-xs py-2 px-3 border border-line rounded-sm bg-surface text-ink cursor-pointer">
    close
  </button>
</div>
<nav class="flex flex-col gap-1 font-mono text-sm" aria-label="Mobile primary">
  <a href="/writing" class="text-ink no-underline py-3 border-b border-line-soft">writing</a>
  <a href="/work" class="text-ink no-underline py-3 border-b border-line-soft">work</a>
  <a href="/about" class="text-ink no-underline py-3 border-b border-line-soft">about</a>
  <a href="/contact" class="text-ink no-underline py-3 border-b border-line-soft">contact</a>
</nav>
<div class="mt-5">
  <label for="nav-search-input" class="font-mono text-10 text-faint tracking-caps uppercase block mb-2">search posts</label>
  <input
    id="nav-search-input"
    type="search"
    ...
    class="w-full box-border py-2.5 px-3 border border-line rounded-sm bg-surface font-mono text-13 text-ink"
  />
</div>
```

**Step 6: Delete CSS from `global.css`**

Delete these blocks from `global.css`:
- `.site-header__menu-btn` + its `@media` rule
- `.site-header__nav--desktop` + its `@media` rule
- `.site-header__journal` + its `@media` rule
- Keep the `<style>` block at the bottom of `SiteHeader.astro` (focus-visible rule) as-is; it is a targeted accessibility rule and is intentionally not migrated to utilities.

**Step 7: Build and verify visually**

```bash
bun run build && bun run preview
```

Check: header layout at mobile, tablet (768px), desktop (1024px). Menu button shows/hides. Drawer opens and closes. Dark mode works.

**Step 8: Commit**

```bash
git add src/components/SiteHeader.astro src/styles/global.css
git commit -m "feat(tailwind): migrate SiteHeader to utility classes"
```

---

## Task 5: SiteFooter.astro

**Files:**
- Modify: `src/components/SiteFooter.astro`
- Modify: `src/styles/global.css` (delete `.site-footer` block)

**Step 1: Convert**

```html
<!-- BEFORE -->
<footer class="site-footer" style="padding:28px var(--gutter-x); border-top:1px solid var(--line); background:var(--surface); font-family:var(--font-mono); font-size:11px; color:var(--mute);">
  <div class="site-footer__group" style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
    <span>© {year} bustamam.tech</span>
    <a href="/rss.xml" style="color:var(--mute); text-decoration:none;">rss</a>
    <a href="/feed.json" style="color:var(--mute); text-decoration:none;">json feed</a>
    <a href="/colophon" style="color:var(--mute); text-decoration:none;">colophon</a>
  </div>
  <div class="site-footer__group" style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
    <span style="color:var(--faint);">built with astro · one-person practice</span>
    <span style="display:inline-flex; align-items:center; gap:6px;">
      <span style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
      all systems nominal
    </span>
  </div>
</footer>

<!-- AFTER -->
<footer class="px-gutter py-7 border-t border-line bg-surface font-mono text-11 text-mute
               flex flex-wrap justify-between items-center gap-4 lg:flex-nowrap">
  <div class="flex gap-5 items-center flex-wrap">
    <span>© {year} bustamam.tech</span>
    <a href="/rss.xml" class="text-mute no-underline">rss</a>
    <a href="/feed.json" class="text-mute no-underline">json feed</a>
    <a href="/colophon" class="text-mute no-underline">colophon</a>
  </div>
  <div class="flex gap-5 items-center flex-wrap max-lg:flex-col max-lg:items-start">
    <span class="text-faint">built with astro · one-person practice</span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
      all systems nominal
    </span>
  </div>
</footer>
```

**Step 2: Delete `.site-footer` CSS from `global.css`** (the flex/wrap/responsive block).

**Step 3: Commit**

```bash
git add src/components/SiteFooter.astro src/styles/global.css
git commit -m "feat(tailwind): migrate SiteFooter to utility classes"
```

---

## Task 6: TerminalChrome.astro

**Files:**
- Modify: `src/components/TerminalChrome.astro`
- Modify: `src/styles/global.css` (delete `.term-chrome__avail` + its `@media` rule)

**Step 1: Convert**

```html
<!-- BEFORE -->
<div class="term-chrome" style="display:flex; align-items:center; height:34px; border-bottom:1px solid var(--line); background:var(--surface); font-family:var(--font-mono); font-size:11px; color:var(--mute); min-width:0;">
  <div style="display:flex; align-items:center; gap:6px; padding:0 14px; border-right:1px solid var(--line); height:100%; flex-shrink:0;">
    <span style="width:7px; height:7px; border-radius:50%; background:var(--danger);"></span>
    <span style="width:7px; height:7px; border-radius:50%; background:var(--faint);"></span>
    <span style="width:7px; height:7px; border-radius:50%; background:var(--accent);"></span>
  </div>
  <div class="term-chrome__crumb" style="padding:0 14px; border-right:1px solid var(--line); height:100%; display:flex; align-items:center; color:var(--ink); letter-spacing:-.01em; flex:1; min-width:0;">
    <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
      rasheed@bustamam <span style="color:var(--faint);"> · </span>~/journal{path}
    </span>
  </div>
  <div class="term-chrome__right" style="padding:0 14px; border-left:1px solid var(--line); height:100%; display:flex; align-items:center; gap:12px; flex-shrink:0; min-width:0;">
    <span style="display:inline-flex; align-items:center; gap:6px; min-width:0;">
      <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
      <span class="term-chrome__avail" style="color:var(--ink);">available · Q3</span>
    </span>
    <span style="color:var(--faint);">·</span>
    <ThemeToggle />
  </div>
</div>

<!-- AFTER -->
<div class="flex items-center h-8.5 border-b border-line bg-surface font-mono text-11 text-mute min-w-0">
  <!-- Traffic lights -->
  <div class="flex items-center gap-1.5 px-3.5 border-r border-line h-full shrink-0">
    <span class="w-1.75 h-1.75 rounded-full bg-danger"></span>
    <span class="w-1.75 h-1.75 rounded-full bg-faint"></span>
    <span class="w-1.75 h-1.75 rounded-full bg-accent"></span>
  </div>
  <!-- Breadcrumb -->
  <div class="px-3.5 border-r border-line h-full flex items-center text-ink tracking-tight flex-1 min-w-0">
    <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
      rasheed@bustamam <span class="text-faint"> · </span>~/journal{path}
    </span>
  </div>
  <!-- Right: availability + theme toggle -->
  <div class="px-3.5 border-l border-line h-full flex items-center gap-3 shrink-0 min-w-0">
    <span class="inline-flex items-center gap-1.5 min-w-0">
      <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
      <span class="sm:inline hidden text-ink overflow-hidden text-ellipsis whitespace-nowrap max-w-28vw sm:max-w-none">available · Q3</span>
    </span>
    <span class="text-faint">·</span>
    <ThemeToggle />
  </div>
</div>
```

Note: `h-8.5` = 34px ✓. `w-1.75` = 7px ✓. `w-1.5` = 6px ✓.

For the `term-chrome__avail` truncation (hidden below sm, truncated up to 28vw on sm, unconstrained above): use `hidden sm:inline` with truncation utilities and add `--spacing-28vw: 28vw` in `@theme`, then use `max-w-28vw sm:max-w-none`.

**Step 2: Delete `.term-chrome__avail` and its `@media` rule from `global.css`.**

**Step 3: Commit**

```bash
git add src/components/TerminalChrome.astro src/styles/global.css
git commit -m "feat(tailwind): migrate TerminalChrome to utility classes"
```

---

## Task 7: BrandLogo.astro + Wordmark.astro

**Files:**
- Modify: `src/components/BrandLogo.astro`
- Modify: `src/components/Wordmark.astro`

**BrandLogo.astro** uses a scoped `<style>` block with `clamp()` for inline-size. This can't become a Tailwind utility without arbitrary values — keep the `<style>` block as-is, but replace `var(--ink)` with `var(--color-ink)`:

```css
/* In BrandLogo.astro <style> */
.brand-logo-wrap {
  display: block;
  color: var(--color-ink);  /* was var(--ink) */
  inline-size: clamp(120px, 16vw, 170px);
  max-inline-size: 170px;
}
.brand-logo-svg {
  display: block;
  inline-size: 100%;
  block-size: auto;
}
```

**Wordmark.astro** is similar — scoped style block with `define:vars`. Replace `var(--ink)` and `var(--accent)` with `var(--color-ink)` and `var(--color-accent)`:

```css
/* In Wordmark.astro <style> */
.wordmark__first { font-weight: 400; color: var(--color-ink); }
.wordmark__dot   { font-weight: 400; color: var(--color-accent); }
.wordmark__last  { font-weight: 700; color: var(--color-ink); }
```

Keep the `.wordmark` scoped `<style>` block because `define:vars` provides the dynamic `size` prop. Update only color references to `var(--color-*)`; do not move font-size logic to utilities in this task.

**Step: Commit**

```bash
git add src/components/BrandLogo.astro src/components/Wordmark.astro
git commit -m "feat(tailwind): update BrandLogo and Wordmark to use color-* tokens"
```

---

## Task 8: AuthorBio.astro

**Files:**
- Modify: `src/components/AuthorBio.astro`
- Modify: `src/styles/global.css` (delete `.author-bio` + `.author-bio__meta` blocks)

**Step 1: Convert the outer section**

```html
<!-- BEFORE -->
<section class="author-bio" style="border-top:1px solid var(--line); background:var(--surface);">

<!-- AFTER -->
<section class="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8 md:gap-14 px-gutter py-14 md:py-14 items-start border-t border-line bg-surface">
```

**Step 2: Convert left column (author profile)**

Pattern for the eyebrow label (very common throughout the site):
```html
<!-- reusable pattern -->
<div class="font-mono text-10 text-faint tracking-caps uppercase mb-4.5">§ about the author</div>
```

Avatar:
```html
<div class="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-ink flex items-center justify-center text-bg font-mono font-semibold text-lg tracking-tight shrink-0">RB</div>
```

Name/role:
```html
<div class="font-serif text-2xl text-ink font-medium tracking-tight">Rasheed Bustamam</div>
<div class="font-mono text-11 text-faint mt-1 tracking-snug">independent consultant · California</div>
```

Bio paragraph:
```html
<p class="font-serif text-base leading-relaxed text-mute m-0 max-w-95">...</p>
```

Links:
```html
<div class="mt-5 flex gap-3.5 font-mono text-11">
  <a href="/rss.xml" class="text-ink no-underline">rss</a>
  <a href="..." class="text-mute no-underline">github</a>
  <a href="..." class="text-mute no-underline">email</a>
</div>
```

**Step 3: Convert right column (availability card)**

```html
<div class="border border-line rounded p-6 px-7 bg-bg">
  <!-- Status badge -->
  <div class="flex items-center gap-2.5 mb-4.5">
    <span class="w-1.75 h-1.75 rounded-full bg-accent shadow-[0_0_0_3px_var(--color-accent-bg)]"></span>
    <span class="font-mono text-11 text-accent-ink tracking-loose uppercase bg-accent-bg py-0.75 px-2 rounded-sm">
      accepting new work
    </span>
  </div>
  <!-- Headline -->
  <p class="font-serif text-2xl text-ink leading-snug tracking-tight m-0 mb-5.5">...</p>
  <!-- Meta grid -->
  <div class="author-bio__meta font-mono text-11 text-mute mb-6">...</div>
  <!-- CTA -->
  <a href="mailto:..." class="inline-block bg-ink text-bg py-2.5 px-4.5 rounded-sm font-mono text-xs tracking-snug no-underline">
    $ start a conversation →
  </a>
</div>
```

The `.author-bio__meta` 2-column grid is still needed for the availability card — keep it as a CSS class or convert to `grid grid-cols-2 gap-5 sm:grid-cols-1`. Given it also has a responsive override (1 col below 640px), use Tailwind: `grid grid-cols-1 sm:grid-cols-2 gap-5`.

**Step 4: Delete `.author-bio` and `.author-bio__meta` from `global.css`.**

**Step 5: Commit**

```bash
git add src/components/AuthorBio.astro src/styles/global.css
git commit -m "feat(tailwind): migrate AuthorBio to utility classes"
```

---

## Task 9: WorkCard.astro + WorkSection.astro + DraftBadge.astro

**Files:**
- Modify: `src/components/WorkCard.astro` (convert scoped `<style>` block)
- Modify: `src/components/WorkSection.astro` (convert scoped `<style>` block)
- Modify: `src/components/DraftBadge.astro` (convert scoped `<style>` block)

**WorkCard.astro** — replace the entire `<style>` block with Tailwind utilities on each element:

```html
<a
  href={`/work/${entry.id}/`}
  class:list={['block no-underline text-inherit border border-line rounded p-5 px-6 bg-surface transition-colors duration-150 hover:border-accent hover:shadow-sm', animated && 'animate-fade-up']}
  style={animated ? `--delay:${delay}` : undefined}
>
  <div class="flex items-center gap-3.5 mb-2.5">
    <div class="w-10 h-10 shrink-0 flex items-center justify-center">
      {logo ? (
        <Image src={logo} alt={`${company} logo`} width={40} height={40}
          class:list={['w-10 h-10 object-contain rounded', darkLogo && 'is-dark']} />
      ) : (
        <div class="w-10 h-10 rounded bg-accent-bg text-accent-ink font-mono text-xs font-semibold flex items-center justify-center">
          {company.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
    <div class="flex-1 min-w-0">
      <div class="font-sans text-sm font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
        {company}{projectName && <span class="font-normal text-mute"> · {projectName}</span>}
      </div>
      <div class="font-mono text-11 text-mute mt-0.5 tracking-snug">{role}</div>
    </div>
  </div>
  <div class="font-mono text-11 text-faint tracking-snug mb-3">{period}{location && <span class="text-faint"> · {location}</span>}</div>
  {badges.length > 0 && (
    <div class="flex flex-wrap gap-1.5 mb-2.5">
      {badges.map((b) => (
        <span class="font-mono text-10 tracking-loose uppercase py-0.5 px-1.75 rounded-sm bg-accent-bg text-accent-ink border border-accent">
          {badgeLabels[b] ?? b}
        </span>
      ))}
    </div>
  )}
  {skills.length > 0 && (
    <div class="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <span class="font-mono text-10 text-mute bg-bg border border-line rounded-sm py-0.5 px-1.75 tracking-snug">
          {s}
        </span>
      ))}
    </div>
  )}
</a>
```

Note: `px-1.75` = 7px ✓. The `hover:shadow-sm` approximates `box-shadow: 0 2px 12px rgba(0,0,0,0.06)`. Replace `[data-theme="dark"] .work-logo.is-dark { ... }` with `.dark .work-logo.is-dark { filter: invert(1) brightness(2); }` in `global.css`.

**WorkSection.astro** — convert scoped styles:

```html
<section class="mb-12">
  <h2 class="animate-fade-up font-mono text-11 font-normal text-faint tracking-caps uppercase m-0 mb-5 pb-2 border-b border-line" style="--delay:100">
    {title}
  </h2>
  <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
    {entries.map(...)}
  </div>
</section>
```

The `auto-fill minmax(300px, 1fr)` grid can't be expressed without `[]`. Keep it as an inline style exactly as shown; do not approximate with fixed responsive columns.

**DraftBadge.astro** — replace scoped `<style>` with Tailwind:

```html
{draft && (
  <span class="inline-block py-0.5 px-2 mr-2 text-xs font-semibold
               text-amber-700 bg-amber-50 border border-amber-400 rounded
               align-middle uppercase tracking-wider
               dark:text-amber-400 dark:bg-amber-400/12 dark:border-amber-400/40">
    Draft
  </span>
)}
```

Note: DraftBadge uses hardcoded amber colors, not design tokens. This is intentional (warning color, not part of the token set). Keep the hardcoded amber palette in this migration.

**Step: Delete** the `<style>` blocks from all three components. Delete `.work-logo.is-dark` from `global.css` and add `.dark .work-logo.is-dark { filter: invert(1) brightness(2); }` to `global.css`.

**Step: Commit**

```bash
git add src/components/WorkCard.astro src/components/WorkSection.astro src/components/DraftBadge.astro src/styles/global.css
git commit -m "feat(tailwind): migrate WorkCard, WorkSection, DraftBadge to utility classes"
```

---

## Task 10: CopyButton.astro

**Files:**
- Modify: `src/components/CopyButton.astro`

CopyButton creates DOM elements in JavaScript using `element.style.cssText`. These can't directly use Tailwind utilities in the template. Instead, assign class names and define them in a `<style is:global>` block.

**Step 1: Replace JS inline styles with class assignments**

```html
<style is:global>
  .copy-wrapper {
    margin: 28px 0;
    background: var(--color-code);
    border: 1px solid var(--color-line);
    border-radius: 4px;
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .copy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 14px;
    border-bottom: 1px solid var(--color-line);
    font-size: 10px;
    color: var(--color-faint);
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .copy-btn {
    background: transparent;
    border: 1px solid var(--color-line);
    color: var(--color-mute);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 2px;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .copy-pre {
    margin: 0;
    padding: 16px 18px;
    line-height: 1.65;
    overflow: auto;
    background: transparent;
    border: none;
    border-radius: 0;
  }
</style>

<script>
  document.querySelectorAll<HTMLElement>('article.post-prose pre').forEach(pre => {
    const wrapper = document.createElement('div');
    wrapper.className = 'copy-wrapper';

    const header = document.createElement('div');
    header.className = 'copy-header';

    const code = pre.querySelector('code');
    const langClass = code?.className.match(/language-(\w+)/)?.[1] ?? '';
    const langLabel = document.createElement('span');
    langLabel.textContent = langClass;
    header.appendChild(langLabel);

    const btn = document.createElement('button');
    btn.textContent = 'copy';
    btn.className = 'copy-btn';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent ?? '');
        btn.textContent = '✓ copied';
        setTimeout(() => { btn.textContent = 'copy'; }, 1200);
      } catch {
        btn.textContent = 'failed';
      }
    });
    header.appendChild(btn);

    pre.className = 'copy-pre';

    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
</script>
```

Note: This uses `var(--color-*)` directly (not compat aliases) since this is new code.

**Step: Commit**

```bash
git add src/components/CopyButton.astro
git commit -m "feat(tailwind): migrate CopyButton JS styles to CSS classes"
```

---

## Task 11: BlogPost.astro layout

**Files:**
- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/styles/global.css` (delete `.post-title-block`, `.post-title__author`, `.post-body-shell`, `.post-body-grid` CSS — but keep `.post-body-grid` as it uses complex minmax)

**Step 1: Convert the post title block**

```html
<!-- BEFORE -->
<div class="post-title-block">
  <div class="page-shell">
    <div style="display:flex; gap:14px; font-family:var(--font-mono); font-size:11px; ...">
      <!-- breadcrumb -->
    </div>
    <h1 class="display-post-title" style="...">
    <p style="font-family:var(--font-serif); font-size:22px; ...">

<!-- AFTER -->
<div class="border-b border-line">
  <div class="page-shell">
    <div style="padding-top: clamp(2.5rem, 6vw, 4.5rem); padding-bottom: clamp(2rem, 4vw, 2.75rem);">
      <div class="flex gap-3.5 font-mono text-11 text-mute tracking-snug mb-7 items-center flex-wrap">
        <a href="/writing" class="text-mute no-underline">← /writing</a>
        ...
      </div>
      <h1 class="display-post-title font-serif font-medium m-0 tracking-tight text-ink max-w-4xl">
        {title}.
      </h1>
      <p class="font-serif text-2xl leading-snug text-mute mt-6 mb-0 max-w-3xl">
        {dek ?? description}
      </p>
```

Note: `.display-post-title` CSS class stays (it uses `clamp()`) — just remove the redundant `font-family`, `color` from the inline style since they're now in the class or as Tailwind utilities.

**Step 2: Convert the author strip**

```html
<!-- AFTER -->
<div class="post-title__author mt-10 flex items-center gap-3.5 pt-6 border-t border-line-soft flex-wrap max-[479px]:flex-col max-[479px]:items-start">
```

The `max-[479px]:` is arbitrary... add a `xs` breakpoint instead:
```css
/* In @theme */
--breakpoint-xs: 480px;
```
Then use `max-xs:flex-col max-xs:items-start`.

**Step 3: Convert the three-column body**

The `.post-body-grid` CSS class stays. Leave `.page-shell.post-body-shell` unchanged. Convert the sidebar content to Tailwind utilities:

```html
<!-- TOC eyebrow -->
<div class="font-mono text-10 text-faint tracking-caps uppercase mb-3.5">§ contents</div>

<!-- TOC links — just add classes, JS still works on .toc-link -->
<a href={`#${h.slug}`} class="toc-link py-0.5 pl-2.5 border-l-2 border-transparent text-mute no-underline leading-snug transition-colors">

<!-- Progress box -->
<div class="mt-8 p-3.5 border border-line rounded bg-surface">
  <div class="font-mono text-10 text-faint tracking-caps uppercase mb-2">progress</div>
  <div class="h-0.75 bg-line-soft rounded overflow-hidden">
    <div id="progress-bar" class="w-0 h-full bg-accent transition-all duration-100"></div>
  </div>
  <div id="progress-label" class="font-mono text-10 text-mute mt-2">{readMin ? `${readMin} min` : ''}</div>
</div>
```

**Step 4: Convert the related posts section**

```html
<!-- BEFORE -->
<div style="padding:48px 0; border-top:1px solid var(--line); background:var(--surface);">
  <div class="page-shell">
    <div style="font-family:var(--font-mono); font-size:10px; ... margin-bottom:20px;">↳ related writing</div>
    <div class="related-grid" style="gap:24px;">
      <a href=... style="display:block; padding:20px 20px 22px; border:...">

<!-- AFTER -->
<div class="py-12 border-t border-line bg-surface">
  <div class="page-shell">
    <div class="font-mono text-10 text-faint tracking-caps uppercase mb-5">↳ related writing</div>
    <div class="related-grid gap-6">
      <a href=... class="block p-5 pb-5.5 border border-line rounded bg-bg no-underline text-inherit">
```

Delete `.related-grid`'s CSS from `global.css` and replace with Tailwind in the template: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Or just put `grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3` directly on the element and remove the class.

**Step 5: Delete from `global.css`**: `.post-title-block`, `.post-body-shell`, `.related-grid`, `.series-nav` (series nav can be Tailwind: `flex justify-between gap-4 font-mono text-xs`). Keep `.post-body-grid`, `.display-post-title`, `.post-toc-details*`.

**Step 6: Update `<style is:global>` prose CSS**

The `[data-theme="dark"]` reference in the prose styles was already non-existent (prose CSS doesn't have a dark override — it uses CSS vars). The prose CSS block stays as global CSS. Update any `var(--ink)` → `var(--color-ink)` references in it, OR leave as-is since compat aliases still work.

For the `.toc-link.active` rule that stays in the `<style is:global>` block:
```css
.toc-link.active {
  color: var(--color-ink) !important;
  border-left-color: var(--color-accent) !important;
}
```

**Step: Commit**

```bash
git add src/layouts/BlogPost.astro src/styles/global.css
git commit -m "feat(tailwind): migrate BlogPost layout to utility classes"
```

---

## Task 12: index.astro (home page)

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css` (delete `.home-hero`, `.home-filter`, `.home-filter__sort`, `.post-list-header`, `.post-row*`)

**Step 1: Convert home hero section**

```html
<!-- BEFORE -->
<section class="home-hero">

<!-- AFTER -->
<section class="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-8 md:gap-18 px-gutter pt-10 pb-8 md:pt-16 md:pb-13 border-b border-line items-end">
```

Convert all inline styles within to Tailwind utilities following the patterns from previous tasks.

**Step 2: Convert filter bar**

```html
<!-- BEFORE -->
<div class="home-filter">

<!-- AFTER -->
<div class="px-gutter py-5.5 border-b border-line bg-bg flex items-center gap-5 flex-wrap">
```

**Tag pills — change JS to class-based approach:**

In the template, initial state uses classes:
```html
<button
  data-tag={tag}
  class:list={['tag-pill font-mono text-11 tracking-snug py-1.25 px-2.5 rounded-sm cursor-pointer border transition-colors',
    i === 0
      ? 'border-ink bg-ink text-bg'
      : 'border-line bg-transparent text-mute']}
>
  {tag.toLowerCase()}
</button>
```

In the `<script>`, replace the `style.*` manipulation with class toggling:
```js
tagPills.forEach(p => {
  const on = p.dataset.tag === activeTag;
  p.classList.toggle('border-ink', on);
  p.classList.toggle('bg-ink', on);
  p.classList.toggle('text-bg', on);
  p.classList.toggle('border-line', !on);
  p.classList.toggle('bg-transparent', !on);
  p.classList.toggle('text-mute', !on);
});
```

**Step 3: Convert post list header**

`.post-list-header` uses a 6-column grid with fixed pixel columns — keep as CSS class. Remove the inline styles within it.

**Step 4: Convert post rows**

`.post-row` uses a 6-column grid at desktop and flex at mobile — keep `.post-row` as CSS class. But convert the inner element inline styles to Tailwind:

```html
<!-- Inner elements inside .post-row -->
<div class="post-row__idx font-mono text-11 text-faint tracking-snug tabular-nums">
<div class="post-row__date font-mono text-11 text-mute tabular-nums">
<div class="post-row__title m-0 font-serif text-[23px] leading-tight font-medium text-ink tracking-tight">
```

Note: `text-[23px]` uses `[]` — instead add `--text-23: 1.4375rem` to `@theme` and use `text-23`. Or round to `text-2xl` (24px) — 1px difference is invisible.

The `style={i === 0 ? 'background:var(--surface)' : undefined}` on the post-row can become a class:
```html
class:list={['post-row', i === 0 && 'bg-surface']}
```

**Step 5: Delete from `global.css`**: `.home-hero`, `.home-filter`, `.home-filter__sort` blocks. Keep `.post-list-header`, `.post-row*` CSS blocks (still needed — they define the grid).

Wait — actually the post row CSS classes ARE staying. Only the full-width section classes (`.home-hero`, `.home-filter`) get removed. The `.post-row`, `.post-list-header`, `.post-row__*` CSS blocks stay since they define the complex 6-column grid and responsive flex behavior.

**Step: Commit**

```bash
git add src/pages/index.astro src/styles/global.css
git commit -m "feat(tailwind): migrate home page to utility classes"
```

---

## Task 13: writing.astro

`writing.astro` is nearly identical to `index.astro` — it uses the same `.home-filter`, `.post-list-header`, `.post-row*` classes and the same tag pill JS.

**Files:**
- Modify: `src/pages/writing.astro`

**Step 1: Remove scoped `<style>` block**

The `.writing-page` and `.writing-header` scoped classes get replaced with Tailwind on the elements:
```html
<div class="page-shell pt-12 pb-20">
  <div class="mb-10">
    <h1 class="font-serif text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-tight text-ink m-0 mb-2.5">Writing.</h1>
```

`font-size: clamp(2rem,5vw,3.5rem)` uses arbitrary value. Add `--text-display-sm: clamp(2rem,5vw,3.5rem)` to `@theme` → use `text-display-sm`. Or reuse `.display-hero` CSS class if the size is close enough.

Apply the same tag pill class-toggle approach from `index.astro`.

**Step: Commit**

```bash
git add src/pages/writing.astro
git commit -m "feat(tailwind): migrate writing page to utility classes"
```

---

## Task 14: Simple content pages — about.astro, contact.astro, colophon.astro

Each has a scoped `<style>` block with page-specific layout. Pattern:

**about.astro:**
```html
<!-- Remove .about-page and .about-prose scoped classes -->
<div class="page-shell pt-12 pb-20 max-w-2xl">
  ...
  <div class="about-prose font-serif text-lg leading-relaxed text-ink">
```

The `.about-prose` has a `::first-letter` pseudo-element (drop cap) that can't be expressed as a Tailwind utility. Keep `.about-prose` as a CSS class in a `<style>` block — just update `var(--ink)` → `var(--color-ink)`.

**contact.astro:**
```html
<div class="page-shell pt-12 pb-20">
  ...
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
    <div class="contact-card p-6 border border-line rounded bg-surface">
    <div class="contact-card sm:col-span-2 p-6 border border-line rounded bg-surface">
```

Delete `.contact-grid`, `.contact-page`, `.contact-card`, `.contact-card--full` scoped styles.

**colophon.astro:**

Update the colophon's description text too — it mentions `data-theme` attribute. Update to reflect the `.dark` class approach:
```
Two themes — light and dark — controlled by a `.dark` class on the root element...
```

Convert `.colophon-page`, `.colophon-sections`, `.colophon-section`, `.colophon-label`, `.colophon-content` to Tailwind:

```html
<div class="page-shell pt-12 pb-20 max-w-2xl">
  ...
  <div class="flex flex-col">
    <div class="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-6 py-7 border-t border-line-soft">
      <div class="font-mono text-10 text-faint tracking-caps uppercase pt-1">§ framework</div>
      <div class="font-serif text-base leading-relaxed text-ink">...</div>
    </div>
```

**Step: Commit each page separately**

```bash
git add src/pages/about.astro && git commit -m "feat(tailwind): migrate about page"
git add src/pages/contact.astro && git commit -m "feat(tailwind): migrate contact page"
git add src/pages/colophon.astro && git commit -m "feat(tailwind): migrate colophon page"
```

---

## Task 15: work/index.astro + work/[...slug].astro

**work/index.astro** — convert scoped `<style>` block:

```html
<main class="max-w-4xl mx-auto px-8 pt-12 pb-16 sm:px-5 sm:pt-8 sm:pb-12">
  <header class="animate-fade-up mb-12" style="--delay:0">
    <h1 class="font-serif text-[clamp(2rem,5vw,3rem)] font-medium tracking-tight text-ink m-0 mb-3">Work</h1>
    <p class="font-serif text-lg text-mute leading-relaxed m-0 max-w-md">
      A record of consulting engagements...
    </p>
  </header>
  ...
</main>
```

**work/[...slug].astro** — convert all inline styles and removable scoped classes to Tailwind utilities using the same pattern as `work/index.astro`; keep only the approved custom CSS exceptions from this plan (`.page-shell`, clamp display classes, keyframes-based animation classes, and Shiki overrides).

**Step: Commit**

```bash
git add src/pages/work/ && git commit -m "feat(tailwind): migrate work pages to utility classes"
```

---

## Task 16: series/index.astro + series/[...slug].astro + blog/[...slug].astro

**series/index.astro** uses stale CSS vars (`var(--gray)`, `var(--color-heading)`, `var(--color-text)`, `var(--color-muted)`) that don't exist in the design token system. These are leftover from the original Astro template. Fix them while migrating:

- `var(--gray)` → replace with `border-line`
- `var(--color-heading)` → replace with `text-ink`
- `var(--color-text)` → replace with `text-mute`
- `var(--color-muted)` → replace with `text-faint`

Convert all scoped styles to Tailwind utilities following established patterns.

**Step: Commit**

```bash
git add src/pages/series/ src/pages/blog/ && git commit -m "feat(tailwind): migrate series and blog slug pages to utility classes"
```

---

## Task 17: Final cleanup

**Files:**
- Modify: `src/styles/global.css`

**Step 1: Remove compat aliases**

Delete the entire `/* Compat aliases */` `:root` block from `global.css`. At this point, nothing should reference `var(--bg)`, `var(--ink)`, etc. anymore — all converted code uses `var(--color-*)` internally via Tailwind utilities, and all remaining custom CSS was updated in earlier tasks.

**Step 2: Search for leftover `var(--` references**

```bash
rg "var\(--(bg|ink|mute|faint|line|accent|surface|code|danger|kbd|font-|gutter)" src -g "*.astro" -g "*.css"
```

Fix any remaining matches by updating them to `var(--color-*)` token names.

**Step 3: Remove the `--gutter` and `--bp-*` `:root` declarations**.

**Step 4: Update `global.css` prose CSS** — the `<style is:global>` in BlogPost still uses `var(--ink)`, `var(--accent)`, etc. Update to `var(--color-ink)`, `var(--color-accent)`, etc.

**Step 5: Build + full visual check**

```bash
bun run build
```

Open the built site (`bun run preview`). Check:
- [ ] Light and dark mode work on every page
- [ ] Post list at mobile, tablet, desktop
- [ ] Blog post with TOC, progress bar, code blocks
- [ ] Work page with animated cards
- [ ] Home hero, filter bar, tag pills
- [ ] Nav drawer on mobile

**Step 6: Final commit**

```bash
git add src/styles/global.css
git commit -m "feat(tailwind): remove compat aliases — migration complete"
```

---

## Quick reference: utility mapping cheat sheet

| Old pattern | Tailwind v4 |
|---|---|
| `font-family:var(--font-mono)` | `font-mono` |
| `font-family:var(--font-serif)` | `font-serif` |
| `font-size:10px` | `text-10` |
| `font-size:11px` | `text-11` |
| `font-size:12px` | `text-xs` |
| `font-size:13px` | `text-13` |
| `font-size:14px` | `text-sm` |
| `color:var(--ink)` | `text-ink` |
| `color:var(--mute)` | `text-mute` |
| `color:var(--faint)` | `text-faint` |
| `color:var(--accent)` | `text-accent` |
| `background:var(--bg)` | `bg-bg` |
| `background:var(--surface)` | `bg-surface` |
| `background:var(--accent-bg)` | `bg-accent-bg` |
| `border:1px solid var(--line)` | `border border-line` |
| `border-bottom:1px solid var(--line)` | `border-b border-line` |
| `border-radius:2px` | `rounded-sm` |
| `border-radius:50%` | `rounded-full` |
| `letter-spacing:.12em` | `tracking-caps` |
| `letter-spacing:.08em` | `tracking-loose` |
| `letter-spacing:.02em` | `tracking-snug` |
| `letter-spacing:.05em` | `tracking-wider` |
| `letter-spacing:-.025em` | `tracking-tight` |
| `text-transform:uppercase` | `uppercase` |
| `display:flex; align-items:center` | `flex items-center` |
| `flex-shrink:0` | `shrink-0` |
| `white-space:nowrap` | `whitespace-nowrap` |
| `padding:var(--gutter-x)` | `px-gutter` |
| `@media (min-width:640px)` | `sm:` prefix |
| `@media (min-width:768px)` | `md:` prefix |
| `@media (min-width:1024px)` | `lg:` prefix |
| `@media (max-width:1023px)` | `max-lg:` prefix |

---

Plan complete and saved to `docs/plans/2026-04-28-tailwind-migration-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
