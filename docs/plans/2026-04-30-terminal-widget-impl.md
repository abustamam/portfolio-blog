# Terminal Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static hero card on the home page with a real interactive terminal widget that starts with a typewriter `whoami` intro and expands cleanly into full-screen terminal mode.

**Architecture:** New `TerminalWidget.astro` is self-contained — it fetches its own content collections, embeds siteData as JSON, and runs the same command engine (`runCommandLine`) in a lightweight IIFE. On expand, it serializes output + history to localStorage; the full-screen shell reads those keys on `openMode()` and consumes them. Two new custom events (`terminal:open`, `terminal:closed`) coordinate the handoff.

**Tech Stack:** Astro (SSG), vanilla TypeScript (client-side IIFE), same `runCommandLine` / `getCompletion` / `terminal-types` modules used by the full-screen shell.

---

### Task 1: Create `TerminalWidget.astro` — HTML structure

**Files:**
- Create: `src/components/TerminalWidget.astro`

**Step 1: Write the frontmatter**

This is identical to `TerminalModeShell.astro`'s frontmatter — same three collection fetches, same JSON embed.

```astro
---
import { getCollection } from 'astro:content';
import { isPublished } from '../utils/content';
import type { SiteTerminalData } from './terminal/terminal-types';

const blogRaw = await getCollection('blog', ({ data }) => isPublished(data));
const blog: SiteTerminalData['blog'] = blogRaw.map((p) => ({
  id: p.id,
  title: p.data.title,
  body: typeof p.body === 'string' ? p.body : '',
  pubDate: p.data.pubDate.toISOString().slice(0, 10),
  tag: p.data.tag,
  readMin: p.data.readMin,
  words: p.data.words,
}));

const seriesRaw = await getCollection('series', ({ data }) => isPublished(data));
const series: SiteTerminalData['series'] = seriesRaw.map((s) => ({
  id: s.id,
  title: s.data.title,
}));

const workRaw = await getCollection('work', ({ data }) => isPublished(data));
const work: SiteTerminalData['work'] = workRaw.map((w) => ({
  id: w.id,
  company: w.data.company,
  role: w.data.role,
  period: w.data.period,
}));

const terminalData: SiteTerminalData = { blog, series, work };
const terminalJson = JSON.stringify(terminalData).replace(/</g, '\\u003c');
---
```

**Step 2: Write the HTML**

```astro
<div
  id="terminal-widget"
  class="bg-code border border-line rounded font-mono text-xs overflow-hidden flex flex-col"
>
  <!-- Chrome bar -->
  <div class="py-2 px-3.5 border-b border-line flex justify-between items-center text-faint text-10 tracking-loose uppercase shrink-0">
    <span>whoami.sh</span>
    <button
      id="widget-expand-btn"
      type="button"
      class="text-accent bg-transparent border border-line rounded-sm px-2 py-0.5 uppercase tracking-snug hover:border-accent"
    >expand ↗</button>
  </div>

  <!-- Scrollable output area -->
  <div
    id="widget-output"
    class="h-48 overflow-y-auto p-4 leading-relaxed transition-opacity duration-150"
    aria-live="polite"
    aria-label="Terminal output"
  ></div>

  <!-- Prompt row -->
  <form
    id="widget-form"
    class="border-t border-line shrink-0 flex items-center gap-2 h-10 px-4"
  >
    <span id="widget-cwd" class="shrink-0 text-accent text-xs">~ $</span>
    <!-- Typewriter display span (visible during intro, hidden after) -->
    <span id="widget-typewriter-display" class="text-ink text-xs"></span>
    <!-- Real input (hidden during intro, shown after) -->
    <input
      id="widget-input"
      type="text"
      class="min-w-0 flex-1 border-none bg-transparent text-xs text-ink outline-none hidden"
      style="caret-color: transparent"
      autocomplete="off"
      spellcheck="false"
      aria-label="Terminal command input"
    />
    <!-- Blocky blinking cursor -->
    <span
      id="widget-cursor"
      class="inline-block w-1.75 h-3.25 bg-accent shrink-0 animate-[termBlink_1s_step-end_infinite]"
      aria-hidden="true"
    ></span>
  </form>
</div>

<!-- Embedded site data -->
<script
  type="application/json"
  id="widget-site-data"
  is:inline
  set:html={terminalJson}
></script>
```

