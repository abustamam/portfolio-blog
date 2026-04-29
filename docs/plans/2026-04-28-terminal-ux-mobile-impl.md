# Terminal UX Polish + Mobile Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the terminal genuinely usable on mobile and close the most glaring desktop UX gaps (command history, pager layout, search shortcut conflict).

**Architecture:** All changes are isolated to three files. DOM manipulation lives inside the existing IIFE in `TerminalModeShell.astro`; CSS tweaks are co-located in the same file's `<style is:global>` block. No new modules are introduced.

**Tech Stack:** Astro, vanilla TypeScript (client-side IIFE), Tailwind utility classes, `visualViewport` Web API.

---

### Task 1: Remove ghost pager announce line

The line `appendLine('[pager] N lines …')` is written into the scroll buffer before `openPager()`. It persists after the pager closes and looks like a glitch.

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro` (the `runLine` function, ~line 303)

**Step 1: Delete the appendLine call**

Find this block in `runLine`:
```ts
if (bodyLines.length > 0 && shouldUsePager(bodyLines)) {
  appendLine(`[pager] ${bodyLines.length} lines — arrows or hjkl, q to close`, 'text-mute');
  openPager(bodyLines);
  return;
}
```

Remove the `appendLine(…)` call, leaving:
```ts
if (bodyLines.length > 0 && shouldUsePager(bodyLines)) {
  openPager(bodyLines);
  return;
}
```

**Step 2: Verify in browser**

- `npm run dev` (or `bun dev`)
- Open terminal, `cd writing`, `cat <any-post-slug>`
- Pager opens. Close with `q`.
- Scroll the output buffer — no `[pager] N lines` line should exist.

**Step 3: Commit**
```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "fix(terminal): remove ghost pager announce line from scroll buffer"
```

---

### Task 2: Gate `/` and `⌘K` site-search shortcuts

When terminal mode is open, pressing `/` or `⌘K` on the writing index steals focus from the prompt and opens the site search.

**Files:**
- Modify: `src/pages/index.astro` (~line 241, the keydown handler)

**Step 1: Add the guard**

Find the keydown listener block:
```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!searchInput) return;
  const focused = document.activeElement;
  if (e.key === '/' && focused !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
});
```

Add a terminal-mode guard at the top of the handler:
```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!searchInput) return;
  if (document.documentElement.classList.contains('terminal-mode')) return;
  const focused = document.activeElement;
  if (e.key === '/' && focused !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
});
```

**Step 2: Verify in browser**

- Open the writing index `/`
- Open terminal (`Ctrl/Cmd+Shift+T`)
- Press `/` — prompt keeps focus, site search does NOT activate
- Press `Escape` to close pager if open, then `⌘K` — same, no search capture
- Close terminal, press `/` — site search still works normally

**Step 3: Commit**
```bash
git add src/pages/index.astro
git commit -m "fix(terminal): gate site-search shortcuts when terminal mode is active"
```

---

### Task 3: Fix pager layout (full-panel, not drawer)

The pager currently renders as a `shrink-0 max-h-[40vh]` block, leaving terminal output visible above it.

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`
  - HTML: `#terminal-pager` element classes
  - JS: `openPager()` and `closePager()` functions

**Step 1: Remove the fixed-height cap from the pager HTML**

Find `#terminal-pager`:
```html
<div
  id="terminal-pager"
  class="hidden min-h-0 shrink-0 flex-col border-b border-line bg-bg"
  ...
>
  <pre
    id="terminal-pager-body"
    class="max-h-[40vh] overflow-hidden p-4 font-mono text-xs leading-relaxed text-ink whitespace-pre-wrap"
  ></pre>
```

Change to:
```html
<div
  id="terminal-pager"
  class="hidden min-h-0 shrink-0 flex-col border-b border-line bg-bg"
  ...
>
  <pre
    id="terminal-pager-body"
    class="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-ink whitespace-pre-wrap"
  ></pre>
```

**Step 2: Swap output ↔ pager visibility in `openPager` and `closePager`**

Find `openPager`:
```ts
function openPager(lines: string[]) {
  pagerState = { lines, offset: 0, pageSize: pagerPageSize() };
  pager.classList.remove('hidden');
  input.disabled = true;
  renderPagerView();
  announce('Pager open. Use arrows or hjkl. Press q to close.');
}
```

Change to:
```ts
function openPager(lines: string[]) {
  pagerState = { lines, offset: 0, pageSize: pagerPageSize() };
  output.classList.add('hidden');
  pager.classList.remove('hidden');
  pager.classList.remove('shrink-0');
  pager.classList.add('flex-1', 'flex');
  input.disabled = true;
  renderPagerView();
  announce('Pager open. Use arrows or hjkl. Press q to close.');
}
```

