# Handoff: Bustamam Technology — Engineering Journal

## Overview

A technical blog for **bustamam.technology** — the personal consulting practice of **Rasheed Bustamam**, an independent software consultant based in California. The blog is an "engineering journal" where Rasheed publishes long-form writing on software craft.

Stack target: **Astro** (static site, MDX-backed content, light + dark themes).

## About the Design Files

The HTML files in this bundle are **design references** — React prototypes built to show intended look and behavior. They are not production code to copy directly.

Your job is to **recreate these designs in Astro**, using Astro's content collections for posts and Astro's island architecture for the handful of interactive elements (theme toggle, search, tag filter). Do not ship the React prototypes as-is.

## Fidelity

**High fidelity.** Colors, typography, spacing, and metadata conventions are final. Match pixel-perfectly to the artboards labelled **"Direction A v2"** in `Bustamam Blog.html` — that's the chosen direction. The other artboards (A v1, B, C) are for reference only and should not be implemented.

## Direction Summary — "Terminal Sharp"

A dense, monospace-accented, engineer-first aesthetic. Serif body type for long-form reading; mono for metadata and chrome; sans for UI. Evergreen accent in light mode, electric lime in dark. The visual vocabulary is borrowed from a terminal — window chrome with traffic lights, breadcrumb prompts, bracketed log tags — but the reading experience is editorial (Newsreader serif, generous measure).

## Screens

### 1. Index (`/`)

Layout, top to bottom:

1. **Terminal chrome bar** (34px, full-width). Traffic-light dots on the left; breadcrumb `rasheed@bustamam · ~/journal/writing` next; availability chip (`● available · Q3`) + theme toggle on the right.
2. **Site header** (full-width, 22px vertical padding, 56px horizontal). Brand mark + wordmark `bustamam.technology` on the left (with a colored `.` accent), nav on the right (`writing` · `work` · `about` · `contact` · search box with `⌘K` hint).
3. **Hero** (two-column grid, 1.15fr / 1fr, 72px gutter, 64px / 52px vertical padding).
   - Left: uppercase mono eyebrow (`journal · vol 04 · spring 2026`), display headline in Newsreader (68px, weight 500, `-.028em` tracking, three lines, the word "page you" set in italic + accent color), serif dek paragraph, two mono CTA buttons (`$ read latest →`, `$ hire me`).
   - Right: animated `whoami.sh` terminal card — 4 bracketed log lines (`[WHO]`, `[IDX]`, `[NEW]`, `[OPEN]`) with a rolling UTC timestamp that reshuffles every 1.8s, a blinking cursor on the final `cat journal/latest.md` prompt, and a footer strip reading `since 2019 · an engineering journal`.
4. **Filter bar** (22px vertical, 56px horizontal, light line above and below). Search input (mono, `/` kbd hint), vertical rule, tag pills (mono, 11px, the active one inverts to ink-filled), `sort: recent ↓` on the right.
5. **Column header row** (mono, 10px, uppercase, letter-spacing .12em): `№ · date · title · dek · tag · length`.
6. **Post rows.** Grid: `48px 110px 1fr 150px 90px 24px`, 24px gap, 24px vertical padding. Row contents:
   - Index number (`001`, `002`, …) mono, `.faint`, tabular-nums
   - Date (`Apr 14 2026`) mono, `.mute`, tabular-nums
   - Title (Newsreader, 23px, weight 500, `-.012em`) + dek (Newsreader, 14px, `.mute`, max-width 640)
   - Tag pill (mono, 10px, uppercase, 1px border)
   - Reading time + word count, right-aligned, tabular-nums
   - A faint `→` glyph, right-aligned
   - First row has a subtle surface background to mark it as the newest.