**Step 3: Verify build**

```bash
cd /media/rasheed-bustamam/Extra/coding/blog && bun run build 2>&1 | tail -5
```
Expected: `28 page(s) built` — the file exists but isn't imported anywhere yet, so no visible change.

**Step 4: Commit**

```bash
git add src/components/TerminalWidget.astro
git commit -m "feat(terminal-widget): add HTML structure with output area and prompt row"
```

---

### Task 2: Core IIFE — command loop, keydown, theme

**Files:**
- Modify: `src/components/TerminalWidget.astro` (add `<script>` + `<style is:global>`)

**Step 1: Add the `<script>` block**

Append this after the HTML in `TerminalWidget.astro`:

```astro
<script>
  import { runCommandLine } from './terminal/terminal-commands';
  import { getCompletion } from './terminal/terminal-completion';
  import type { SiteTerminalData, TerminalState } from './terminal/terminal-types';

  (function () {
    const widgetEl  = document.getElementById('terminal-widget') as HTMLElement | null;
    const outputEl  = document.getElementById('widget-output') as HTMLElement | null;
    const formEl    = document.getElementById('widget-form') as HTMLFormElement | null;
    const inputEl   = document.getElementById('widget-input') as HTMLInputElement | null;
    const cwdEl     = document.getElementById('widget-cwd') as HTMLElement | null;
    const expandBtn = document.getElementById('widget-expand-btn') as HTMLButtonElement | null;
    const twDisplay = document.getElementById('widget-typewriter-display') as HTMLElement | null;

    if (!widgetEl || !outputEl || !formEl || !inputEl || !cwdEl) return;

    // Read siteData
    const rawJson = document.getElementById('widget-site-data')?.textContent ?? '';
    let siteData: SiteTerminalData;
    try { siteData = JSON.parse(rawJson) as SiteTerminalData; }
    catch { return; }

    // State
    let state: TerminalState = { cwd: '~' };
    let historyBuffer: string[] = [];
    let historyIndex = -1;
    let historyDraft = '';
    // Output buffer for serialization on expand
    let outputBuffer: { text: string; cls: string }[] = [];

    // localStorage helpers
    function lsGet(key: string): string | null {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    function lsSet(key: string, value: string): void {
      try { localStorage.setItem(key, value); } catch { /* private browsing */ }
    }

    // Theme
    function applyTheme(name: string) {
      if (name === 'inherit') {
        widgetEl.removeAttribute('data-theme');
      } else {
        widgetEl.setAttribute('data-theme', name);
      }
    }

    // Output
    function appendLine(text: string, cls = 'text-mute') {
      const row = document.createElement('div');
      row.className = `mb-0.5 font-mono text-xs ${cls}`;
      row.textContent = text;
      outputEl!.appendChild(row);
      outputEl!.scrollTop = outputEl!.scrollHeight;
      outputBuffer.push({ text, cls });
    }

    function appendEcho(line: string) {
      appendLine(`${state.cwd} $ ${line}`, 'text-ink');
    }

    function renderCwd() {
      cwdEl!.textContent = `${state.cwd} $`;
    }

    // Run a command — no pager (just flush all lines)
    function runLine(raw: string) {
      const line = raw.trim();
      if (!line) return;
      appendEcho(line);
      const prevCwd = state.cwd;
      const result = runCommandLine(line, state, siteData);
      state = result.next;
      renderCwd();

      if (state.cwd !== prevCwd) lsSet('terminal:cwd', state.cwd);
      if (result.setTheme) {
        applyTheme(result.setTheme);
        lsSet('terminal:theme', result.setTheme);
      }
      if (result.navigateTo) { window.location.href = result.navigateTo; return; }
      // Ignore closeTerminal in widget — just print the lines
      for (const ln of result.lines) {
        if (ln !== '__CLEAR__') appendLine(ln, 'text-ink');
      }
      queueMicrotask(() => inputEl!.focus());
    }

    // Form submit
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const line = inputEl.value;
      if (line.trim()) {
        historyBuffer.push(line.trim());
        historyIndex = -1;
        historyDraft = '';
      }
      inputEl.value = '';
      runLine(line);
    });

    // Keydown: Tab, ArrowUp/Down, Ctrl+C
    inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const result = getCompletion(inputEl.value, state.cwd, siteData);
        inputEl.value = result.completed;
        if (result.matches.length > 1) appendLine(result.matches.join('  '), 'text-mute');
        queueMicrotask(() => { inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length; });
        return;
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'c') {
        e.preventDefault();
        inputEl.value = '';
        historyIndex = -1;
        historyDraft = '';
        return;
      }
      if (e.key === 'ArrowUp' && historyBuffer.length > 0) {
        e.preventDefault();
        if (historyIndex === -1) historyDraft = inputEl.value;
        historyIndex = Math.min(historyIndex + 1, historyBuffer.length - 1);
        inputEl.value = historyBuffer[historyBuffer.length - 1 - historyIndex];
        queueMicrotask(() => { inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length; });
      }
      if (e.key === 'ArrowDown' && historyIndex >= 0) {
        e.preventDefault();
        historyIndex--;
        inputEl.value = historyIndex === -1 ? historyDraft : historyBuffer[historyBuffer.length - 1 - historyIndex];
        queueMicrotask(() => { inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length; });
      }
    });

    // Restore persisted state on load
    const savedCwd = lsGet('terminal:cwd');
    const savedTheme = lsGet('terminal:theme');
    if (savedCwd) state = { cwd: savedCwd };
    if (savedTheme) applyTheme(savedTheme);
    renderCwd();

    // Expose runLine and state for typewriter task (attached to widget element)
    (widgetEl as any).__terminal = { runLine, appendEcho, state, siteData, inputEl, twDisplay, outputBuffer, historyBuffer };
  })();
</script>
```

