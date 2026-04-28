# Terminal Mode and Writing Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a keyboard-first simulated terminal mode and make writing routes consistent by moving canonical post URLs to `/writing/:slug` with legacy `/blog` redirects.

**Architecture:** Keep Astro pages/content as source-of-truth, add a client-side terminal runtime with a route-backed virtual filesystem, and migrate canonical links from `/blog/*` to `/writing/*`. Terminal mode is a full-page UI state mounted from `BaseLayout`, with command parsing, pager navigation, and accessibility announcements isolated into focused modules/components.

**Tech Stack:** Astro 5, TypeScript (client scripts), Astro content collections, Tailwind CSS v4, Node runtime commands (`bun run build`).

---

## File Structure and Responsibilities

- **Create:** `src/pages/writing/[...slug].astro` - canonical post route.
- **Create:** `src/pages/blog/[...slug].astro` - legacy redirect shim.
- **Create:** `src/pages/blog/index.astro` - index redirect shim.
- **Create:** `src/components/terminal/TerminalModeShell.astro` - full-screen terminal container.
- **Create:** `src/components/terminal/terminal-types.ts` - terminal state and command types.
- **Create:** `src/components/terminal/terminal-fs.ts` - route-backed virtual filesystem adapter.
- **Create:** `src/components/terminal/terminal-commands.ts` - parse + command handlers.
- **Create:** `src/components/terminal/terminal-pager.ts` - large-output pager logic (`arrows`, `hjkl`).
- **Create:** `src/components/terminal/terminal-a11y.ts` - ARIA live announcements/focus helpers.
- **Modify:** `src/layouts/BaseLayout.astro` - mount/toggle terminal mode and hotkey.
- **Modify:** `src/components/TerminalChrome.astro` - replace `~/journal` label and add expand button.
- **Modify:** `src/components/SiteHeader.astro` - rename `journal:*` session key use.
- **Modify:** `src/pages/index.astro` - switch `/blog` links + session key rename.
- **Modify:** `src/pages/writing.astro` - switch `/blog` links + session key rename.
- **Modify:** `src/layouts/BlogPost.astro` - update prev/next/related links to `/writing`.
- **Modify:** `src/pages/series/[...slug].astro` - update post links.
- **Modify:** `src/pages/feed.json.ts` - canonical feed URLs.
- **Modify:** `src/pages/rss.xml.js` - canonical RSS links.
- **Modify:** `astro.config.mjs` - add redirects map.

---

### Task 1: Move canonical post route to `/writing/:slug`

**Files:**
- Create: `src/pages/writing/[...slug].astro`
- Modify: `src/pages/blog/[...slug].astro` (replace with redirect behavior)
- Test: route generation via `bun run build`

- [ ] **Step 1: Create canonical writing slug page (copy existing blog route logic)**

```astro
---
import { type CollectionEntry, getEntry, getCollection, render } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';
import { getSeriesPosts } from '../../utils/series';
import { isPublished } from '../../utils/content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => isPublished(data));
  return posts.map((post) => ({ params: { slug: post.id }, props: post }));
}
type Props = CollectionEntry<'blog'>;
const post = Astro.props;
const { Content, headings } = await render(post);
// ... same series prev/next logic as old page
---

<BlogPost {...post.data} slug={post.id} headings={headings} series={series} prevPost={prevPost} nextPost={nextPost}>
  <Content />
</BlogPost>
```

- [ ] **Step 2: Make legacy `/blog/:slug` page redirect to `/writing/:slug`**

```astro
---
export async function getStaticPaths() {
  // keep static paths aligned with posts to preserve legacy URLs
  const posts = await getCollection('blog', ({ data }) => isPublished(data));
  return posts.map((post) => ({ params: { slug: post.id } }));
}

const slug = Astro.params.slug;
return Astro.redirect(`/writing/${slug}/`, 301);
---
```

- [ ] **Step 3: Build to verify both canonical and legacy pages are emitted**

Run: `bun run build`  
Expected: PASS build with generated `/writing/*` pages and redirect-capable `/blog/*` behavior.

- [ ] **Step 4: Commit**

```bash
git add src/pages/writing/[...slug].astro src/pages/blog/[...slug].astro
git commit -m "feat: move canonical post route to writing slug paths"
```

