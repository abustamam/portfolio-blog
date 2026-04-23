# Terminal Sharp Design Identity — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current Bear Blog-derived design with the "Terminal Sharp" (Direction A v2) design identity defined in `design/design_handoff_bustamam_blog/`.

**Architecture:** New CSS-variable-based design token system (light/dark), shared `BaseLayout.astro` wrapping all pages, vanilla-JS Astro islands for interactive elements (theme toggle, search/filter, copy button). No React/Svelte to avoid adding a framework dependency.

**Tech Stack:** Astro 5, Tailwind CSS v4, @fontsource (Geist + JetBrains Mono + Newsreader), Shiki (built-in), MDX.

**Design reference files:**
- `design/design_handoff_bustamam_blog/direction-a-v2.jsx` — chosen direction (index page)
- `design/design_handoff_bustamam_blog/direction-a.jsx` — post page (`DirectionAPost`)
- `design/design_handoff_bustamam_blog/shared-data.jsx` — tokens, brand mark SVG, data shape
- `design/design_handoff_bustamam_blog/README.md` — full spec (pixel values, behavior notes)

---

## Task 1: Install font packages

**Files:**
- Modify: `package.json`

**Step 1: Install via bun**

```bash
cd /media/rasheed-bustamam/Extra/coding/blog
bun add @fontsource-variable/geist @fontsource-variable/jetbrains-mono @fontsource-variable/newsreader
```

`@fontsource-variable/*` packages provide variable fonts with a single woff2 file. If variable versions aren't available for Newsreader, fall back to `@fontsource/newsreader`.

**Step 2: Verify install**

```bash
ls node_modules/@fontsource-variable/
```

Expected: directories for `geist`, `jetbrains-mono`, `newsreader` (or check @fontsource/newsreader if variable not found).

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "feat: add @fontsource variable font packages for Terminal Sharp design"
```

---

## Task 2: Rewrite design tokens in global.css

**Files:**
- Modify: `src/styles/global.css`

Replace the entire file. The new CSS uses `[data-theme="dark"]` on `<html>` (not `class="dark"`).

**Step 1: Write the new global.css**

```css
@import "tailwindcss";

/* ── Font imports ─────────────────────────────────── */
@import "@fontsource-variable/geist";
@import "@fontsource-variable/jetbrains-mono";
@import "@fontsource-variable/newsreader";

/* ── Design tokens — light (default) ─────────────── */
:root {
  --bg:         #f5f4ef;
  --surface:    #ffffff;
  --ink:        #0c0f14;
  --mute:       #565c66;
  --faint:      #8a8f98;
  --line:       #dcdad2;
  --line-soft:  #e8e6dd;
  --accent:     #1f6f43;
  --accent-bg:  #dbeadf;
  --accent-ink: #0f3f23;
  --code:       #f1efe6;
  --danger:     #b4432b;
  --kbd:        #edebe3;

  --font-sans:  'Geist Variable', -apple-system, system-ui, sans-serif;
  --font-mono:  'JetBrains Mono Variable', ui-monospace, Menlo, monospace;
  --font-serif: 'Newsreader Variable', 'Iowan Old Style', Georgia, serif;

  --gutter: 56px;
}

/* ── Design tokens — dark ─────────────────────────── */
[data-theme="dark"] {
  --bg:         #0a0c10;
  --surface:    #10141a;
  --ink:        #eceae3;
  --mute:       #8a8f98;
  --faint:      #5a5f68;
  --line:       #1c2129;
  --line-soft:  #141820;
  --accent:     #8cff5c;
  --accent-bg:  #172010;
  --accent-ink: #b8ff8a;
  --code:       #0d1016;
  --danger:     #ff6b4a;
  --kbd:        #181c24;
}

/* ── Base reset ───────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }

html {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--ink);
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Remove old Bear Blog prose resets — layouts handle their own spacing */
a { color: var(--accent); }
img { max-width: 100%; height: auto; }

/* Utility: screen-reader only */
.sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* Cursor blink used in terminal hero */
@keyframes termBlink { 50% { opacity: 0; } }

/* Post row arrow hover shift */
.post-row:hover .post-arrow { transform: translateX(2px); }
.post-arrow { transition: transform 0.15s ease; }
```

**Step 2: Run dev server and confirm no build errors**

```bash
bun run dev
```

Expected: compiles without errors. The site will look broken visually (old layouts still use old vars) — that's fine.

**Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: replace design tokens with Terminal Sharp CSS variables"
```

---

## Task 3: Pre-paint theme script + ThemeToggle component

This is critical: the theme script must run before paint to avoid flash.

**Files:**
- Create: `src/components/ThemeToggle.astro`

**Step 1: Create ThemeToggle.astro**

```astro
---
// No props — reads/writes data-theme on <html>
---

<button
  id="theme-toggle"
  aria-label="Toggle theme"
  style="background:transparent; border:1px solid var(--line); color:var(--ink); cursor:pointer; font-family:var(--font-mono); font-size:10px; padding:3px 8px; border-radius:2px; letter-spacing:.05em; text-transform:uppercase;"
>
  <span class="theme-label-dark">☾ dark</span>
  <span class="theme-label-light" style="display:none">☀ light</span>
</button>

<!-- Pre-paint inline script: sets data-theme before first render -->
<script is:inline>
  (function() {
    const saved = localStorage.getItem('theme');
    const theme = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>

<script>
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const labelDark = btn.querySelector('.theme-label-dark');
    const labelLight = btn.querySelector('.theme-label-light');

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      const isDark = theme === 'dark';
      labelDark.style.display = isDark ? 'none' : 'inline';
      labelLight.style.display = isDark ? 'inline' : 'none';
    }

    // Sync initial state
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current);

    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  initThemeToggle();
  document.addEventListener('astro:after-swap', initThemeToggle);
</script>
```

**Step 2: Commit**

```bash
git add src/components/ThemeToggle.astro
git commit -m "feat: add ThemeToggle component with pre-paint localStorage sync"
```

---

## Task 4: TerminalChrome component

**Files:**
- Create: `src/components/TerminalChrome.astro`

**Step 1: Create TerminalChrome.astro**