Find `closePager`:
```ts
function closePager() {
  pagerState = null;
  pager.classList.add('hidden');
  pBody.textContent = '';
  pMeta.textContent = '';
  input.disabled = false;
  queueMicrotask(() => input.focus());
  announce('Pager closed');
}
```

Change to:
```ts
function closePager() {
  pagerState = null;
  pager.classList.add('hidden', 'shrink-0');
  pager.classList.remove('flex-1', 'flex');
  pBody.textContent = '';
  pMeta.textContent = '';
  output.classList.remove('hidden');
  input.disabled = false;
  queueMicrotask(() => input.focus());
  announce('Pager closed');
}
```

**Step 3: Verify in browser**

- Open terminal, `cat` a long post
- Pager opens and **fills the full terminal height** — no output visible above it
- Close with `q` — output buffer reappears, pager is gone

**Step 4: Commit**
```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "fix(terminal): pager fills viewport instead of rendering as 40vh drawer"
```

---

### Task 4: Add pager touch buttons

Mobile users cannot use hjkl or arrow keys. Add prev/next page buttons to the pager meta bar.

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`
  - HTML: `#terminal-pager-meta` → replace with a flex row containing buttons
  - JS: wire button click handlers in the IIFE

**Step 1: Replace the pager meta bar HTML**

Find:
```html
<div
  id="terminal-pager-meta"
  class="border-t border-line px-4 py-2 font-mono text-[10px] text-mute"
></div>
```

Replace with:
```html
<div
  id="terminal-pager-meta"
  class="border-t border-line px-4 font-mono text-[10px] text-mute flex items-center justify-between gap-2"
>
  <button
    id="terminal-pager-prev"
    type="button"
    class="min-h-[44px] px-4 text-mute hover:text-ink"
    aria-label="Previous page"
  >‹ prev</button>
  <span id="terminal-pager-hint" class="text-center flex-1"></span>
  <button
    id="terminal-pager-next"
    type="button"
    class="min-h-[44px] px-4 text-mute hover:text-ink"
    aria-label="Next page"
  >next ›</button>
</div>
```

**Step 2: Update `renderPagerView` to write into the hint span**

At the top of the IIFE, add refs to the new elements:
```ts
const pagerPrev = document.getElementById('terminal-pager-prev') as HTMLButtonElement | null;
const pagerNext = document.getElementById('terminal-pager-next') as HTMLButtonElement | null;
const pagerHint = document.getElementById('terminal-pager-hint') as HTMLElement | null;
```

Update `renderPagerView`:
```ts
function renderPagerView() {
  if (!pagerState) return;
  const visible = sliceVisible(pagerState);
  pBody.textContent = visible.join('\n');
  const end = Math.min(pagerState.offset + visible.length, pagerState.lines.length);
  const hint = `${pagerState.offset + 1}–${end} of ${pagerState.lines.length} · arrows hjkl · q quit`;
  if (pagerHint) pagerHint.textContent = hint;
  // legacy fallback (pMeta still exists for screen readers)
  pMeta.textContent = hint;
}
```

**Step 3: Wire button click handlers in the IIFE**

After the existing `minimizeBtn?.addEventListener` block, add:
```ts
pagerPrev?.addEventListener('click', () => {
  if (!pagerState) return;
  pagerState = pageUp(pagerState);
  renderPagerView();
});
pagerNext?.addEventListener('click', () => {
  if (!pagerState) return;
  pagerState = pageDown(pagerState);
  renderPagerView();
});
```

Import `pageUp` and `pageDown` — they're already imported from `terminal-pager`:
```ts
import {
  handlePagerKey,
  pageUp,
  pageDown,
  shouldUsePager,
  sliceVisible,
  type PagerState,
} from './terminal-pager';
```

**Step 4: Verify in browser (desktop + mobile)**

Desktop:
- Open pager via `cat` on a long post
- Click `‹ prev` and `next ›` with mouse — pages scroll
- Arrow keys and hjkl still work

Mobile (use DevTools device emulation or a real device):
- Open pager — `‹ prev` and `next ›` buttons visible with comfortable tap targets
- Tap them — content scrolls

**Step 5: Commit**
```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): add prev/next touch buttons to pager meta bar"
```

---