> **Note on `__terminal`:** The IIFE exposes internals via a property on the DOM element so the IntersectionObserver callback (added in Task 3, outside the IIFE) can call `runLine`. This avoids two IIFEs racing and keeps scope contained.

**Step 2: Add theme CSS**

Append a `<style is:global>` block to `TerminalWidget.astro`:

```astro
<style is:global>
  #terminal-widget[data-theme="green"] {
    --color-bg: #0a0a0a; --color-surface: #111111; --color-code: #050505;
    --color-ink: #33ff33; --color-mute: #1a661a; --color-faint: #0f3a0f;
    --color-accent: #00ff88; --color-line: #1a661a; --color-line-soft: #0f2a0f;
  }
  #terminal-widget[data-theme="amber"] {
    --color-bg: #0d0800; --color-surface: #1a1000; --color-code: #080400;
    --color-ink: #ffb000; --color-mute: #664a00; --color-faint: #3d2c00;
    --color-accent: #ffcc44; --color-line: #664a00; --color-line-soft: #3d2c00;
  }
  #terminal-widget[data-theme="ice"] {
    --color-bg: #060d14; --color-surface: #0d1a26; --color-code: #030a10;
    --color-ink: #7dd3fc; --color-mute: #1e3a4f; --color-faint: #102030;
    --color-accent: #38bdf8; --color-line: #1e3a4f; --color-line-soft: #102030;
  }
</style>
```

**Step 3: Verify build**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean, 28 pages.

**Step 4: Commit**

```bash
git add src/components/TerminalWidget.astro
git commit -m "feat(terminal-widget): add core IIFE — command loop, history, tab completion, theme"
```

---

### Task 3: Typewriter intro with IntersectionObserver

**Files:**
- Modify: `src/components/TerminalWidget.astro` (add a second `<script>` block for the intro)

Add a **second** `<script>` block after the first. This runs after the DOM is ready and the IIFE from Task 2 has set up `widgetEl.__terminal`.

