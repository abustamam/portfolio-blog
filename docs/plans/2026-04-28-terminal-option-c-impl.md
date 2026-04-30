# Terminal Option C — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the terminal feature set: `..` alias, `Ctrl+L`/`Ctrl+C`, theme palettes, localStorage persistence, easter eggs, and tab completion (commands + paths, unix-style).

**Architecture:** Six independent tasks ordered by risk. Tasks 1–2 touch only `terminal-commands.ts` and the keydown handler. Task 3 adds a `setTheme` field to `CommandResult` and wires the theme command through all three layers (types → commands → shell CSS/JS). Task 4 adds localStorage reads/writes at state-change sites. Tasks 5–6 introduce a new pure-function module for completion and wire it to the Tab key.

**Tech Stack:** Astro, TypeScript (client-side IIFE, no framework), CSS custom properties (`--color-bg` etc. already defined in `src/styles/global.css`), `localStorage` Web API.

---

### Task 1: `..` alias + `trace`/`coffee` easter eggs

**Files:**
- Modify: `src/components/terminal/terminal-commands.ts`

**Step 1: Add `..` standalone handler**

In `runCommandLine`, find the block that starts with `if (alias === 'exit')`. Add a new block *before* it (immediately after the alias map assignment):

```ts
// Before all alias handlers:
if (tokens[0] === '..') {
  const next = resolveCd(state.cwd, '..');
  if (!isValidCwd(next!, data)) {
    return { next: state, lines: ['cd: no such file or directory: ..'] };
  }
  return { next: { cwd: next! }, lines: [] };
}
```

**Step 2: Add `trace` easter egg**

After the `hint` handler block and before the `help` handler block, add:

```ts
if (alias === 'trace') {
  return {
    next: state,
    lines: [
      'Segmentation fault (core dumped)',
      '#0  0x00000000 in existence ()',
      '#1  0x0000002a in consulting.c:404',
      '#2  0x00c0ffee in main ()',
      '    at life.c:1',
      'note: try turning it off and on again',
    ],
  };
}
```

**Step 3: Add `coffee` easter egg**

Immediately after the `trace` block:

```ts
if (alias === 'coffee') {
  return {
    next: state,
    lines: [
      '     ( (',
      '      ) )',
      '   .______.',
      '   |      |]',
      '   \\      /',
      "    `----'",
      '> brewing ideas since 2019',
    ],
  };
}
```

**Step 4: Update `hint` output to mention both easter eggs**

Find the `hint` handler:
```ts
if (alias === 'hint') {
  return {
    next: state,
    lines: ['try: man easter-eggs', 'try: cd writing && ls'],
  };
}
```

Change to:
```ts
if (alias === 'hint') {
  return {
    next: state,
    lines: [
      'try: man easter-eggs',
      'try: trace',
      'try: coffee',
      'try: cd writing && ls',
    ],
  };
}
```

**Step 5: Update `man easter-eggs` page to hint at new commands**

Find `MAN_PAGES['easter-eggs']` and add a line:
```ts
'easter-eggs': [
  'NAME',
  '  easter-eggs — hints for curious visitors',
  '',
  'DESCRIPTION',
  '  Not everything is listed in help.',
  '  If you found this page, you are already doing great.',
  '  Try: whoami, hint, trace, coffee, and explore with cd.',
],
```

**Step 6: Verify build**

```bash
bun run build
```
Expected: `28 page(s) built` with no errors.

**Step 7: Commit**

```bash
git add src/components/terminal/terminal-commands.ts
git commit -m "feat(terminal): add .. alias and trace/coffee easter eggs"
```

---

### Task 2: `Ctrl+L` and `Ctrl+C` keyboard shortcuts

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro` (global `keydown` handler)

**Step 1: Add shortcuts after the pager guard block**

In the global `keydown` handler, locate the block that ends with `} // end if (pagerState)`. Immediately after it (before the ArrowUp/ArrowDown history handlers), add:

```ts
// Ctrl+L — clear output (only when pager is not active, handled above)
if (e.ctrlKey && !e.shiftKey && e.key === 'l') {
  e.preventDefault();
  clearOutput();
  return;
}
// Ctrl+C — cancel current input line
if (e.ctrlKey && !e.shiftKey && e.key === 'c') {
  e.preventDefault();
  input.value = '';
  historyIndex = -1;
  historyDraft = '';
  return;
}
```

The `!e.shiftKey` guard prevents accidental capture of `Ctrl+Shift+C` (browser dev tools copy shortcut).

**Step 2: Verify build**

```bash
bun run build
```
Expected: clean build.

**Step 3: Manual verify**

- Open terminal, run a few commands to fill output
- Press `Ctrl+L` — output clears
- Type some text, press `Ctrl+C` — input clears, text gone, mode stays open

**Step 4: Commit**

```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): add Ctrl+L clear and Ctrl+C cancel shortcuts"
```

---

### Task 3: Theme command

This task touches three files in order: types → commands → shell (JS + CSS).

**Files:**
- Modify: `src/components/terminal/terminal-types.ts`
- Modify: `src/components/terminal/terminal-commands.ts`
- Modify: `src/components/terminal/TerminalModeShell.astro`

**Step 1: Add `setTheme` to `CommandResult` in `terminal-types.ts`**

Find `CommandResult`:
```ts
export interface CommandResult {
  next: TerminalState;
  lines: string[];
  closeTerminal?: boolean;
  navigateTo?: string;
}
```

Add `setTheme`:
```ts
export interface CommandResult {
  next: TerminalState;
  lines: string[];
  closeTerminal?: boolean;
  navigateTo?: string;
  setTheme?: string;
}
```

**Step 2: Replace the `theme` command stub in `terminal-commands.ts`**

Find the stub:
```ts
if (alias === 'theme') {
  return {
    next: state,
    lines: ['theme: not wired yet (coming soon)'],
  };
}
```

Replace with:

```ts
if (alias === 'theme') {
  const VALID_THEMES = ['inherit', 'green', 'amber', 'ice'] as const;
  type Theme = typeof VALID_THEMES[number];
  const requested = (args[0] ?? '').toLowerCase();

  if (!requested) {
    // no arg — print current theme and options
    const current = (state as TerminalState & { theme?: string }).theme ?? 'inherit';
    return {
      next: state,
      lines: [
        `theme: ${current}`,
        `available: ${VALID_THEMES.join(' · ')}`,
        'usage: theme <name>',
      ],
    };
  }

  if (!(VALID_THEMES as readonly string[]).includes(requested)) {
    return {
      next: state,
      lines: [
        `theme: unknown theme '${requested}'`,
        `available: ${VALID_THEMES.join(' · ')}`,
      ],
    };
  }

  return {
    next: state,
    lines: [`theme set to ${requested}`],
    setTheme: requested,
  };
}
```

Note: We don't need to store the current theme on `TerminalState` — the shell tracks it via `data-theme` on the DOM element and localStorage. The "current theme" display in no-arg case is handled in the shell (see Step 3).