### Task 5: Add command history (ArrowUp/Down)

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro` (IIFE state + keydown handler)

**Step 1: Add history state variables**

After `let pagerState: PagerState | null = null;`, add:
```ts
let historyBuffer: string[] = [];
let historyIndex = -1;
let historyDraft = '';
```

**Step 2: Push to history on submit**

In the `form.addEventListener('submit', …)` handler, after `const line = input.value;` and before `input.value = '';`, add:
```ts
if (line.trim()) {
  historyBuffer.push(line.trim());
  historyIndex = -1;
  historyDraft = '';
}
```

So the handler reads:
```ts
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (pagerState) return;
  const line = input.value;
  if (line.trim()) {
    historyBuffer.push(line.trim());
    historyIndex = -1;
    historyDraft = '';
  }
  input.value = '';
  runLine(line);
});
```

**Step 3: Handle ArrowUp/ArrowDown in the global keydown listener**

The existing global `keydown` handler manages pager keys. After the `if (pagerState)` block, add history traversal (only fires when terminal is open and pager is not active):

```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    if (isOpen && pagerState) closePager();
    toggleMode();
    return;
  }
  if (!isOpen) return;
  if (pagerState) {
    const next = handlePagerKey(e, pagerState);
    if (next === null) {
      closePager();
      queueMicrotask(() => input.focus());
    } else {
      pagerState = next;
      renderPagerView();
    }
    return;
  }
  // Command history traversal
  if (e.key === 'ArrowUp' && historyBuffer.length > 0) {
    e.preventDefault();
    if (historyIndex === -1) historyDraft = input.value;
    historyIndex = Math.min(historyIndex + 1, historyBuffer.length - 1);
    input.value = historyBuffer[historyBuffer.length - 1 - historyIndex];
    // move cursor to end
    queueMicrotask(() => { input.selectionStart = input.selectionEnd = input.value.length; });
  }
  if (e.key === 'ArrowDown' && historyIndex >= 0) {
    e.preventDefault();
    historyIndex--;
    input.value = historyIndex === -1 ? historyDraft : historyBuffer[historyBuffer.length - 1 - historyIndex];
    queueMicrotask(() => { input.selectionStart = input.selectionEnd = input.value.length; });
  }
});
```

**Step 4: Verify in browser**

- Open terminal
- Type `ls`, Enter
- Type `pwd`, Enter
- Press ArrowUp — prompt shows `pwd`
- Press ArrowUp again — prompt shows `ls`
- Press ArrowDown — prompt shows `pwd`
- Press ArrowDown again — prompt is cleared (draft restored)
- Confirm pager arrow keys still work (open pager, use ArrowDown to scroll)

**Step 5: Commit**
```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): add command history with ArrowUp/Down traversal"
```

---

### Task 6: Fix touch targets

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro` — minimize button
- Modify: `src/components/TerminalChrome.astro` — Terminal toggle button

**Step 1: Expand minimize button hit area**

Find the minimize button:
```html
<button
  id="terminal-minimize-btn"
  type="button"
  class="w-2 h-2 rounded-full bg-danger border border-line"
  aria-label="Minimize terminal mode"
></button>
```

Change to:
```html
<button
  id="terminal-minimize-btn"
  type="button"
  class="p-3 -m-3 flex items-center justify-center"
  aria-label="Minimize terminal mode"
>
  <span class="w-2 h-2 rounded-full bg-danger border border-line pointer-events-none"></span>
</button>
```

This gives a 44px-ish touch area (`p-3` = 12px padding each side, 8px dot → ~32px; with the `-m-3` negative margin the visual layout is unchanged).

**Step 2: Expand Terminal toggle button in TerminalChrome**

Find:
```html
<button
  type="button"
  id="terminal-expand-btn"
  class="shrink-0 rounded-sm border border-line bg-surface px-2 py-0.5 font-mono text-10 uppercase tracking-snug text-mute transition-colors hover:border-ink hover:text-ink"
  ...
>
```

Change `py-0.5` to `py-1.5`:
```html
<button
  type="button"
  id="terminal-expand-btn"
  class="shrink-0 rounded-sm border border-line bg-surface px-2 py-1.5 font-mono text-10 uppercase tracking-snug text-mute transition-colors hover:border-ink hover:text-ink"
  ...
>
```

**Step 3: Verify**

- On a mobile device or DevTools emulation, tap the red dot — terminal closes reliably
- Tap the "Terminal" button in the chrome bar — tappable without needing pixel-precision

**Step 4: Commit**
```bash
git add src/components/terminal/TerminalModeShell.astro src/components/TerminalChrome.astro
git commit -m "fix(terminal): expand touch targets for minimize button and chrome toggle"
```

---

### Task 7: Fix iOS virtual keyboard covering the prompt

On iOS Safari, `fixed inset-0` elements don't shrink when the virtual keyboard appears. The prompt input sits behind the keyboard. Additionally, `text-xs` (12px) triggers iOS auto-zoom on input focus.

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`
  - HTML: shell element `class` — remove hard `inset-0`, let JS drive height
  - JS: add `visualViewport` listener in `openMode` / `closeMode`
  - CSS: add `font-size: 16px` override for `#terminal-input`