```astro
<script>
  (function () {
    const widgetEl  = document.getElementById('terminal-widget') as HTMLElement | null;
    const twDisplay = document.getElementById('widget-typewriter-display') as HTMLElement | null;
    const inputEl   = document.getElementById('widget-input') as HTMLInputElement | null;
    if (!widgetEl || !twDisplay || !inputEl) return;

    let introRun = false;

    function runIntro() {
      if (introRun) return;
      introRun = true;

      const term = (widgetEl as any).__terminal as {
        runLine: (raw: string) => void;
        appendEcho: (line: string) => void;
        siteData: unknown;
      } | undefined;
      if (!term) return;

      const cmd = 'whoami';
      let i = 0;

      function typeNext() {
        if (i <= cmd.length) {
          twDisplay.textContent = cmd.slice(0, i);
          i++;
          setTimeout(typeNext, 60);
        } else {
          // Typing done — pause 300ms then run
          setTimeout(() => {
            twDisplay.textContent = '';
            term.runLine(cmd);
            // Show real input
            twDisplay.classList.add('hidden');
            inputEl!.classList.remove('hidden');
            queueMicrotask(() => inputEl!.focus());
          }, 300);
        }
      }

      typeNext();
    }

    // IntersectionObserver: run when widget enters viewport (mobile defer)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          runIntro();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(widgetEl);
  })();
</script>
```

**Step 2: Verify build**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean.

**Step 3: Manual verify (after wiring into index.astro in Task 6)**

For now, just verify build is clean. Full manual test happens in Task 6.

**Step 4: Commit**

```bash
git add src/components/TerminalWidget.astro
git commit -m "feat(terminal-widget): add typewriter whoami intro with IntersectionObserver"
```

---

### Task 4: Expand transition + terminal:open / terminal:closed events

**Files:**
- Modify: `src/components/TerminalWidget.astro` (add expand handler inside first IIFE)
- Modify: `src/components/terminal/TerminalModeShell.astro` (add `terminal:open` listener, dispatch `terminal:closed`)

**Step 1: Add expand handler in `TerminalWidget.astro`**

Inside the first IIFE in `TerminalWidget.astro`, after the `renderCwd()` call at the bottom, add:

```ts
// Expand button: serialize state and open full-screen shell
expandBtn?.addEventListener('click', () => {
  // Serialize output + history to localStorage
  try {
    localStorage.setItem('terminal:session-lines', JSON.stringify(outputBuffer));
    localStorage.setItem('terminal:history', JSON.stringify(historyBuffer));
  } catch { /* private browsing */ }
  // Fade output area
  outputEl!.style.opacity = '0';
  // Open full-screen shell (after fade)
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('terminal:open'));
  }, 150);
});

// When full-screen shell closes, fade output back in
window.addEventListener('terminal:closed', () => {
  outputEl!.style.opacity = '1';
});
```

**Step 2: Add `terminal:open` listener in `TerminalModeShell.astro`**

In `TerminalModeShell.astro`, after the existing `window.addEventListener('terminal:toggle', ...)` line, add:

```ts
window.addEventListener('terminal:open', () => {
  if (!isOpen) openMode();
});
```

**Step 3: Dispatch `terminal:closed` in `closeMode()`**

In `TerminalModeShell.astro`, inside `closeMode()`, after `setExpandButtonState(false)`, add:

```ts
window.dispatchEvent(new CustomEvent('terminal:closed'));
```

**Step 4: Verify build**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean.

**Step 5: Commit**

```bash
git add src/components/TerminalWidget.astro src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal-widget): add expand transition — serialize session, fade, dispatch terminal:open/closed"
```

---