```astro
---
interface Props {
  path?: string;
}
const { path = '/' } = Astro.props;
---

<div style="display:flex; align-items:center; height:34px; border-bottom:1px solid var(--line); background:var(--surface); font-family:var(--font-mono); font-size:11px; color:var(--mute);">
  <!-- Traffic lights -->
  <div style="display:flex; align-items:center; gap:6px; padding:0 14px; border-right:1px solid var(--line); height:100%;">
    <span style="width:7px; height:7px; border-radius:50%; background:var(--danger);"></span>
    <span style="width:7px; height:7px; border-radius:50%; background:var(--faint);"></span>
    <span style="width:7px; height:7px; border-radius:50%; background:var(--accent);"></span>
  </div>
  <!-- Breadcrumb -->
  <div style="padding:0 14px; border-right:1px solid var(--line); height:100%; display:flex; align-items:center; color:var(--ink); letter-spacing:-.01em;">
    rasheed@bustamam <span style="color:var(--faint); margin:0 6px;">·</span> ~/journal{path}
  </div>
  <!-- Spacer -->
  <div style="flex:1;"></div>
  <!-- Right: availability + theme toggle -->
  <div style="padding:0 14px; border-left:1px solid var(--line); height:100%; display:flex; align-items:center; gap:12px;">
    <span style="display:inline-flex; align-items:center; gap:6px;">
      <span style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
      <span style="color:var(--ink);">available · Q3</span>
    </span>
    <span style="color:var(--faint);">·</span>
    <ThemeToggle />
  </div>
</div>

import ThemeToggle from './ThemeToggle.astro';
```

Wait — Astro requires imports in the frontmatter, not at the bottom. Correct version:

```astro
---
import ThemeToggle from './ThemeToggle.astro';

interface Props {
  path?: string;
}
const { path = '/' } = Astro.props;
---

<div style="display:flex; align-items:center; height:34px; border-bottom:1px solid var(--line); background:var(--surface); font-family:var(--font-mono); font-size:11px; color:var(--mute);">
  <div style="display:flex; align-items:center; gap:6px; padding:0 14px; border-right:1px solid var(--line); height:100%;">
    <span style="width:7px; height:7px; border-radius:50%; background:var(--danger);"></span>
    <span style="width:7px; height:7px; border-radius:50%; background:var(--faint);"></span>
    <span style="width:7px; height:7px; border-radius:50%; background:var(--accent);"></span>
  </div>
  <div style="padding:0 14px; border-right:1px solid var(--line); height:100%; display:flex; align-items:center; color:var(--ink); letter-spacing:-.01em;">
    rasheed@bustamam <span style="color:var(--faint); margin:0 6px;">·</span> ~/journal{path}
  </div>
  <div style="flex:1;"></div>
  <div style="padding:0 14px; border-left:1px solid var(--line); height:100%; display:flex; align-items:center; gap:12px;">
    <span style="display:inline-flex; align-items:center; gap:6px;">
      <span style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
      <span style="color:var(--ink);">available · Q3</span>
    </span>
    <span style="color:var(--faint);">·</span>
    <ThemeToggle />
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/components/TerminalChrome.astro
git commit -m "feat: add TerminalChrome bar component"
```

---

## Task 5: SiteHeader component

**Files:**
- Create: `src/components/SiteHeader.astro`

The brand mark SVG comes from `shared-data.jsx`: two stacked offset rectangles.

**Step 1: Create SiteHeader.astro**

```astro
---
// No props
---

<header style="display:flex; align-items:center; justify-content:space-between; padding:22px var(--gutter); border-bottom:1px solid var(--line); background:var(--bg);">
  <!-- Brand -->
  <div style="display:flex; align-items:center; gap:14px;">
    <a href="/" style="display:flex; align-items:center; gap:14px; text-decoration:none;">
      <!-- Bustamam mark: two offset stacked bars -->
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="14" height="7.5" rx="1" stroke="var(--ink)" stroke-width="1.6"/>
        <rect x="7" y="13.5" width="14" height="7.5" rx="1" stroke="var(--ink)" stroke-width="1.6"/>
      </svg>
      <div style="font-family:var(--font-mono); font-size:13px; color:var(--ink); font-weight:500; letter-spacing:-.01em;">
        bustamam<span style="color:var(--accent);">.</span>technology
      </div>
    </a>
    <div style="height:14px; width:1px; background:var(--line); margin:0 4px;"></div>
    <div style="font-family:var(--font-mono); font-size:11px; color:var(--mute);">/journal</div>
  </div>
  <!-- Nav -->
  <nav style="display:flex; align-items:center; gap:28px; font-family:var(--font-mono); font-size:12px;">
    <a href="/" style="color:var(--ink); text-decoration:none;">writing</a>
    <a href="/work" style="color:var(--mute); text-decoration:none;">work</a>
    <a href="/about" style="color:var(--mute); text-decoration:none;">about</a>
    <a href="/contact" style="color:var(--mute); text-decoration:none;">contact</a>
    <!-- Search hint (decorative — wired up in SearchFilter) -->
    <div id="search-trigger" style="display:flex; align-items:center; gap:6px; padding:5px 10px; border:1px solid var(--line); border-radius:2px; color:var(--faint); font-size:11px; cursor:pointer;">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>search</span>
      <span style="font-size:10px; padding:1px 5px; background:var(--kbd); border-radius:2px; color:var(--mute);">⌘K</span>
    </div>
  </nav>
</header>
```

**Step 2: Commit**

```bash
git add src/components/SiteHeader.astro
git commit -m "feat: add SiteHeader component with brand mark and nav"
```

---

## Task 6: SiteFooter component

**Files:**
- Create: `src/components/SiteFooter.astro`

**Step 1: Create SiteFooter.astro**

```astro
---
const year = new Date().getFullYear();
---

<footer style="padding:28px var(--gutter); border-top:1px solid var(--line); background:var(--surface); display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:11px; color:var(--mute);">
  <div style="display:flex; gap:20px; align-items:center;">
    <span>© {year} bustamam.technology</span>
    <a href="/rss.xml" style="color:var(--mute); text-decoration:none;">rss</a>
    <a href="/feed.json" style="color:var(--mute); text-decoration:none;">json feed</a>
    <a href="/colophon" style="color:var(--mute); text-decoration:none;">colophon</a>
  </div>
  <div style="display:flex; gap:20px; align-items:center;">
    <span style="color:var(--faint);">built with astro · one-person practice</span>
    <span style="display:inline-flex; align-items:center; gap:6px;">
      <span style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
      all systems nominal
    </span>
  </div>
</footer>
```

**Step 2: Commit**

```bash
git add src/components/SiteFooter.astro
git commit -m "feat: add SiteFooter component"
```

---

## Task 7: BaseLayout.astro

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Modify: `src/components/BaseHead.astro`

**Step 1: Update BaseHead.astro to import fonts**