7. **Author bio section** (56px padding, surface-colored). Two-column grid:
   - Left: "§ about the author" eyebrow, avatar (gradient fill + initials `RB`), name in Newsreader 24px, "independent consultant · California" mono caption, short bio paragraph, mono links row (`rss · github · email`).
   - Right: outlined card on the page background. Green dot + "ACCEPTING NEW WORK" chip; big serif sentence: *"Taking on new engagements for Q3 2026. Let's talk about what you're building."*; 2×2 metadata grid (`based in · working · contact · elsewhere`); ink-filled mono CTA `$ start a conversation →`.
8. **Footer** (28px padding, surface). Left: copyright + `rss · json feed · colophon` links. Right: `built with astro · one-person practice` + "all systems nominal" status.

### 2. Post (`/posts/[slug]`)

Layout:

1. Terminal chrome + site header (same as index).
2. **Title block** (72px / 44px padding, border-bottom). Breadcrumb row (mono, `← /writing` · tag pill · date · reading time). Display title in Newsreader (68px, weight 500, `-.025em`). Serif dek (22px, `.mute`). Author strip under a top border: avatar + name + role caption + `↗ share` / `✶ save` buttons.
3. **Body** (three-column grid: `220px 1fr 220px`, 56px gutter, max-width 1280, centered).
   - **Left sidebar (sticky):** "§ contents" eyebrow, mono TOC with `depth:2` entries indented 14px. Active item gets a 2px accent left-border and ink color. "Progress" card below with a 3px progress bar and "X min remaining" caption.
   - **Article:** Newsreader 18px, line-height 1.65. First paragraph gets a serif drop-cap (72px, lowered baseline, accent color). Inline `<code>` gets a chip style (mono, surface background, 1px padding-x:6px, accent-colored text). `<blockquote>` is a flush-left 2px accent rule + italic Newsreader 19px, surface background. Headings: `h2` at 30px / weight 500 / `-.015em`, `h3` at 26px.
   - **Code blocks:** Outlined card, mono 13px, line-height 1.65. Header strip: language label (mono, 10px, uppercase) on the left, "Copy" button (flips to "✓ Copied" for 1.2s) on the right. Line numbers in `.faint`, right-aligned, non-selectable. Simple tokenization: strings and keywords in accent, comments in `.faint` italic.
   - **Right sidebar (sticky):** "Margin notes" — three outlined cards. First: "§ footnote 01" with a short reference. Second: "§ metrics · before" (three rows, danger-colored values). Third: "§ metrics · after" (accent-colored values).
4. **Related posts** (48px padding, border-top, surface). "↳ related writing" eyebrow + 3-up grid of outlined cards — each has tag + reading time header row, serif title, serif dek snippet.
5. Footer.

## Design Tokens

### Palette — Light

| Token | Hex | Use |
|---|---|---|
| `bg` | `#f5f4ef` | Page background |
| `surface` | `#ffffff` | Cards, header chrome, footer, active row |
| `ink` | `#0c0f14` | Primary text, icon strokes |
| `mute` | `#565c66` | Secondary text, body copy |
| `faint` | `#8a8f98` | Tertiary text, line numbers, captions |
| `line` | `#dcdad2` | Borders, rules |
| `lineSoft` | `#e8e6dd` | Row dividers |
| `accent` | `#1f6f43` | Evergreen accent (links, highlights, status) |
| `accentBg` | `#dbeadf` | Accent chip background |
| `accentInk` | `#0f3f23` | Text on accent chip |
| `code` | `#f1efe6` | Code block background |
| `danger` | `#b4432b` | Error indicators |
| `kbd` | `#edebe3` | Keyboard hint background |

### Palette — Dark

| Token | Hex |
|---|---|
| `bg` | `#0a0c10` |
| `surface` | `#10141a` |
| `ink` | `#eceae3` |
| `mute` | `#8a8f98` |
| `faint` | `#5a5f68` |
| `line` | `#1c2129` |
| `lineSoft` | `#141820` |
| `accent` | `#8cff5c` |
| `accentBg` | `#172010` |
| `accentInk` | `#b8ff8a` |
| `code` | `#0d1016` |
| `danger` | `#ff6b4a` |
| `kbd` | `#181c24` |

### Typography