**Step 1: Replace `inset-0` with explicit positioning**

Find the shell element opening tag:
```html
<section
  id="terminal-mode-shell"
  class="fixed inset-0 z-50 hidden flex flex-col bg-bg text-ink font-mono"
  ...
>
```

Change to:
```html
<section
  id="terminal-mode-shell"
  class="fixed inset-x-0 top-0 z-50 hidden flex flex-col bg-bg text-ink font-mono"
  style="height: 100dvh"
  ...
>
```

We use `inset-x-0 top-0` (left/right/top = 0) and drive height via inline style so JS can override it.

**Step 2: Add `visualViewport` listener**

At the bottom of the IIFE, before the closing `})();`, add:

```ts
function syncViewportHeight() {
  if (!isOpen) return;
  const h = window.visualViewport?.height ?? window.innerHeight;
  shell.style.height = `${h}px`;
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncViewportHeight);
  window.visualViewport.addEventListener('scroll', syncViewportHeight);
}
```

Call `syncViewportHeight()` at the end of `openMode()`:
```ts
function openMode() {
  if (isOpen) return;
  lastFocus = document.activeElement;
  isOpen = true;
  shell.classList.remove('hidden');
  shell.setAttribute('aria-hidden', 'false');
  shell.setAttribute('aria-modal', 'true');
  inertSiblings?.setAttribute('inert', '');
  document.documentElement.classList.add('terminal-mode');
  renderCwd();
  announce('Terminal mode on');
  setExpandButtonState(true);
  queueMicrotask(() => input.focus());
  syncViewportHeight();
}
```

And reset height in `closeMode()`:
```ts
function closeMode() {
  if (!isOpen) return;
  if (pagerState) closePager();
  isOpen = false;
  shell.classList.add('hidden');
  shell.style.height = '100dvh';
  shell.setAttribute('aria-hidden', 'true');
  shell.removeAttribute('aria-modal');
  inertSiblings?.removeAttribute('inert');
  document.documentElement.classList.remove('terminal-mode');
  announce('Terminal mode off');
  setExpandButtonState(false);
  const prev = lastFocus;
  if (prev instanceof HTMLElement) {
    queueMicrotask(() => prev.focus());
  }
  lastFocus = null;
}
```

**Step 3: Prevent iOS auto-zoom by setting 16px font on input**

In the `<style is:global>` block at the bottom of `TerminalModeShell.astro`, add:

```css
#terminal-input {
  font-size: 16px;
}
```

(Tailwind's `text-xs` = 12px triggers iOS zoom on focus. 16px suppresses it. The prompt visually stays the same since font-size only affects the input element, and the surrounding prompt line is styled separately.)

**Step 4: Verify on iOS / DevTools mobile emulation**

- Open terminal on a phone (or DevTools iPhone emulation)
- Tap the input — keyboard appears
- Prompt row is visible **above** the keyboard, not hidden behind it
- No auto-zoom when focusing the input
- Dismiss keyboard (tap elsewhere or `Escape`) — terminal returns to full height

**Step 5: Commit**
```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "fix(terminal): iOS keyboard covers prompt — use visualViewport to resize shell"
```

---

## Full verification pass

After all tasks, do one complete run through both mobile and desktop:

**Desktop (keyboard-only)**
1. `Ctrl/Cmd+Shift+T` — terminal opens, prompt focused
2. Type `ls`, Enter — writing/work/series listed
3. `cd writing`, Enter
4. `ls`, Enter — post slugs listed
5. `cat <slug>`, Enter — pager fills terminal, output hidden
6. ArrowDown / `j` — scrolls line by line
7. `Space` / `l` — page down
8. `q` — pager closes, output buffer visible, no ghost line
9. ArrowUp — previous command (`cat <slug>`) restored in prompt
10. Press `/` — search NOT captured
11. `exit` — terminal closes

**Mobile (touch)**
1. Tap "Terminal" button in chrome bar — opens
2. Tap input — keyboard appears, prompt visible above it, no zoom
3. Type `ls` (via keyboard), Submit — output appears
4. Run `cat <slug>` — pager opens
5. Tap `‹ prev` / `next ›` — pages
6. Tap `q` or press Escape — pager closes
7. Tap minimize dot — terminal closes

---

## Option C (next PR — immediate follow-on)

File this as the next PR after this one merges. Scope:
- Tab completion (commands + partial paths)
- `Ctrl+L` clear, `Ctrl+C` cancel line
- `theme` command implementation
- localStorage persistence of cwd and terminal open state
- Easter eggs: `trace`, `coffee`
- `..` standalone shorthand for `cd ..`