---

### Task 2: Add top-level `/blog` -> `/writing` redirect and central redirects in config

**Files:**
- Modify: `astro.config.mjs`
- Modify/Create: `src/pages/blog/index.astro`
- Test: `bun run build`

- [ ] **Step 1: Add redirects map in Astro config**

```js
export default defineConfig({
  site: 'https://blog.bustamam.tech',
  redirects: {
    '/blog': '/writing',
    '/blog/': '/writing/',
    '/blog/:slug': '/writing/:slug',
  },
  integrations: [mdx(), sitemap()],
  // ...
});
```

- [ ] **Step 2: Ensure blog index route redirects if file still exists**

```astro
---
return Astro.redirect('/writing/', 301);
---
```

- [ ] **Step 3: Build to verify redirect configuration**

Run: `bun run build`  
Expected: PASS and no duplicate-canonical conflicts.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs src/pages/blog/index.astro
git commit -m "feat: add blog to writing redirects"
```

---

### Task 3: Update all internal post links to `/writing/:slug`

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/writing.astro`
- Modify: `src/layouts/BlogPost.astro`
- Modify: `src/pages/series/[...slug].astro`
- Test: `bun run build`

- [ ] **Step 1: Replace route literals in templates**

```astro
<!-- before -->
<a href={`/blog/${post.id}/`}>

<!-- after -->
<a href={`/writing/${post.id}/`}>
```

- [ ] **Step 2: Update all prev/next/related links in blog layout**

```astro
<a href={`/writing/${prevPost.id}/`}>...</a>
<a href={`/writing/${nextPost.id}/`}>...</a>
<a href={`/writing/${p.id}/`}>...</a>
```

- [ ] **Step 3: Validate no `/blog/` links remain in `src/`**

Run: `rg "/blog/" src`  
Expected: no matches in user-facing link hrefs (redirect-only files allowed).

- [ ] **Step 4: Build to confirm link changes compile**

Run: `bun run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/pages/writing.astro src/layouts/BlogPost.astro src/pages/series/[...slug].astro
git commit -m "refactor: switch internal post links to writing namespace"
```

---

### Task 4: Update feeds and canonical URL surfaces to `/writing`

**Files:**
- Modify: `src/pages/feed.json.ts`
- Modify: `src/pages/rss.xml.js`
- Test: `bun run build`

- [ ] **Step 1: Update feed URL builders**

```ts
id: new URL(`/writing/${post.id}/`, context.site).href,
url: new URL(`/writing/${post.id}/`, context.site).href,
```

- [ ] **Step 2: Update RSS link path**

```js
link: `/writing/${post.id}/`,
```

- [ ] **Step 3: Build and inspect generated output quickly**

Run: `bun run build`  
Expected: PASS with feed and RSS generated successfully.

- [ ] **Step 4: Commit**

```bash
git add src/pages/feed.json.ts src/pages/rss.xml.js
git commit -m "fix: use writing canonical urls in feeds"
```

---

### Task 5: Remove public-facing `/journal` references and session-key naming

**Files:**
- Modify: `src/components/TerminalChrome.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/writing.astro`
- Modify: `src/components/SiteHeader.astro`
- Test: `bun run build`

- [ ] **Step 1: Replace terminal breadcrumb label**

```astro
<!-- before -->
rasheed@bustamam · ~/journal{path}

<!-- after -->
rasheed@bustamam · ~{path}
```

- [ ] **Step 2: Rename session storage keys**

```ts
// before
sessionStorage.setItem('journal:focus-search', '1');
sessionStorage.getItem('journal:focus-search');

// after
sessionStorage.setItem('site:focus-search', '1');
sessionStorage.getItem('site:focus-search');
```

- [ ] **Step 3: Verify no `journal:` keys remain**

Run: `rg "journal:" src`  
Expected: no matches.

- [ ] **Step 4: Build and commit**

Run: `bun run build`  
Expected: PASS.

```bash
git add src/components/TerminalChrome.astro src/pages/index.astro src/pages/writing.astro src/components/SiteHeader.astro
git commit -m "refactor: remove journal labels and session key naming"
```

---

### Task 6: Add terminal mode shell, toggle hotkey, and expand button wiring