### Task 5: `TerminalModeShell.astro` — consume session on `openMode()`

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`

**Step 1: Read and consume session-lines + history in `openMode()`**

In `openMode()`, after `isOpen = true` and before `renderCwd()`, add:

```ts
// Consume widget session if present (one-shot)
const sessionLinesRaw = lsGet('terminal:session-lines');
if (sessionLinesRaw) {
  try {
    const lines = JSON.parse(sessionLinesRaw) as { text: string; cls: string }[];
    for (const { text, cls } of lines) appendLine(text, cls);
  } catch { /* malformed — skip */ }
  try { localStorage.removeItem('terminal:session-lines'); } catch { /* private browsing */ }
}
const sessionHistoryRaw = lsGet('terminal:history');
if (sessionHistoryRaw) {
  try {
    const hist = JSON.parse(sessionHistoryRaw) as string[];
    historyBuffer = hist;
  } catch { /* malformed — skip */ }
  // Do NOT delete terminal:history — it persists like normal history
}
```

The exact insertion point in `openMode()`:

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

  // ← INSERT SESSION RESTORE HERE (before renderCwd)

  renderCwd();
  announce('Terminal mode on');
  setExpandButtonState(true);
  queueMicrotask(() => input.focus());
  syncViewportHeight();
  lsSet('terminal:open', '1');
}
```

**Step 2: Verify build**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean.

**Step 3: Commit**

```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): pre-populate output and history from widget session on openMode"
```

---

### Task 6: Replace static card in `index.astro`

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Add the import**

In the frontmatter of `index.astro`, add:

```ts
import TerminalWidget from '../components/TerminalWidget.astro';
```

**Step 2: Replace the static card**

Find the entire `<!-- Right: terminal card -->` block (the `<div class="bg-code border border-line rounded ...">` div that spans from line 54 to 96). Replace it with:

```astro
<!-- Right: live terminal widget -->
<TerminalWidget />
```

**Step 3: Remove the timestamp loop**

In the `<script>` block, delete the entire `updateTerminalTimestamps` section:

```ts
// DELETE these lines:
function updateTerminalTimestamps() {
  const tsList = document.querySelectorAll<HTMLElement>('.term-ts');
  tsList.forEach((el, i) => {
    const ts = new Date(Date.now() - (tsList.length - i) * 2000);
    el.textContent = ts.toISOString().slice(11, 19);
  });
}
updateTerminalTimestamps();
setInterval(updateTerminalTimestamps, 1800);
```

**Step 4: Remove the `hero-terminal-open` click handler**

Delete:
```ts
// DELETE this:
document.getElementById('hero-terminal-open')?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('terminal:toggle'));
});
```

**Step 5: Verify build**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean, 28 pages.

**Step 6: Manual smoke test**

Open the dev server:
```bash
bun run dev
```

Check:
- [ ] Home page loads — terminal widget visible in hero right column
- [ ] `whoami` types character by character on load
- [ ] Output appears, then prompt shows with blinking blocky cursor
- [ ] Type `ls`, Enter — output appears, auto-scrolls
- [ ] `cd writing`, then `ls` — cwd updates, persists to localStorage
- [ ] Tab completion: `hel<Tab>` → `help `
- [ ] ArrowUp — cycles through history
- [ ] `theme green` — widget turns green
- [ ] Click `expand ↗` — widget output fades, full-screen shell opens with same content
- [ ] Full-screen shell: ArrowUp shows commands typed in widget
- [ ] Close full-screen — widget fades back in, still usable
- [ ] Reload — terminal stays closed (localStorage `terminal:open` not set by widget), widget shows fresh typewriter on load

**Step 7: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: replace static hero terminal card with live TerminalWidget"
```

---

## Full Verification Pass

```bash
bun run build 2>&1 | tail -5   # must pass
```

**Behaviour walkthrough:**
1. Open home page — widget visible in hero
2. `whoami` types out; output flushes; prompt appears
3. Run several commands: `ls`, `cd writing`, `ls`, `theme amber`
4. Click `expand ↗` — widget fades; full-screen opens with amber theme and all previous output
5. Run more commands in full-screen; close
6. Widget is back, usable, still amber
7. Reload — full-screen stays closed; widget shows fresh `whoami` intro; cwd and theme restored from localStorage
8. On a narrow viewport (simulated mobile): widget is below the fold on load; scroll down; typewriter starts when it enters view