Add to the `<head>` in `BaseHead.astro` — remove the old `@font-face` Atkinson imports and rely on global.css @import instead. The `<link rel="preconnect">` tags for Google Fonts should be removed too. The file just needs its `<meta>` and `<title>` tags; fonts come from global.css.

Read `src/components/BaseHead.astro` first to see what's there, then remove any Google Fonts `<link>` tags or `@font-face` inline styles.

**Step 2: Create BaseLayout.astro**

```astro
---
import BaseHead from '../components/BaseHead.astro';
import TerminalChrome from '../components/TerminalChrome.astro';
import SiteHeader from '../components/SiteHeader.astro';
import SiteFooter from '../components/SiteFooter.astro';

interface Props {
  title: string;
  description: string;
  chromePath?: string;
}

const { title, description, chromePath = '/writing' } = Astro.props;
---

<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <BaseHead title={title} description={description} />
  </head>
  <body>
    <TerminalChrome path={chromePath} />
    <SiteHeader />
    <slot />
    <SiteFooter />
  </body>
</html>
```

Note: `data-theme="light"` is the default; the pre-paint script in ThemeToggle will immediately correct it to `dark` if saved preference is dark — before first paint.

**Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/BaseHead.astro
git commit -m "feat: add BaseLayout combining chrome, header, and footer"
```

---

## Task 8: Update content schema

The new design needs `dek`, `tag`, `kind`, `readMin`, `words`. Existing posts use `description` and `pubDate`. Add new fields as optional and keep the existing fields for backward compat.

**Files:**
- Modify: `src/content.config.ts`

**Step 1: Update schema**

```typescript
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      series: z.string().optional(),
      seriesOrder: z.number().optional(),
      draft: z.boolean().optional(),
      // New Terminal Sharp fields
      dek: z.string().optional(),           // subtitle / pull quote
      tag: z.string().optional(),           // primary topic tag
      kind: z.string().optional(),          // Essay | Teardown | Case Study
      readMin: z.number().optional(),       // estimated reading time in minutes
      words: z.number().optional(),         // approximate word count
    }),
});
```

**Step 2: Run build to verify schema compiles**

```bash
bun run build 2>&1 | head -30
```

Expected: no type errors related to schema.

**Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: add dek, tag, kind, readMin, words fields to blog schema"
```

---

## Task 9: Update existing blog post frontmatter

**Files:**
- Modify: `src/content/blog/url-shortener-phase-1-baseline.md`
- Modify: `src/content/blog/url-shortener-phase-2-redis.md`

Read each file first to see existing frontmatter, then add the new fields. Estimate `readMin` from content length (roughly 200 wpm; check word count with `wc -w`).

```bash
wc -w src/content/blog/url-shortener-phase-1-baseline.md
wc -w src/content/blog/url-shortener-phase-2-redis.md
```

For each file, add to frontmatter:

```yaml
dek: "<one-sentence description lifted from the post's opening paragraph>"
tag: "Infrastructure"      # or Architecture / Distributed Systems / etc.
kind: "Case Study"          # or Essay / Teardown
readMin: <words / 200, rounded>
words: <word count>
```

**Step: Commit**

```bash
git add src/content/blog/
git commit -m "feat: add dek/tag/kind/readMin/words to existing blog posts"
```

---

## Task 10: AuthorBio component

**Files:**
- Create: `src/components/AuthorBio.astro`

**Step 1: Create AuthorBio.astro**

```astro
---
// Static — no props
---

<section style="padding:56px var(--gutter); border-top:1px solid var(--line); background:var(--surface); display:grid; grid-template-columns:1fr 1.4fr; gap:56px; align-items:start;">
  <!-- Left: author profile -->
  <div>
    <div style="font-family:var(--font-mono); font-size:10px; color:var(--faint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:18px;">
      § about the author
    </div>
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
      <div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--ink)); display:flex; align-items:center; justify-content:center; color:var(--bg); font-family:var(--font-mono); font-weight:600; font-size:18px; letter-spacing:-.02em; flex-shrink:0;">
        RB
      </div>
      <div>
        <div style="font-family:var(--font-serif); font-size:24px; color:var(--ink); font-weight:500; letter-spacing:-.015em;">Rasheed Bustamam</div>
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--faint); margin-top:4px; letter-spacing:.02em;">
          independent consultant · California
        </div>
      </div>
    </div>
    <p style="font-family:var(--font-serif); font-size:16px; line-height:1.6; color:var(--mute); margin:0; max-width:380px;">
      I'm a one-person software consultancy based in California. This is my notebook —
      writing on the craft and the decisions behind the code.
    </p>
    <div style="margin-top:20px; display:flex; gap:14px; font-family:var(--font-mono); font-size:11px;">
      <a href="/rss.xml" style="color:var(--ink); text-decoration:none;">rss</a>
      <a href="https://github.com/rasheed-bustamam" style="color:var(--mute); text-decoration:none;">github</a>
      <a href="mailto:rasheed@bustamam.technology" style="color:var(--mute); text-decoration:none;">email</a>
    </div>
  </div>

  <!-- Right: availability card -->
  <div style="border:1px solid var(--line); border-radius:3px; padding:24px 28px; background:var(--bg);">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
      <span style="width:7px; height:7px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 3px var(--accent-bg);"></span>
      <span style="font-family:var(--font-mono); font-size:11px; color:var(--accent-ink); letter-spacing:.1em; text-transform:uppercase; background:var(--accent-bg); padding:3px 8px; border-radius:2px;">
        accepting new work
      </span>
    </div>
    <p style="font-family:var(--font-serif); font-size:22px; color:var(--ink); line-height:1.35; letter-spacing:-.01em; margin:0 0 22px;">
      Taking on new engagements for <em style="font-style:italic; color:var(--accent);">Q3 2026</em>.
      Let's talk about what you're building.
    </p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-family:var(--font-mono); font-size:11px; color:var(--mute); margin-bottom:24px;">
      <div>
        <div style="color:var(--faint); font-size:10px; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px;">based in</div>
        <div style="color:var(--ink);">California</div>
      </div>
      <div>
        <div style="color:var(--faint); font-size:10px; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px;">working</div>
        <div style="color:var(--ink);">remote</div>
      </div>
      <div>
        <div style="color:var(--faint); font-size:10px; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px;">contact</div>
        <div style="color:var(--ink);">rasheed@bustamam.technology</div>
      </div>
      <div>
        <div style="color:var(--faint); font-size:10px; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px;">elsewhere</div>
        <div style="color:var(--ink);">github · rss</div>
      </div>
    </div>
    <a href="mailto:rasheed@bustamam.technology" style="display:inline-block; background:var(--ink); color:var(--bg); border:none; padding:10px 18px; border-radius:2px; cursor:pointer; font-family:var(--font-mono); font-size:12px; letter-spacing:.02em; text-decoration:none;">
      $ start a conversation →
    </a>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add src/components/AuthorBio.astro
git commit -m "feat: add AuthorBio component with availability card"
```

