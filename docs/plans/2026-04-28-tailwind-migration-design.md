# Tailwind CSS Migration Design

**Date:** 2026-04-28
**Status:** Approved

## Goal

Migrate the blog from a custom CSS class + inline-style approach to idiomatic Tailwind CSS v4, achieving:
- Developer ergonomics: write `class="flex items-center gap-4"` instead of `style="display:flex; align-items:center; gap:1rem"`
- Design system enforcement: Tailwind's `@theme` owns all color/font tokens; drift is caught at the utility layer

Tailwind v4 + `@tailwindcss/vite` are already installed. The migration activates them fully.

## Approach: Foundation-first, then full component migration

Two phases. Each component/page migration is a self-contained commit.

### Phase 1 — Foundation

**Token system (`global.css`)**

All design tokens move into a `@theme` block. The `--color-` prefix is required for Tailwind v4 to generate color utilities:

```css
@theme {
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

  --font-sans:  'Geist Variable', -apple-system, system-ui, sans-serif;
  --font-mono:  'JetBrains Mono Variable', ui-monospace, Menlo, monospace;
  --font-serif: 'Newsreader Variable', 'Iowan Old Style', Georgia, serif;
}
```

This generates utilities like `bg-bg`, `text-ink`, `border-line`, `font-mono`, `text-accent` with full IDE autocomplete and no `[]` syntax.

**Dark mode**

- Switch from `[data-theme="dark"]` to `.dark` class on `<html>`
- Dark token overrides move from `[data-theme="dark"] { ... }` to `.dark { ... }`
- Since `bg-bg` resolves to `var(--color-bg)` at runtime, it automatically picks up the dark value — no `dark:bg-[...]` needed for token colors
- `dark:` prefix is still used for structural one-offs not in the token set

**Theme toggle JS**

- `BaseLayout.astro`: remove `data-theme="light"` from `<html>` (light is the default)
- Toggle JS: switch `.dark` class on `document.documentElement` instead of setting `data-theme`

### Phase 2 — Component & Page Migration

Every inline `style` attribute and every custom semantic CSS class in `global.css` is replaced with Tailwind utilities in the template. The corresponding CSS definition is deleted from `global.css`.

**Migration order (each a separate commit):**

1. `global.css` foundation — `@theme`, dark mode, base reset
2. `SiteHeader.astro` + `SiteFooter.astro`
3. `TerminalChrome.astro`, `BrandLogo.astro`, `Wordmark.astro`, `ThemeToggle.astro`
4. `AuthorBio.astro`, `WorkCard.astro`, `WorkSection.astro`, `CopyButton.astro`, `DraftBadge.astro`
5. `BaseLayout.astro`, `BlogPost.astro`
6. Pages: `index.astro`, `writing.astro`, `about.astro`, `work/index.astro`, `colophon.astro`, `contact.astro`, `series/[...slug].astro`, `blog/[...slug].astro`, `work/[...slug].astro`

**Breakpoints:** `sm:` / `md:` / `lg:` / `xl:` replace all manual `@media` blocks. The `--bp-*` custom properties go away.

## What stays as custom CSS

These are not expressible in Tailwind v4 without `[]` arbitrary values, so they remain as CSS classes in `global.css`:

| Class | Reason |
|---|---|
| `.post-body-grid` | 5-column layout with `minmax(22rem, 48rem)` center track |
| `.display-hero`, `.display-post-title` | `clamp()` font sizes |
| `.page-shell` | `--gutter-x: clamp(16px, 4vw, 56px)` padding — CSS var with clamp |
| `.astro-code` Shiki overrides | Dual-theme token injection via `!important` |
| `@keyframes` (termBlink, shimmer, dialogIn, fadeUp) | Kept as CSS; `animate-fade-up` registered via `@layer utilities` |
| `html.nav-open` scroll lock | JS-toggled state, not utility-driven |
| `.text-shimmer` | Complex gradient animation |

## Out of scope

- No `@apply` anywhere — against Tailwind best practices and explicitly excluded
- No `[]` arbitrary value syntax in templates
- No changes to content (MDX/Markdown files)
- No changes to Astro config or integrations