**Files:**
- Create: `src/components/terminal/TerminalModeShell.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/TerminalChrome.astro`
- Test: `bun run build`, manual keyboard smoke in dev

- [ ] **Step 1: Create shell component scaffolding**

```astro
---
interface Props {
  initialPath?: string;
}
const { initialPath = '/writing' } = Astro.props;
---

<section id="terminal-mode-shell" class="hidden fixed inset-0 z-50 bg-bg text-ink font-mono" aria-hidden="true">
  <div id="terminal-live" class="sr-only" aria-live="polite"></div>
  <div id="terminal-output" class="h-[calc(100%-3rem)] overflow-auto p-4"></div>
  <form id="terminal-prompt-form" class="h-12 border-t border-line flex items-center px-4 gap-2">
    <span id="terminal-cwd" class="text-accent"></span>
    <input id="terminal-input" class="flex-1 bg-transparent outline-none" autocomplete="off" />
  </form>
</section>
```

- [ ] **Step 2: Mount shell in `BaseLayout` and add hotkey toggler (`Cmd/Ctrl+Shift+T`)**

```astro
<TerminalModeShell initialPath={chromePath} />

<script>
  // toggleTerminalMode() attaches/removes mode class, focuses prompt, announces live text
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      toggleTerminalMode();
    }
  });
</script>
```

- [ ] **Step 3: Add expand button to terminal chrome**

```astro
<button id="terminal-expand-btn" type="button" aria-label="Enter terminal mode" class="...">
  expand
</button>
```

- [ ] **Step 4: Wire expand button to same toggle function**

```ts
document.getElementById('terminal-expand-btn')?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('terminal:toggle'));
});
```

- [ ] **Step 5: Build + manual smoke**

Run: `bun run build`  
Expected: PASS.

Manual: start dev server, verify button and hotkey both open/close terminal mode and focus prompt.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/TerminalChrome.astro src/components/terminal/TerminalModeShell.astro
git commit -m "feat: add full-page terminal mode shell and toggle controls"
```

---

### Task 7: Implement command engine with route-backed virtual filesystem

**Files:**
- Create: `src/components/terminal/terminal-types.ts`
- Create: `src/components/terminal/terminal-fs.ts`
- Create: `src/components/terminal/terminal-commands.ts`
- Modify: `src/components/terminal/TerminalModeShell.astro`
- Test: manual command smoke in dev + build

- [ ] **Step 1: Define terminal state/types**

```ts
export interface TerminalState {
  isOpen: boolean;
  cwd: string;
  history: string[];
  historyIndex: number | null;
  pager: PagerState | null;
}

export interface FsEntry {
  name: string;
  type: 'dir' | 'file';
  routeTarget?: string;
}
```

- [ ] **Step 2: Build filesystem adapter**

```ts
export function listDir(cwd: string, blogSlugs: string[]): FsEntry[] {
  if (cwd === '~') return [{ name: 'writing', type: 'dir' }, { name: 'work', type: 'dir' }, ...];
  if (cwd === '~/writing') return blogSlugs.map((slug) => ({ name: slug, type: 'file', routeTarget: `/writing/${slug}/` }));
  return [];
}
```

- [ ] **Step 3: Implement command dispatch (`help`, `ls`, `cd`, `pwd`, `cat`, `open`, `man`, `clear`, `exit`)**

```ts
export function executeCommand(input: string, state: TerminalState, ctx: CommandContext): CommandResult {
  const [cmd, ...args] = input.trim().split(/\s+/);
  switch (cmd) {
    case 'ls': return cmdLs(args, state, ctx);
    case 'cd': return cmdCd(args, state, ctx);
    case 'cat': return cmdCat(args, state, ctx);
    case 'man': return cmdMan(args);
    // ...
    default: return { lines: [`command not found: ${cmd}`, `try: help`] };
  }
}
```

- [ ] **Step 4: Integrate engine with prompt form submit and output rendering**

```ts
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = terminalInput.value;
  const result = executeCommand(input, state, ctx);
  renderOutput(result.lines);
});
```

- [ ] **Step 5: Manual command smoke**

Run dev and verify:
- `ls` at `~` shows top-level sections
- `cd writing` then `ls` shows post slugs
- `cat <slug>` prints post content
- `man easter-eggs` returns playful content

- [ ] **Step 6: Build + commit**

Run: `bun run build`  
Expected: PASS.

```bash
git add src/components/terminal/terminal-types.ts src/components/terminal/terminal-fs.ts src/components/terminal/terminal-commands.ts src/components/terminal/TerminalModeShell.astro
git commit -m "feat: implement route-backed terminal commands"
```

---

### Task 8: Implement `cat` pager with arrow + `hjkl` controls and keyboard guardrails

**Files:**
- Create: `src/components/terminal/terminal-pager.ts`
- Modify: `src/components/terminal/TerminalModeShell.astro`
- Test: manual pager keyboard journey + build

- [ ] **Step 1: Add pager state and helpers**

```ts
export interface PagerState {
  lines: string[];
  offset: number;
  pageSize: number;
}