---

## Task 11: Rebuild index.astro — Hero + post list + filter

This is the largest component. The `SearchFilter` interactivity uses a vanilla JS `<script>` inside Astro — no framework needed.

**Files:**
- Modify: `src/pages/index.astro`
- Delete (or keep for now): `src/components/Header.astro`, `src/components/Footer.astro`

**Step 1: Read the current index.astro and blog/index.astro**

Read both files first, then replace `src/pages/index.astro` with the new design. The new index renders all published posts directly on the homepage (the blog listing IS the homepage).

**Step 2: Write new index.astro**

The new homepage:
1. Uses `BaseLayout`
2. Renders hero section
3. Renders filter bar (search input + tag pills)
4. Renders column header row
5. Renders post rows (all posts, filtered client-side via JS)
6. Renders `AuthorBio`

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import AuthorBio from '../components/AuthorBio.astro';

const allPosts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

function fmtDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(date);
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')} ${d.getFullYear()}`;
}

// Derive unique tags from posts
const tags = ['All', ...Array.from(new Set(allPosts.map(p => p.data.tag).filter(Boolean)))];
---

<BaseLayout title="Rasheed Bustamam — Engineering Journal" description="Long-form writing on software craft, distributed systems, and independent consulting.">

  <!-- Hero -->
  <section style="padding:64px var(--gutter) 52px; border-bottom:1px solid var(--line); display:grid; grid-template-columns:1.15fr 1fr; gap:72px; align-items:end;">
    <!-- Left -->
    <div>
      <div style="display:inline-flex; align-items:center; gap:10px; padding:5px 12px; background:var(--accent-bg); color:var(--accent-ink); border-radius:2px; font-family:var(--font-mono); font-size:11px; letter-spacing:.08em; text-transform:uppercase; margin-bottom:32px;">
        <span style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span>
        journal · vol 04 · spring 2026
      </div>
      <h1 style="font-family:var(--font-serif); font-weight:500; font-size:68px; line-height:.96; margin:0; color:var(--ink); letter-spacing:-.028em;">
        I build software<br/>
        that doesn't <em style="font-style:italic; color:var(--accent); font-weight:500;">page you</em><br/>
        on a Sunday.
      </h1>
      <p style="margin-top:26px; max-width:500px; font-family:var(--font-serif); font-size:18px; line-height:1.55; color:var(--mute);">
        I'm <span style="color:var(--ink);">Rasheed Bustamam</span> — an independent software
        consultant based in California. This is my notebook.
        Writing on the craft and the decisions behind the code.
      </p>
      <div style="display:flex; gap:14px; margin-top:32px; font-family:var(--font-mono); font-size:12px;">
        <a href={`/blog/${allPosts[0]?.id}/`} style="background:var(--ink); color:var(--bg); border:1px solid var(--ink); padding:9px 16px; border-radius:2px; cursor:pointer; font-family:var(--font-mono); font-size:12px; letter-spacing:.02em; text-decoration:none;">
          $ read latest <span style="color:var(--accent); margin-left:4px;">→</span>
        </a>
        <a href="mailto:rasheed@bustamam.technology" style="background:transparent; color:var(--ink); border:1px solid var(--line); padding:9px 16px; border-radius:2px; font-family:var(--font-mono); font-size:12px; letter-spacing:.02em; text-decoration:none;">
          $ hire me
        </a>
      </div>
    </div>

    <!-- Right: terminal card -->
    <div id="hero-terminal" style="background:var(--code); border:1px solid var(--line); border-radius:4px; font-family:var(--font-mono); font-size:12px; overflow:hidden;">
      <div style="padding:8px 14px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; color:var(--faint); font-size:10px; letter-spacing:.08em; text-transform:uppercase;">
        <span>whoami.sh</span><span>● online</span>
      </div>
      <div style="padding:18px 16px 20px;">
        <div class="term-line" data-tag="WHO" data-msg="rasheed bustamam · independent consultant · california" style="display:flex; gap:10px; margin-bottom:10px; color:var(--mute);">
          <span class="term-ts" style="color:var(--faint);"></span>
          <span style="color:var(--ink);">[WHO]</span>
          <span>rasheed bustamam · independent consultant · california</span>
        </div>
        <div class="term-line" data-tag="IDX" data-msg="engineering journal · since 2019" style="display:flex; gap:10px; margin-bottom:10px; color:var(--mute);">
          <span class="term-ts" style="color:var(--faint);"></span>
          <span style="color:var(--ink);">[IDX]</span>
          <span>engineering journal · since 2019</span>
        </div>
        <div class="term-line" data-tag="NEW" data-msg="latest post" style="display:flex; gap:10px; margin-bottom:10px; color:var(--mute);">
          <span class="term-ts" style="color:var(--faint);"></span>
          <span style="color:var(--accent); font-weight:600;">[NEW]</span>
          <span style="color:var(--ink);">{allPosts[0]?.data.title.toLowerCase() ?? 'no posts yet'}</span>
        </div>
        <div class="term-line" data-tag="OPEN" data-msg="taking on new engagements for q3 2026" style="display:flex; gap:10px; margin-bottom:10px; color:var(--mute);">
          <span class="term-ts" style="color:var(--faint);"></span>
          <span style="color:var(--accent); font-weight:600;">[OPEN]</span>
          <span style="color:var(--ink);">taking on new engagements for q3 2026</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:14px; color:var(--ink); align-items:center;">
          <span style="color:var(--accent);">$</span>
          <span>cat journal/latest.md<span style="display:inline-block; width:7px; height:13px; background:var(--accent); margin-left:4px; vertical-align:middle; animation:termBlink 1s step-end infinite;"></span></span>
        </div>
      </div>
      <div style="padding:12px 14px; border-top:1px solid var(--line); display:flex; align-items:center; gap:10px; font-size:10px; color:var(--faint); letter-spacing:.08em; text-transform:uppercase;">
        <span style="color:var(--ink); font-family:var(--font-mono); letter-spacing:0; font-size:13px; font-weight:500;">since 2019</span>
        <span>·</span>
        <span>an engineering journal</span>
      </div>
    </div>
  </section>

  <!-- Filter bar -->
  <div style="padding:22px var(--gutter); border-bottom:1px solid var(--line); background:var(--bg); display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
    <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid var(--line); border-radius:2px; background:var(--surface); min-width:280px;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="color:var(--mute);">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input id="search-input" placeholder="grep titles, tags, years..." style="border:none; outline:none; background:transparent; flex:1; font-family:var(--font-mono); font-size:12px; color:var(--ink); width:100%;" />
      <span style="font-family:var(--font-mono); font-size:10px; padding:2px 6px; background:var(--kbd); color:var(--mute); border-radius:2px;">/</span>
    </div>
    <div style="height:18px; width:1px; background:var(--line);"></div>
    <div id="tag-filters" style="display:flex; gap:6px; flex-wrap:wrap;">
      {tags.map(tag => (
        <button
          data-tag={tag}
          class="tag-pill"
          style={`font-family:var(--font-mono); font-size:11px; letter-spacing:.02em; padding:5px 10px; border-radius:2px; cursor:pointer; border:1px solid ${tag === 'All' ? 'var(--ink)' : 'var(--line)'}; background:${tag === 'All' ? 'var(--ink)' : 'transparent'}; color:${tag === 'All' ? 'var(--bg)' : 'var(--mute)'};`}
        >
          {tag.toLowerCase()}
        </button>
      ))}
    </div>
    <div style="margin-left:auto; font-family:var(--font-mono); font-size:11px; color:var(--faint);">
      sort: <span style="color:var(--ink);">recent ↓</span>
    </div>
  </div>

  <!-- Column header row -->
  <div style="display:grid; grid-template-columns:48px 110px 1fr 150px 90px 24px; gap:24px; padding:14px var(--gutter); border-bottom:1px solid var(--line); font-family:var(--font-mono); font-size:10px; color:var(--faint); letter-spacing:.12em; text-transform:uppercase;">
    <div>№</div><div>date</div><div>title · dek</div><div>tag</div><div style="text-align:right;">length</div><div></div>
  </div>

  <!-- Post list -->
  <div id="post-list">
    {allPosts.map((post, i) => (
      <a
        href={`/blog/${post.id}/`}
        class="post-row"
        data-title={post.data.title.toLowerCase()}
        data-tag={post.data.tag ?? ''}
        data-kind={post.data.kind ?? ''}
        style={`display:grid; grid-template-columns:48px 110px 1fr 150px 90px 24px; gap:24px; align-items:baseline; padding:24px var(--gutter); border-bottom:1px solid var(--line-soft); background:${i === 0 ? 'var(--surface)' : 'transparent'}; cursor:pointer; text-decoration:none; color:inherit;`}
      >
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--faint); letter-spacing:.05em; font-variant-numeric:tabular-nums;">
          {String(i + 1).padStart(3, '0')}
        </div>
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--mute); font-variant-numeric:tabular-nums;">
          {fmtDate(post.data.pubDate)}
        </div>
        <div>
          <h3 style="margin:0; font-family:var(--font-serif); font-size:23px; line-height:1.15; font-weight:500; color:var(--ink); letter-spacing:-.012em;">
            {post.data.title}
          </h3>
          <p style="margin:6px 0 0; font-family:var(--font-serif); font-size:14px; line-height:1.5; color:var(--mute); max-width:640px;">
            {post.data.dek ?? post.data.description}
          </p>
        </div>
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--mute);">
          {post.data.tag && (
            <span style="padding:2px 7px; border:1px solid var(--line); color:var(--ink); border-radius:2px; letter-spacing:.04em; font-size:10px; text-transform:uppercase;">
              {post.data.tag}
            </span>
          )}
        </div>
        <div style="font-family:var(--font-mono); font-size:11px; display:flex; flex-direction:column; align-items:flex-end; gap:2px; text-align:right; font-variant-numeric:tabular-nums;">
          {post.data.readMin && <span style="color:var(--ink);">{post.data.readMin} min</span>}
          {post.data.words && <span style="color:var(--faint);">{post.data.words.toLocaleString()} w</span>}
        </div>
        <div class="post-arrow" style="color:var(--faint); font-family:var(--font-mono); font-size:14px; align-self:center; text-align:right;">→</div>
      </a>
    ))}
  </div>

  <AuthorBio />