Simplify the no-arg case in the command to just return instructions (the shell can't easily send state back to the command):

```ts
if (alias === 'theme') {
  const VALID_THEMES = ['inherit', 'green', 'amber', 'ice'];
  const requested = (args[0] ?? '').toLowerCase();

  if (!requested) {
    return {
      next: state,
      lines: [
        `available: ${VALID_THEMES.join(' · ')}`,
        'usage: theme <name>',
        'usage: theme inherit  (reset to default)',
      ],
    };
  }

  if (!VALID_THEMES.includes(requested)) {
    return {
      next: state,
      lines: [
        `theme: unknown theme '${requested}'`,
        `available: ${VALID_THEMES.join(' · ')}`,
      ],
    };
  }

  return {
    next: state,
    lines: [`theme: ${requested}`],
    setTheme: requested,
  };
}
```

**Step 3: Add `applyTheme` function and `setTheme` handling in `TerminalModeShell.astro`**

In the IIFE, after the `syncViewportHeight` function declaration, add:

```ts
function applyTheme(name: string) {
  if (name === 'inherit') {
    shell.removeAttribute('data-theme');
  } else {
    shell.setAttribute('data-theme', name);
  }
}
```

In `runLine`, after `state = result.next; renderCwd();`, add handling for `setTheme`:

```ts
if (result.setTheme) {
  applyTheme(result.setTheme);
}
```

So the full `runLine` block becomes:
```ts
function runLine(raw: string) {
  const line = raw.trim();
  if (!line) return;
  appendEcho(line);
  const result = runCommandLine(line, state, siteData);
  state = result.next;
  renderCwd();

  if (result.setTheme) {
    applyTheme(result.setTheme);
  }

  if (result.navigateTo) {
    window.location.href = result.navigateTo;
    return;
  }
  if (result.closeTerminal) {
    flushLines(result.lines.filter((l) => l !== '__CLEAR__'));
    closeMode();
    return;
  }

  const cleared = result.lines.includes('__CLEAR__');
  if (cleared) clearOutput();
  const bodyLines = result.lines.filter((l) => l !== '__CLEAR__');

  if (bodyLines.length > 0 && shouldUsePager(bodyLines)) {
    openPager(bodyLines);
    return;
  }

  flushLines(result.lines);
  queueMicrotask(() => input.focus());
}
```

**Step 4: Add theme CSS to `<style is:global>` block**

In the `<style is:global>` block at the bottom of `TerminalModeShell.astro`, add after the existing rules:

```css
/* Green (CRT) theme — overrides site CSS custom properties within the terminal */
#terminal-mode-shell[data-theme="green"] {
  --color-bg: #0a0a0a;
  --color-surface: #111111;
  --color-code: #050505;
  --color-ink: #33ff33;
  --color-mute: #1a661a;
  --color-faint: #0f3a0f;
  --color-accent: #00ff88;
  --color-line: #1a661a;
  --color-line-soft: #0f2a0f;
}

/* Amber theme */
#terminal-mode-shell[data-theme="amber"] {
  --color-bg: #0d0800;
  --color-surface: #1a1000;
  --color-code: #080400;
  --color-ink: #ffb000;
  --color-mute: #664a00;
  --color-faint: #3d2c00;
  --color-accent: #ffcc44;
  --color-line: #664a00;
  --color-line-soft: #3d2c00;
}

/* Ice theme */
#terminal-mode-shell[data-theme="ice"] {
  --color-bg: #060d14;
  --color-surface: #0d1a26;
  --color-code: #030a10;
  --color-ink: #7dd3fc;
  --color-mute: #1e3a4f;
  --color-faint: #102030;
  --color-accent: #38bdf8;
  --color-line: #1e3a4f;
  --color-line-soft: #102030;
}
```

These override the CSS custom properties defined in `src/styles/global.css`. Because these properties are inherited by child elements, all Tailwind classes using `var(--color-bg)`, `var(--color-ink)` etc. within `#terminal-mode-shell` will automatically pick up the theme colors.

**Step 5: Verify build**

```bash
bun run build
```
Expected: clean build.

**Step 6: Manual verify**

- Open terminal
- `theme` → prints available themes
- `theme green` → terminal turns green
- `theme amber` → amber
- `theme ice` → ice blue
- `theme inherit` → resets to site colors
- `theme neon` → error message with valid options

**Step 7: Commit**

```bash
git add src/components/terminal/terminal-types.ts \
        src/components/terminal/terminal-commands.ts \
        src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): add theme command with green/amber/ice palettes"
```

---

### Task 4: localStorage persistence

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro` (IIFE only)

**Step 1: Add a localStorage helper**

Near the top of the IIFE (after the `const chromePath = ...` line), add:

```ts
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private browsing */ }
}
```

**Step 2: Restore state on load**

After the helpers and before `setExpandButtonState(false); renderCwd();` at the bottom of the IIFE, add:

```ts
// Restore persisted state
const savedCwd = lsGet('terminal:cwd');
const savedTheme = lsGet('terminal:theme');
const savedOpen = lsGet('terminal:open');
if (savedCwd) state = { cwd: savedCwd };
if (savedTheme) applyTheme(savedTheme);
if (savedOpen === '1') openMode();
```

**Step 3: Persist cwd on cd**

In `runLine`, after `state = result.next; renderCwd();`, add:

```ts
if (result.next.cwd !== state.cwd) {
  // state was already updated above; compare via result
}
```

Wait — `state` is already set to `result.next` at that point. Track the previous cwd instead:

```ts
function runLine(raw: string) {
  const line = raw.trim();
  if (!line) return;
  appendEcho(line);
  const prevCwd = state.cwd;
  const result = runCommandLine(line, state, siteData);
  state = result.next;
  renderCwd();

  if (state.cwd !== prevCwd) {
    lsSet('terminal:cwd', state.cwd);
  }

  if (result.setTheme) {
    applyTheme(result.setTheme);
    lsSet('terminal:theme', result.setTheme);
  }
  // ... rest unchanged
```

**Step 4: Persist terminal open/close state**

In `openMode()`, at the end (after `syncViewportHeight()`):
```ts
lsSet('terminal:open', '1');
```

In `closeMode()`, after `isOpen = false`:
```ts
lsSet('terminal:open', '0');
```

**Step 5: Verify build**

```bash
bun run build
```
Expected: clean build.

**Step 6: Manual verify**

- Open terminal, `cd writing`, close page, reopen — terminal opens at `~/writing`
- `theme green`, close page, reopen — terminal reopens with green theme
- Close terminal, close page, reopen — terminal stays closed

**Step 7: Commit**

```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): persist cwd, theme, and open state to localStorage"
```

---

### Task 5: Tab completion pure functions

**Files:**
- Create: `src/components/terminal/terminal-completion.ts`

**Step 1: Create the module**

```ts
import type { SiteTerminalData, VirtualCwd } from './terminal-types';
import { isValidCwd, lsLines, resolveCd } from './terminal-fs';