| Token | Family | Source |
|---|---|---|
| `sans` | Geist | Google Fonts |
| `mono` | JetBrains Mono | Google Fonts |
| `serif` | Newsreader | Google Fonts |

Weights to import:
- Geist: 400, 500, 600, 700
- JetBrains Mono: 400, 500, 600
- Newsreader (opsz 6..72): 400, 500, 600, 700; italic 400

Body prose uses Newsreader; post meta, chrome, buttons, TOC use JetBrains Mono; nav and bio use Geist.

### Spacing

Horizontal page gutter: **56px**. Card padding: 20–28px. Row vertical padding: 22–26px. Gaps: 20–24px (row grids), 56–72px (section grids).

### Border radius

Almost everything is `2px` or `3px`. Avatars are `50%`. Never use large pill radii — that's Direction B's vocabulary, not A's.

### Icons

Two hand-drawn SVGs inline — the brand mark (two stacked offset bars forming a "B") and the magnifying glass. Do not import an icon library.

## Interactions & Behavior

| Interaction | Behavior |
|---|---|
| Theme toggle | Persist to `localStorage` under `theme`. Default to `light`. Set `data-theme` on `<html>` and use CSS variables for the two palettes. |
| Search box | Filter the post list client-side by title + tag substring match, case-insensitive. `/` key focuses the input. |
| Tag pills | Filter by exact tag or `kind` match. "All" resets. Single-select. |
| Post row hover | Slightly raise the `lineSoft` divider opacity; the `→` glyph shifts 2px right. |
| Code block "Copy" | Copies to clipboard, flips label to "✓ Copied" for 1.2s. |
| `whoami.sh` terminal | Pure visual; timestamps recompute on a 1.8s interval. No real data. |
| Availability chip | Static for now. |

## Astro Implementation Notes

- **Content collection** `src/content/posts/` with frontmatter matching the fields in `shared-data.jsx`: `title`, `dek`, `date`, `readMin`, `words`, `tag`, `kind`. `words` and `readMin` can be computed at build time from MDX body length if you prefer.
- **Layouts:** `BlogLayout.astro` (index), `PostLayout.astro` (post). Shared `BaseLayout.astro` for chrome + header + footer.
- **Interactive islands** (minimal):
  - `ThemeToggle.astro` — inline `<script>` for pre-paint theme setting, `client:load` for the button.
  - `SearchFilter.tsx` (or Svelte) — one component hydrating the search input, tag pills, and the filtered post list. `client:visible`.
  - `CopyButton.astro` — one per code block, `client:load`.
- **Syntax highlighting:** Astro ships Shiki. Configure a custom two-color theme (accent + faint-italic for comments) or roll your own remark/rehype plugin to match the prototype's minimal look — the prototype's tokenizer is only for demo.
- **Fonts:** Self-host via `@fontsource` packages rather than Google Fonts CDN for better performance.
- **RSS:** `@astrojs/rss` for `/rss.xml`. Also emit `/feed.json` (JSON Feed spec).
- **MDX:** Enable `@astrojs/mdx` so posts can use components (e.g., `<CodeBlock>`, `<PullQuote>`, `<MarginNote>` — all rendered to match the prototype's styles).

## Content

Leave the 10 demo posts in `shared-data.jsx` in place as placeholder content — swap with real posts when ready. The `distributed-locks-without-tears` post has full body content in `direction-a.jsx` you can lift into an example MDX file.

## Files in this bundle

- `Bustamam Blog.html` — entry point; renders the design canvas with all directions. Open this in a browser to see the target.
- `direction-a-v2.jsx` — **the chosen direction.** Study this file most closely.
- `direction-a.jsx` — contains the post-page layout (`DirectionAPost`) which also applies to v2.
- `shared-data.jsx` — posts array, tags, author, date formatter, brand mark SVG.
- `design-canvas.jsx` — canvas wrapper (not needed in production).

Run locally by serving the folder with any static HTTP server and opening `Bustamam Blog.html`.