</BaseLayout>

<script>
  // Client-side search + tag filter
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const tagPills = document.querySelectorAll<HTMLButtonElement>('.tag-pill');
  const rows = document.querySelectorAll<HTMLAnchorElement>('.post-row');

  let activeTag = 'All';

  function filterPosts() {
    const q = searchInput.value.toLowerCase();
    rows.forEach(row => {
      const titleMatch = !q || row.dataset.title?.includes(q);
      const tagMatch = activeTag === 'All' || row.dataset.tag === activeTag || row.dataset.kind === activeTag;
      row.style.display = (titleMatch && tagMatch) ? 'grid' : 'none';
    });
  }

  // Tag pill active state
  tagPills.forEach(pill => {
    pill.addEventListener('click', () => {
      activeTag = pill.dataset.tag ?? 'All';
      tagPills.forEach(p => {
        const on = p.dataset.tag === activeTag;
        p.style.border = `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`;
        p.style.background = on ? 'var(--ink)' : 'transparent';
        p.style.color = on ? 'var(--bg)' : 'var(--mute)';
      });
      filterPosts();
    });
  });

  searchInput.addEventListener('input', filterPosts);

  // '/' key focuses search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // ⌘K focuses search
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Terminal timestamps — reshuffles every 1.8s
  function updateTerminalTimestamps() {
    const lines = document.querySelectorAll<HTMLElement>('.term-ts');
    lines.forEach((el, i) => {
      const ts = new Date(Date.now() - (lines.length - i) * 2000);
      el.textContent = ts.toISOString().slice(11, 19);
    });
  }
  updateTerminalTimestamps();
  setInterval(updateTerminalTimestamps, 1800);
</script>
```

**Step 2: Run dev server and visually inspect**

```bash
bun run dev
```

Open http://localhost:4321 and verify:
- Terminal chrome bar renders at top
- Site header with brand + nav
- Hero section with headline and terminal card
- Filter bar with search + tag pills
- Post list rows (empty if no posts yet, will populate after Task 9)
- Author bio section
- Footer

**Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: implement Terminal Sharp index page with hero, filter, and post list"
```

---

## Task 12: CopyButton component

**Files:**
- Create: `src/components/CopyButton.astro`

**Step 1: Create CopyButton.astro**