export interface CompletionResult {
  completed: string;
  matches: string[];
}

const COMMANDS = [
  'help', '?', 'ls', 'll', 'cd', 'cat', 'open', 'man', 'pwd',
  'clear', 'exit', 'whoami', 'hint', 'theme', 'trace', 'coffee',
  '..',
];

function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return '';
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return '';
  }
  return prefix;
}

function completionResult(
  inputPrefix: string,
  stub: string,
  candidates: string[],
): CompletionResult {
  const matches = candidates.filter((c) => c.startsWith(stub));
  if (matches.length === 0) return { completed: inputPrefix + stub, matches: [] };
  if (matches.length === 1) return { completed: inputPrefix + matches[0], matches: [] };
  const prefix = longestCommonPrefix(matches);
  return { completed: inputPrefix + prefix, matches };
}

function completeCommand(partial: string): CompletionResult {
  return completionResult('', partial, COMMANDS);
}

function completePath(
  inputPrefix: string,
  partialArg: string,
  cwd: VirtualCwd,
  data: SiteTerminalData,
): CompletionResult {
  // Split on last '/' to find base dir and stub
  const lastSlash = partialArg.lastIndexOf('/');
  let baseArg: string;
  let stub: string;

  if (lastSlash === -1) {
    // No slash — complete entries in cwd
    baseArg = '';
    stub = partialArg;
  } else {
    baseArg = partialArg.slice(0, lastSlash + 1); // includes trailing slash
    stub = partialArg.slice(lastSlash + 1);
  }

  // Resolve the base directory
  const resolvedBase = baseArg
    ? resolveCd(cwd, baseArg.replace(/\/$/, '') || '~')
    : cwd;

  if (!resolvedBase || !isValidCwd(resolvedBase, data)) {
    return { completed: inputPrefix + partialArg, matches: [] };
  }

  const entries = lsLines(resolvedBase, data);
  // Filter out hint lines like '(use cat to read)' — only real entries
  const realEntries = entries.filter(
    (e) => !e.startsWith('(') && e !== 'ls: invalid cwd',
  );

  return completionResult(inputPrefix + baseArg, stub, realEntries);
}