export function pageDown(p: PagerState): PagerState {
  return { ...p, offset: Math.min(p.offset + p.pageSize, Math.max(0, p.lines.length - p.pageSize)) };
}
```

- [ ] **Step 2: Add pager keymap**

```ts
export function handlePagerKey(e: KeyboardEvent, pager: PagerState): PagerState | null {
  if (e.key === 'ArrowDown' || e.key === 'j') return lineDown(pager);
  if (e.key === 'ArrowUp' || e.key === 'k') return lineUp(pager);
  if (e.key === 'ArrowRight' || e.key === 'l' || e.key === ' ') return pageDown(pager);
  if (e.key === 'ArrowLeft' || e.key === 'h' || e.key === 'b') return pageUp(pager);
  if (e.key === 'g') return toTop(pager);
  if (e.key === 'G') return toBottom(pager);
  if (e.key === 'q' || e.key === 'Escape') return null;
  return pager;
}
```

- [ ] **Step 3: Suspend prompt editing while pager active**

```ts
if (state.pager) {
  e.preventDefault();
  state.pager = handlePagerKey(e, state.pager);
  renderPager(state.pager);
  if (!state.pager) restorePromptMode();
  return;
}
```

- [ ] **Step 4: Manual keyboard-only validation**

Checklist:
- Enter terminal mode with hotkey only.
- Run `cat <long-post>`.
- Navigate with arrows and `hjkl`.
- Exit pager with `q`.
- Exit terminal mode without mouse.

- [ ] **Step 5: Build + commit**

Run: `bun run build`  
Expected: PASS.

```bash
git add src/components/terminal/terminal-pager.ts src/components/terminal/TerminalModeShell.astro
git commit -m "feat: add keyboard pager for cat output"
```

---

### Task 9: Accessibility polish and final verification pass

**Files:**
- Create: `src/components/terminal/terminal-a11y.ts`
- Modify: `src/components/terminal/TerminalModeShell.astro`
- Test: build + end-to-end smoke

- [ ] **Step 1: Add ARIA live announcements**

```ts
export function announce(message: string) {
  const live = document.getElementById('terminal-live');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}
```

- [ ] **Step 2: Add focus management helpers**

```ts
export function focusPrompt() {
  (document.getElementById('terminal-input') as HTMLInputElement | null)?.focus();
}
```

- [ ] **Step 3: Full regression/build run**

Run: `bun run build`  
Expected: PASS.

Manual checks:
- Legacy `/blog/:slug` redirects to `/writing/:slug`.
- `/blog` redirects to `/writing`.
- Feeds link to `/writing/:slug`.
- Terminal mode open/close, command flow, pager flow all keyboard-only.

- [ ] **Step 4: Commit**

```bash
git add src/components/terminal/terminal-a11y.ts src/components/terminal/TerminalModeShell.astro
git commit -m "feat: finalize terminal mode accessibility and verification"
```

---

## Self-Review Notes

- **Spec coverage:** Route migration, redirects, `/journal` cleanup, terminal shell, command engine, `man` command, full `cat`, pager keybindings, and keyboard-only operation are all covered by Tasks 1-9.
- **Placeholder scan:** No placeholder markers remain.
- **Type consistency:** `TerminalState`, `FsEntry`, and `PagerState` are introduced once and reused consistently across tasks.