```astro
---
interface Props {
  lang?: string;
}
const { lang = '' } = Astro.props;
---

<div class="code-block-wrapper" style="margin:28px 0; background:var(--code); border:1px solid var(--line); border-radius:4px; overflow:hidden; font-family:var(--font-mono); font-size:13px;">
  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 14px; border-bottom:1px solid var(--line); font-size:10px; color:var(--faint); letter-spacing:.08em; text-transform:uppercase;">
    <span>{lang}</span>
    <button class="copy-btn" style="background:transparent; border:1px solid var(--line); color:var(--mute); cursor:pointer; font-family:var(--font-mono); font-size:10px; padding:2px 8px; border-radius:2px; letter-spacing:.05em; text-transform:uppercase;">
      copy
    </button>
  </div>
  <slot />
</div>

<script>
  document.querySelectorAll<HTMLElement>('.code-block-wrapper').forEach(wrapper => {
    const btn = wrapper.querySelector<HTMLButtonElement>('.copy-btn');
    const pre = wrapper.querySelector('pre');
    if (!btn || !pre) return;

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent ?? '');
        btn.textContent = '✓ copied';
        setTimeout(() => { btn.textContent = 'copy'; }, 1200);
      } catch {
        btn.textContent = 'failed';
      }
    });
  });
</script>
```

Note: Shiki wraps code blocks in `<pre><code>` automatically. This CopyButton wraps those at the Astro layout level. See Task 15 for integration into the post layout's remark/rehype pipeline.

**Step 2: Commit**

```bash
git add src/components/CopyButton.astro
git commit -m "feat: add CopyButton component for code blocks"
```

---

## Task 13: Rewrite PostLayout (post page)

**Files:**
- Modify: `src/layouts/BlogPost.astro`

The post layout uses the three-column grid: TOC sidebar (sticky left) + article body + margin notes (sticky right). The TOC is generated from the post's headings — in Astro this can be done with the `headings` prop from MDX content.

**Step 1: Read current BlogPost.astro** (already done above)

**Step 2: Rewrite BlogPost.astro**

Key changes from old layout:
- Wrap in `BaseLayout` instead of manually rendering chrome/header/footer
- Use three-column grid for body
- Title block with breadcrumb, tag, date, reading time
- Author strip below title
- Sticky TOC on left
- Drop cap on first paragraph (via CSS `::first-letter` on the prose article)
- Sticky margin notes on right (placeholder cards)
- Related posts section at bottom

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import BaseLayout from './BaseLayout.astro';
import AuthorBio from '../components/AuthorBio.astro';
import SiteFooter from '../components/SiteFooter.astro';
import { getCollection } from 'astro:content';

interface SeriesInfo {
  id: string;
  title: string;
}

interface PrevNextPost {
  id: string;
  title: string;
}

type Props = Omit<CollectionEntry<'blog'>['data'], 'series'> & {
  slug: string;
  series?: SeriesInfo;
  prevPost?: PrevNextPost | null;
  nextPost?: PrevNextPost | null;
  headings?: Array<{ depth: number; slug: string; text: string }>;
};

const { title, description, pubDate, updatedDate, heroImage, series, prevPost, nextPost, draft, dek, tag, kind, readMin, words, slug, headings = [] } = Astro.props;

// Related posts: 3 most recent, excluding current
const allPosts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .filter(p => p.id !== slug)
  .slice(0, 3);

function fmtDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(date);
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')} ${d.getFullYear()}`;
}

// Filter TOC to depth 2 headings only (h2)
const toc = headings.filter(h => h.depth === 2);
---