export function getCompletion(
  inputValue: string,
  cwd: VirtualCwd,
  data: SiteTerminalData,
): CompletionResult {
  const spaceIdx = inputValue.indexOf(' ');

  if (spaceIdx === -1) {
    // No space yet — completing the command name
    return completeCommand(inputValue);
  }

  // Has space — completing an argument/path
  const cmdPart = inputValue.slice(0, spaceIdx + 1); // "cd " or "cat " etc.
  const argPart = inputValue.slice(spaceIdx + 1);

  return completePath(cmdPart, argPart, cwd, data);
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build
```
Expected: clean build. The new file is imported in the next task; for now verify no syntax errors by checking build passes.

**Step 3: Commit**

```bash
git add src/components/terminal/terminal-completion.ts
git commit -m "feat(terminal): add tab completion pure functions (commands + paths)"
```

---

### Task 6: Wire tab completion to the shell

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`

**Step 1: Import `getCompletion` from the new module**

Find the existing imports in the `<script>` tag:

```ts
import { runCommandLine } from './terminal-commands';
import {
  handlePagerKey,
  pageUp,
  pageDown,
  shouldUsePager,
  sliceVisible,
  type PagerState,
} from './terminal-pager';
import type { SiteTerminalData, TerminalState } from './terminal-types';
```

Add:
```ts
import { getCompletion } from './terminal-completion';
```

**Step 2: Add Tab key handler in the global `keydown` listener**

In the `keydown` handler, after the `Ctrl+C` block and before the ArrowUp history handler, add:

```ts
// Tab — command/path completion
if (e.key === 'Tab') {
  e.preventDefault();
  const result = getCompletion(input.value, state.cwd, siteData);
  input.value = result.completed;
  if (result.matches.length > 1) {
    appendLine(result.matches.join('  '), 'text-mute');
  }
  queueMicrotask(() => {
    input.selectionStart = input.selectionEnd = input.value.length;
  });
  return;
}
```

**Step 3: Verify build**

```bash
bun run build
```
Expected: clean build, 28 pages.

**Step 4: Manual verify (full completion test)**

- Open terminal at `~`
- `hel<Tab>` → `help ` (single match, space appended)
- `c<Tab>` → `c` stays (ambiguous: cat, cd, clear, coffee), matches listed in output
- `cd wri<Tab>` → `cd writing/` (single path match)
- `cd w<Tab>` → `cd w` (ambiguous: writing/, work/), both listed
- `cat <Tab>` (at `~`) → lists root entries
- `cd writing/<Tab>` → lists all post slugs
- `<Tab>` on empty input → lists all commands
- At `~/writing`, `cat <Tab>` → lists post slugs

**Step 5: Commit**

```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(terminal): wire tab completion to shell (commands + paths)"
```

---

## Full Verification Pass

After all 6 tasks:

```bash
bun run build   # must pass
```

**Keyboard walk-through (desktop)**
1. `Ctrl/Cmd+Shift+T` — open
2. `..` → moves up one level from wherever saved cwd was
3. Type some commands, then `Ctrl+C` → clears input
4. `ls`, `cd writing`, `ls`, `cat <slug>` — fill output buffer
5. `Ctrl+L` → output clears
6. `trace` → fake stack trace
7. `coffee` → ASCII cup
8. `theme green` → terminal goes green
9. `theme inherit` → back to normal
10. Close terminal, reload page — terminal reopens at `~/writing` with saved theme
11. `c<Tab>` → matches listed; `cd wri<Tab>` → completes to `cd writing/`
12. `man easter-eggs` → mentions trace and coffee

**Mobile walk-through**
- All above still works; Tab completion is bonus (touch keyboard usually has no Tab key, so it degrades gracefully)