<BaseLayout title={title} description={dek ?? description} chromePath={`/writing/${slug}`}>
  <!-- Title block -->
  <div style="padding:72px var(--gutter) 44px; border-bottom:1px solid var(--line); max-width:1280px; margin:0 auto; width:100%;">
    <!-- Breadcrumb row -->
    <div style="display:flex; gap:14px; font-family:var(--font-mono); font-size:11px; color:var(--mute); letter-spacing:.04em; margin-bottom:28px; align-items:center; flex-wrap:wrap;">
      <a href="/" style="color:var(--mute); text-decoration:none;">← /writing</a>
      {tag && (
        <>
          <span style="color:var(--faint);">/</span>
          <span style="color:var(--accent-ink); background:var(--accent-bg); padding:2px 8px; border-radius:2px;">{tag.toLowerCase()}</span>
        </>
      )}
      <span style="color:var(--faint);">/</span>
      <span>{fmtDate(pubDate)}</span>
      {readMin && (
        <>
          <span style="color:var(--faint);">/</span>
          <span>{readMin} min read{words ? ` · ${words.toLocaleString()} words` : ''}</span>
        </>
      )}
    </div>

    <!-- Display title -->
    <h1 style="font-family:var(--font-serif); font-weight:500; font-size:68px; line-height:1.0; margin:0; letter-spacing:-.025em; color:var(--ink); max-width:900px;">
      {title}.
    </h1>

    <!-- Dek -->
    <p style="font-family:var(--font-serif); font-size:22px; line-height:1.4; color:var(--mute); margin:24px 0 0; max-width:760px;">
      {dek ?? description}
    </p>

    <!-- Author strip -->
    <div style="margin-top:40px; display:flex; align-items:center; gap:14px; padding-top:24px; border-top:1px solid var(--line-soft);">
      <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--ink)); display:flex; align-items:center; justify-content:center; color:var(--bg); font-family:var(--font-mono); font-weight:600; font-size:14px; flex-shrink:0;">
        RB
      </div>
      <div>
        <div style="font-family:var(--font-mono); font-size:12px; color:var(--ink); font-weight:500;">Rasheed Bustamam</div>
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--faint); margin-top:2px;">independent consultant · writing since 2019</div>
      </div>
      <div style="margin-left:auto; display:flex; gap:10px; font-family:var(--font-mono); font-size:11px;">
        <button style="background:transparent; border:1px solid var(--line); color:var(--ink); padding:6px 12px; border-radius:2px; cursor:pointer; font-family:var(--font-mono); font-size:11px;">↗ share</button>
      </div>
    </div>
  </div>

  <!-- Three-column body -->
  <div style="display:grid; grid-template-columns:220px 1fr 220px; gap:56px; padding:56px var(--gutter) 64px; max-width:1280px; margin:0 auto; width:100%;">

    <!-- Left sidebar: TOC + progress -->
    <aside style="align-self:start; position:sticky; top:20px;">
      <div style="font-family:var(--font-mono); font-size:10px; color:var(--faint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:14px;">
        § contents
      </div>
      {toc.length > 0 ? (
        <nav style="display:flex; flex-direction:column; gap:8px; font-family:var(--font-mono); font-size:12px;">
          {toc.map(h => (
            <a href={`#${h.slug}`} class="toc-link" style="padding:2px 0 2px 10px; border-left:2px solid transparent; color:var(--mute); text-decoration:none; line-height:1.4;">
              {h.text}
            </a>
          ))}
        </nav>
      ) : (
        <p style="font-family:var(--font-mono); font-size:11px; color:var(--faint);">no headings</p>
      )}
      <div style="margin-top:32px; padding:14px; border:1px solid var(--line); border-radius:3px; background:var(--surface);">
        <div style="font-family:var(--font-mono); font-size:10px; color:var(--faint); letter-spacing:.1em; text-transform:uppercase; margin-bottom:8px;">progress</div>
        <div style="height:3px; background:var(--line-soft); border-radius:2px; overflow:hidden;">
          <div id="progress-bar" style="width:0%; height:100%; background:var(--accent); transition:width 0.1s;"></div>
        </div>
        <div id="progress-label" style="font-family:var(--font-mono); font-size:10px; color:var(--mute); margin-top:8px;">
          {readMin ? `${readMin} min` : ''}
        </div>
      </div>
    </aside>

    <!-- Article prose -->
    <article class="post-prose" style="font-family:var(--font-serif); font-size:18px; line-height:1.65; color:var(--ink); max-width:680px; min-width:0;">
      <slot />
    </article>

    <!-- Right sidebar: margin notes (placeholder) -->
    <aside style="align-self:start; position:sticky; top:20px; font-family:var(--font-mono); font-size:11px; color:var(--mute);">
      <div style="padding:14px; background:var(--surface); border:1px solid var(--line); border-radius:3px; margin-bottom:14px;">
        <div style="font-size:10px; color:var(--faint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:10px;">§ about this post</div>
        <div style="line-height:1.55; color:var(--mute);">
          {kind && <span style="display:block; margin-bottom:4px;">{kind}</span>}
          {words && <span style="display:block; color:var(--faint);">{words.toLocaleString()} words</span>}
        </div>
      </div>
      {series && (
        <div style="padding:14px; background:var(--surface); border:1px solid var(--line); border-radius:3px;">
          <div style="font-size:10px; color:var(--faint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:10px;">§ series</div>
          <a href={`/series/${series.id}/`} style="color:var(--accent-ink); text-decoration:none; line-height:1.55;">{series.title}</a>
        </div>
      )}
    </aside>
  </div>

  <!-- Related posts -->
  {allPosts.length > 0 && (
    <div style="padding:48px var(--gutter); border-top:1px solid var(--line); background:var(--surface);">
      <div style="font-family:var(--font-mono); font-size:10px; color:var(--faint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:20px; max-width:1280px; margin-left:auto; margin-right:auto;">
        ↳ related writing
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:1280px; margin:0 auto;">
        {allPosts.map(p => (
          <a href={`/blog/${p.id}/`} style="display:block; padding:20px 20px 22px; border:1px solid var(--line); border-radius:3px; background:var(--bg); cursor:pointer; text-decoration:none; color:inherit;">
            <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; color:var(--faint); letter-spacing:.08em; text-transform:uppercase; margin-bottom:14px;">
              <span>{p.data.tag?.toLowerCase() ?? ''}</span>
              {p.data.readMin && <span>{p.data.readMin} min</span>}
            </div>
            <h4 style="margin:0; font-family:var(--font-serif); font-size:20px; font-weight:500; color:var(--ink); letter-spacing:-.01em; line-height:1.2;">
              {p.data.title}
            </h4>
            <p style="margin:10px 0 0; font-family:var(--font-serif); font-size:14px; color:var(--mute); line-height:1.5;">
              {(p.data.dek ?? p.data.description ?? '').slice(0, 110)}…
            </p>
          </a>
        ))}
      </div>
    </div>
  )}
</BaseLayout>

<style is:global>
  /* Post prose styles */
  .post-prose p { margin-bottom: 20px; }

  .post-prose > p:first-child::first-letter {
    float: left;
    font-family: var(--font-serif);
    font-size: 72px;
    line-height: .85;
    font-weight: 500;
    padding: 6px 10px 0 0;
    color: var(--accent);
  }

  .post-prose h2 {
    font-family: var(--font-serif);
    font-size: 30px;
    font-weight: 500;
    margin: 44px 0 14px;
    letter-spacing: -.015em;
    line-height: 1.15;
    color: var(--ink);
  }

  .post-prose h3 {
    font-family: var(--font-serif);
    font-size: 26px;
    font-weight: 500;
    margin: 36px 0 12px;
    letter-spacing: -.015em;
    line-height: 1.2;
    color: var(--ink);
  }

  .post-prose code {
    font-family: var(--font-mono);
    font-size: .85em;
    background: var(--code);
    padding: 1px 6px;
    border-radius: 2px;
    color: var(--accent-ink);
  }

  .post-prose pre {
    margin: 28px 0;
    background: var(--code);
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: auto;
    padding: 16px 18px;
    line-height: 1.65;
  }

  .post-prose pre code {
    background: none;
    padding: 0;
    color: var(--ink);
    font-size: 13px;
  }

  .post-prose blockquote {
    margin: 28px 0;
    padding: 16px 22px;
    border-left: 2px solid var(--accent);
    font-family: var(--font-serif);
    font-size: 19px;
    font-style: italic;
    color: var(--ink);
    background: var(--surface);
  }

  .post-prose a { color: var(--accent); }

  /* TOC active item */
  .toc-link.active {
    color: var(--ink);
    border-left-color: var(--accent) !important;
  }
</style>

<script>
  // Reading progress bar
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const article = document.querySelector('.post-prose');
  const readMin = {Astro.props.readMin ?? 0};

  if (progressBar && article) {
    window.addEventListener('scroll', () => {
      const rect = article.getBoundingClientRect();
      const total = article.clientHeight;
      const scrolled = Math.max(0, -rect.top);
      const pct = Math.min(100, (scrolled / (total - window.innerHeight)) * 100);
      progressBar.style.width = `${pct}%`;
      if (progressLabel && readMin) {
        const remaining = Math.max(0, Math.round(readMin * (1 - pct / 100)));
        progressLabel.textContent = remaining > 0 ? `${remaining} min remaining` : 'done';
      }
    });
  }

  // TOC active highlighting
  const tocLinks = document.querySelectorAll<HTMLAnchorElement>('.toc-link');
  const headingEls = Array.from(tocLinks).map(link => {
    const id = link.href.split('#')[1];
    return id ? document.getElementById(id) : null;
  }).filter(Boolean);

  if (tocLinks.length > 0) {
    window.addEventListener('scroll', () => {
      let activeIdx = 0;
      headingEls.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < 120) activeIdx = i;
      });
      tocLinks.forEach((link, i) => {
        link.classList.toggle('active', i === activeIdx);
      });
    });
  }
</script>
```

**Step 2: Update `src/pages/blog/[...slug].astro`**

Read the current file, then pass `headings` and the new fields to BlogPost:

```astro
---
// The rendered entry gives us `headings` from MDX
const { Content, headings } = await entry.render();
---

<BlogPost
  {...entry.data}
  slug={entry.id}
  headings={headings}
  series={seriesInfo}
  prevPost={prevPost}
  nextPost={nextPost}
>
  <Content />
</BlogPost>
```

**Step 3: Run dev and open a post page**

```bash
bun run dev
```

Navigate to a blog post and verify:
- Three-column layout renders
- TOC sidebar with headings
- Progress bar updates on scroll
- Related posts at bottom

**Step 4: Commit**

```bash
git add src/layouts/BlogPost.astro src/pages/blog/
git commit -m "feat: implement Terminal Sharp post layout with three-column grid and TOC"
```

---

## Task 14: Configure Shiki syntax highlighting theme

Astro uses Shiki by default for code blocks in MDX. Configure a minimal two-color theme: accent for keywords/strings, faint-italic for comments.

**Files:**
- Modify: `astro.config.mjs`

**Step 1: Update astro.config.mjs**

Add a Shiki theme config to the MDX integration. Use the built-in `github-light` / `github-dark` as a base, then override key token colors via CSS (easier than writing a full custom theme JSON).

Alternatively, configure two themes for light/dark:

```javascript
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://blog.bustamam.tech',
  integrations: [
    mdx(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Then override shiki's CSS variables in global.css to match design tokens:

```css
/* Shiki dual-theme token overrides — appended to global.css */
.astro-code,
.astro-code span {
  color: var(--shiki-light) !important;
  background-color: var(--code) !important;
}

[data-theme="dark"] .astro-code,
[data-theme="dark"] .astro-code span {
  color: var(--shiki-dark) !important;
  background-color: var(--code) !important;
}
```

**Step 2: Verify code blocks render correctly**

Open a blog post with a code block in the dev server. Check that syntax highlighting works and matches the design colors.

**Step 3: Commit**

```bash
git add astro.config.mjs src/styles/global.css
git commit -m "feat: configure Shiki dual-theme syntax highlighting"
```

---

## Task 15: Add JSON Feed (`/feed.json`)

**Files:**
- Create: `src/pages/feed.json.ts`

**Step 1: Create feed.json.ts**

```typescript
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context: { site: URL }) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    home_page_url: context.site.href,
    feed_url: new URL('/feed.json', context.site).href,
    authors: [{ name: 'Rasheed Bustamam', url: 'https://bustamam.technology' }],
    items: posts.map(post => ({
      id: new URL(`/blog/${post.id}/`, context.site).href,
      url: new URL(`/blog/${post.id}/`, context.site).href,
      title: post.data.title,
      summary: post.data.dek ?? post.data.description,
      date_published: post.data.pubDate.toISOString(),
      date_modified: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
      tags: post.data.tag ? [post.data.tag] : [],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json' },
  });
}
```

**Step 2: Verify**

```bash
bun run build && bun run preview
```

Visit http://localhost:4321/feed.json — should return valid JSON Feed.

**Step 3: Commit**

```bash
git add src/pages/feed.json.ts
git commit -m "feat: add JSON Feed endpoint at /feed.json"
```

---

## Task 16: Clean up old components

Old components that are replaced:
- `src/components/Header.astro` — replaced by `SiteHeader.astro` + `TerminalChrome.astro`
- `src/components/Footer.astro` — replaced by `SiteFooter.astro`
- `src/components/HeaderLink.astro` — no longer needed
- `src/components/FormattedDate.astro` — fmtDate is now inline

**Step 1: Verify nothing imports the old components**

```bash
grep -r "Header\|Footer\|HeaderLink\|FormattedDate" src/ --include="*.astro" --include="*.ts" --include="*.tsx"
```

If any files still import them, update those imports first.

**Step 2: Delete old components**

```bash
rm src/components/Header.astro src/components/Footer.astro src/components/HeaderLink.astro src/components/FormattedDate.astro
```

**Step 3: Run build to confirm clean**

```bash
bun run build
```

Expected: no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old Header/Footer/HeaderLink/FormattedDate components"
```

---

## Task 17: Final QA pass

**Step 1: Build**

```bash
bun run build
```

Expected: clean build, no TypeScript or Astro errors.

**Step 2: Run preview and check all pages**

```bash
bun run preview
```

Check:
- `/` — Index page: hero, terminal card (timestamps animate), filter/search works, post list, author bio, footer
- `/blog/[slug]/` — Post page: title block, three-column grid, TOC, progress bar, related posts, footer
- `/rss.xml` — RSS feed renders
- `/feed.json` — JSON Feed renders
- Theme toggle — persists to localStorage, no flash on reload
- Dark mode — all color tokens switch correctly

**Step 3: Commit if any fixes needed, then push**

```bash
git add -A
git commit -m "fix: QA pass after Terminal Sharp design implementation"
```

---

## Summary of new file structure

```
src/
  styles/
    global.css              # Design tokens (CSS vars), font imports, base reset
  components/
    BaseHead.astro          # <head> meta tags (updated)
    ThemeToggle.astro       # Theme button + pre-paint script (NEW)
    TerminalChrome.astro    # 34px terminal bar (NEW)
    SiteHeader.astro        # Brand + nav (NEW)
    SiteFooter.astro        # Copyright + links (NEW)
    AuthorBio.astro         # Author + availability card (NEW)
    CopyButton.astro        # Code copy button (NEW)
    DraftBadge.astro        # (keep as-is)
  layouts/
    BaseLayout.astro        # Shell: chrome + header + footer (NEW)
    BlogPost.astro          # Three-column post layout (REWRITTEN)
  pages/
    index.astro             # Homepage = post list + hero (REWRITTEN)
    blog/[...slug].astro    # Pass headings to BlogPost (UPDATED)
    feed.json.ts            # JSON Feed (NEW)
    rss.xml.js              # (keep as-is)
```
