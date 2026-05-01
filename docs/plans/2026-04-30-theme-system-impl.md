# Theme System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire two orthogonal theme axes (brightness: light/dark, color: inherit/green/amber/ice) through the terminal `theme` command and a new GUI ThemePicker, so both the site and terminal reflect both axes without a flash on load.

**Architecture:** Brightness is stored in `localStorage['theme']` and toggles `<html class="dark">` (existing). Color is stored in `localStorage['terminal:theme']` and now also sets `data-color-theme` on `<html>` (site accent) in addition to `data-theme` on terminal elements (full palette). A pre-paint inline script in `BaseHead.astro` reads both keys and applies both before first paint. A new `ThemePicker.astro` popover replaces the old `ThemeToggle.astro` in `TerminalChrome.astro`.

**Tech Stack:** Astro 5, Tailwind CSS v4, TypeScript, vanilla JS (no framework)

---

### Task 1: Update terminal-types.ts — split theme types

**Files:**
- Modify: `src/components/terminal/terminal-types.ts`

**Step 1: Open the file and make the changes**

Replace the `VALID_THEMES` block and `ThemeName` / `CommandResult` with:

```ts
export const BRIGHTNESS_THEMES = ['light', 'dark'] as const;
export const COLOR_THEMES = ['inherit', 'green', 'amber', 'ice'] as const;
export const VALID_THEMES = [...BRIGHTNESS_THEMES, ...COLOR_THEMES] as const;
export type BrightnessTheme = (typeof BRIGHTNESS_THEMES)[number];
export type ColorTheme = (typeof COLOR_THEMES)[number];
export type ThemeName = (typeof VALID_THEMES)[number];
```

In `CommandResult`, replace `setTheme?: ThemeName` with:

```ts
setBrightness?: BrightnessTheme;
setColor?: ColorTheme;
```

**Step 2: Build to verify types compile**

```bash
cd /media/rasheed-bustamam/Extra/coding/blog && bun run build 2>&1 | tail -20
```

Expected: build errors about `setTheme` being used in other files — that's expected, fix in next tasks.

**Step 3: Commit**

```bash
git add src/components/terminal/terminal-types.ts
git commit -m "refactor(theme): split ThemeName into BrightnessTheme + ColorTheme"
```

---

### Task 2: Update terminal-commands.ts — split theme handler

**Files:**
- Modify: `src/components/terminal/terminal-commands.ts`

**Step 1: Update imports at top**

Replace the import line that references `VALID_THEMES` and `ThemeName`:

```ts
import type { CommandResult, SiteTerminalData, TerminalState, BrightnessTheme, ColorTheme } from './terminal-types';
import { BRIGHTNESS_THEMES, COLOR_THEMES, VALID_THEMES } from './terminal-types';
```

**Step 2: Replace the `theme` handler**

Find the `if (alias === 'theme')` block and replace it entirely:

```ts
if (alias === 'theme') {
  const requested = (args[0] ?? '').toLowerCase();

  if (!requested) {
    return {
      next: state,
      lines: [
        'brightness: [light · dark]',
        'color:      [inherit · green · amber · ice]',
        'usage: theme <light|dark|inherit|green|amber|ice>',
      ],
    };
  }

  if ((BRIGHTNESS_THEMES as readonly string[]).includes(requested)) {
    return {
      next: state,
      lines: [`brightness: ${requested}`],
      setBrightness: requested as BrightnessTheme,
    };
  }

  if ((COLOR_THEMES as readonly string[]).includes(requested)) {
    return {
      next: state,
      lines: [`color: ${requested}`],
      setColor: requested as ColorTheme,
    };
  }

  return {
    next: state,
    lines: [
      `theme: unknown theme '${requested}'`,
      `brightness: light · dark`,
      `color:      inherit · green · amber · ice`,
    ],
  };
}
```

**Step 3: Build to verify**

```bash
bun run build 2>&1 | tail -20
```

Expected: remaining errors in TerminalWidget and TerminalModeShell about `setTheme` — fix in later tasks.

**Step 4: Commit**

```bash
git add src/components/terminal/terminal-commands.ts
git commit -m "refactor(theme): split terminal theme command into brightness/color axes"
```

---

### Task 3: Add color theme CSS to global.css

**Files:**
- Modify: `src/styles/global.css`

**Step 1: Add the `[data-color-theme]` blocks**

After the `.dark { ... }` block, add:

```css
/* ── Color theme overrides (accent only, both light and dark variants) ── */
[data-color-theme="amber"] {
  --color-accent:     #9a5f00;
  --color-accent-bg:  #fef3dc;
  --color-accent-ink: #5a3600;
}
.dark[data-color-theme="amber"] {
  --color-accent:     #ffb000;
  --color-accent-bg:  #2a1f00;
  --color-accent-ink: #ffcc44;
}

[data-color-theme="ice"] {
  --color-accent:     #0369a1;
  --color-accent-bg:  #e0f2fe;
  --color-accent-ink: #0c4a6e;
}
.dark[data-color-theme="ice"] {
  --color-accent:     #38bdf8;
  --color-accent-bg:  #0a1f2e;
  --color-accent-ink: #7dd3fc;
}

[data-color-theme="green"] {
  --color-accent:     #1f6f43;
  --color-accent-bg:  #dbeadf;
  --color-accent-ink: #0f3f23;
}
.dark[data-color-theme="green"] {
  --color-accent:     #8cff5c;
  --color-accent-bg:  #172010;
  --color-accent-ink: #b8ff8a;
}
```

Also update the terminal widget theme overrides in the `<style is:global>` block of `TerminalWidget.astro` to include light-mode variants. Find the `#terminal-widget[data-theme="green"]` block and replace with:

```css
/* Terminal widget — immersive palette overrides (dark variants, default) */
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
/* Light-mode overrides for terminal widget color themes */
html:not(.dark) #terminal-widget[data-theme="green"] {
  --color-bg: #f0fdf4; --color-surface: #ffffff; --color-code: #e8fdf0;
  --color-ink: #1f6f43; --color-mute: #3a8f5f; --color-faint: #86c9a2;
  --color-accent: #1f6f43; --color-line: #bbdece; --color-line-soft: #d5eed9;
}
html:not(.dark) #terminal-widget[data-theme="amber"] {
  --color-bg: #fffbf0; --color-surface: #ffffff; --color-code: #fff8e6;
  --color-ink: #9a5f00; --color-mute: #b87800; --color-faint: #d4a847;
  --color-accent: #9a5f00; --color-line: #e8d5a3; --color-line-soft: #f0e4c0;
}
html:not(.dark) #terminal-widget[data-theme="ice"] {
  --color-bg: #f0f9ff; --color-surface: #ffffff; --color-code: #e8f5ff;
  --color-ink: #0369a1; --color-mute: #0284c7; --color-faint: #7dd3fc;
  --color-accent: #0369a1; --color-line: #b8dcf0; --color-line-soft: #d0eaf8;
}
```

**Step 2: Build to verify CSS compiles**

```bash
bun run build 2>&1 | tail -5
```

Expected: build succeeds (CSS errors show up in build).

**Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(theme): add data-color-theme accent overrides and terminal light-mode variants"
```

---

### Task 4: Move pre-paint script to BaseHead.astro

**Files:**
- Modify: `src/components/BaseHead.astro`
- Modify: `src/components/ThemeToggle.astro`

**Step 1: Add the extended pre-paint script to BaseHead.astro**

At the very end of `BaseHead.astro` (after the Twitter meta tags), add:

```html
<!-- Pre-paint: prevent brightness + color theme flash -->
<script is:inline>
  (function () {
    var brightness = localStorage.getItem('theme') || 'light';
    var color = localStorage.getItem('terminal:theme') || 'inherit';
    document.documentElement.classList.toggle('dark', brightness === 'dark');
    if (color !== 'inherit') {
      document.documentElement.setAttribute('data-color-theme', color);
    } else {
      document.documentElement.removeAttribute('data-color-theme');
    }
  })();
</script>
```

**Step 2: Remove the pre-paint script from ThemeToggle.astro**

In `ThemeToggle.astro`, delete the entire `<script is:inline>` block (the one that starts with `(function() { var saved = localStorage.getItem('theme')`). Keep only the non-inline `<script>` block that handles the click.

**Step 3: Build and verify no flash**

```bash
bun run dev
```

Open browser, hard-refresh. Check that the page loads in the correct theme without a white flash.

**Step 4: Commit**

```bash
git add src/components/BaseHead.astro src/components/ThemeToggle.astro
git commit -m "feat(theme): move pre-paint script to BaseHead, extend for color theme"
```

---

### Task 5: Create ThemePicker.astro

**Files:**
- Create: `src/components/ThemePicker.astro`

**Step 1: Write the component**

```astro
---
// ThemePicker.astro — replaces ThemeToggle in TerminalChrome
---

<div class="relative" id="theme-picker-root">
  <button
    id="theme-picker-btn"
    type="button"
    aria-haspopup="true"
    aria-expanded="false"
    class="bg-transparent border border-line text-ink cursor-pointer font-mono text-10 py-0.75 px-2 rounded-sm tracking-wider uppercase"
  >
    <span id="theme-picker-label">☾ dark</span>
  </button>

  <div
    id="theme-picker-popover"
    role="menu"
    hidden
    class="absolute right-0 top-full mt-1 z-50 bg-surface border border-line rounded shadow-lg min-w-[160px] py-1 text-left"
  >
    <!-- Group 1: Brightness -->
    <div class="px-2.5 pt-1.5 pb-1 font-mono text-10 text-faint tracking-caps uppercase">brightness</div>
    <button type="button" role="menuitemradio" data-brightness="light"
      class="theme-picker-opt w-full text-left px-3 py-1.5 font-mono text-xs text-ink hover:bg-accent-bg flex items-center gap-2">
      <span class="theme-picker-check opacity-0">✓</span> ☀ light
    </button>
    <button type="button" role="menuitemradio" data-brightness="dark"
      class="theme-picker-opt w-full text-left px-3 py-1.5 font-mono text-xs text-ink hover:bg-accent-bg flex items-center gap-2">
      <span class="theme-picker-check opacity-0">✓</span> ☾ dark
    </button>

    <div class="my-1 border-t border-line"></div>

    <!-- Group 2: Color -->
    <div class="px-2.5 pt-1.5 pb-1 font-mono text-10 text-faint tracking-caps uppercase">color</div>
    <button type="button" role="menuitemradio" data-color="inherit"
      class="theme-picker-opt w-full text-left px-3 py-1.5 font-mono text-xs text-ink hover:bg-accent-bg flex items-center gap-2">
      <span class="theme-picker-check opacity-0">✓</span>
      <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span> inherit
    </button>
    <button type="button" role="menuitemradio" data-color="green"
      class="theme-picker-opt w-full text-left px-3 py-1.5 font-mono text-xs text-ink hover:bg-accent-bg flex items-center gap-2">
      <span class="theme-picker-check opacity-0">✓</span>
      <span class="w-2 h-2 rounded-full shrink-0" style="background:#1f6f43"></span> green
    </button>
    <button type="button" role="menuitemradio" data-color="amber"
      class="theme-picker-opt w-full text-left px-3 py-1.5 font-mono text-xs text-ink hover:bg-accent-bg flex items-center gap-2">
      <span class="theme-picker-check opacity-0">✓</span>
      <span class="w-2 h-2 rounded-full shrink-0" style="background:#9a5f00"></span> amber
    </button>
    <button type="button" role="menuitemradio" data-color="ice"
      class="theme-picker-opt w-full text-left px-3 py-1.5 font-mono text-xs text-ink hover:bg-accent-bg flex items-center gap-2">
      <span class="theme-picker-check opacity-0">✓</span>
      <span class="w-2 h-2 rounded-full shrink-0" style="background:#0369a1"></span> ice
    </button>
  </div>
</div>

<script>
  function initThemePicker() {
    const root    = document.getElementById('theme-picker-root');
    const btn     = document.getElementById('theme-picker-btn');
    const popover = document.getElementById('theme-picker-popover');
    const label   = document.getElementById('theme-picker-label');
    if (!root || !btn || !popover || !label) return;

    // ── Shared helpers ──────────────────────────────
    function applyBrightness(b: string) {
      document.documentElement.classList.toggle('dark', b === 'dark');
      try { localStorage.setItem('theme', b); } catch { /* private */ }
      window.dispatchEvent(new CustomEvent('theme:brightness-changed', { detail: b }));
    }

    function applyColorTheme(c: string) {
      if (c === 'inherit') {
        document.documentElement.removeAttribute('data-color-theme');
      } else {
        document.documentElement.setAttribute('data-color-theme', c);
      }
      try { localStorage.setItem('terminal:theme', c); } catch { /* private */ }
      window.dispatchEvent(new CustomEvent('theme:color-changed', { detail: c }));
    }

    // Expose helpers globally so terminal components can call them
    (window as any).__applyBrightness = applyBrightness;
    (window as any).__applyColorTheme = applyColorTheme;

    // ── Label + check sync ──────────────────────────
    function syncUI() {
      const brightness = localStorage.getItem('theme') || 'light';
      const color      = localStorage.getItem('terminal:theme') || 'inherit';
      const icon = brightness === 'dark' ? '☾' : '☀';
      label.textContent = `${icon} ${brightness} · ${color}`;

      root.querySelectorAll<HTMLElement>('[data-brightness]').forEach(opt => {
        const check = opt.querySelector<HTMLElement>('.theme-picker-check');
        if (check) check.style.opacity = opt.dataset.brightness === brightness ? '1' : '0';
      });
      root.querySelectorAll<HTMLElement>('[data-color]').forEach(opt => {
        const check = opt.querySelector<HTMLElement>('.theme-picker-check');
        if (check) check.style.opacity = opt.dataset.color === color ? '1' : '0';
      });
    }

    // ── Popover open/close ─────────────────────────
    function open() {
      popover.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      syncUI();
    }
    function close() {
      popover.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', () => {
      popover.hasAttribute('hidden') ? open() : close();
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target as Node)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    // ── Option clicks ──────────────────────────────
    root.querySelectorAll<HTMLElement>('[data-brightness]').forEach(opt => {
      opt.addEventListener('click', () => {
        applyBrightness(opt.dataset.brightness!);
        syncUI();
        close();
      });
    });

    root.querySelectorAll<HTMLElement>('[data-color]').forEach(opt => {
      opt.addEventListener('click', () => {
        applyColorTheme(opt.dataset.color!);
        syncUI();
        close();
      });
    });

    // ── Init ───────────────────────────────────────
    syncUI();
  }

  initThemePicker();
  document.addEventListener('astro:after-swap', initThemePicker);
</script>
```

**Step 2: Build to verify component compiles**

```bash
bun run build 2>&1 | tail -10
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/ThemePicker.astro
git commit -m "feat(theme): add ThemePicker component with grouped brightness/color popover"
```

---

### Task 6: Wire ThemePicker into TerminalChrome, remove ThemeToggle

**Files:**
- Modify: `src/components/TerminalChrome.astro`
- Delete: `src/components/ThemeToggle.astro`

**Step 1: Update TerminalChrome.astro imports**

Replace:
```astro
import ThemeToggle from './ThemeToggle.astro';
```
With:
```astro
import ThemePicker from './ThemePicker.astro';
```

**Step 2: Replace the ThemeToggle usage**

Find `<ThemeToggle />` in the template and replace with `<ThemePicker />`.

**Step 3: Delete ThemeToggle.astro**

```bash
rm src/components/ThemeToggle.astro
```

**Step 4: Build and verify**

```bash
bun run build 2>&1 | tail -10
```

Expected: no errors. Check that no other file imports ThemeToggle.

```bash
grep -r "ThemeToggle" src/
```

Expected: no output.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(theme): swap ThemeToggle for ThemePicker in TerminalChrome"
```

---

### Task 7: Update TerminalWidget.astro — handle setBrightness/setColor

**Files:**
- Modify: `src/components/TerminalWidget.astro`

**Step 1: Replace the `applyTheme` function and `setTheme` handling**

Find the `applyTheme` function (around `function applyTheme(name: string)`) and replace it. Also find where `result.setTheme` is used and replace both.

**Remove** the existing `applyTheme` function.

**Replace** `if (result.setTheme)` block with:

```ts
if (result.setBrightness) {
  const applyBrightness = (window as any).__applyBrightness;
  if (applyBrightness) applyBrightness(result.setBrightness);
}
if (result.setColor) {
  const applyColor = (window as any).__applyColorTheme;
  if (applyColor) applyColor(result.setColor);
  // Apply to terminal element for full immersive palette
  if (result.setColor === 'inherit') {
    widget.removeAttribute('data-theme');
  } else {
    widget.setAttribute('data-theme', result.setColor);
  }
  lsSet('terminal:theme', result.setColor);
}
```

**Step 2: Update the restore-on-load block**

Find `if (savedTheme) applyTheme(savedTheme);` (appears twice: initial load and `terminal:closed` handler) and replace each with:

```ts
// Restore color theme on widget element
const savedColor = lsGet('terminal:theme');
if (savedColor && savedColor !== 'inherit') {
  widget.setAttribute('data-theme', savedColor);
} else {
  widget.removeAttribute('data-theme');
}
```

**Step 3: Build**

```bash
bun run build 2>&1 | tail -10
```

Expected: no TypeScript errors.

**Step 4: Commit**

```bash
git add src/components/TerminalWidget.astro
git commit -m "feat(theme): update TerminalWidget to use shared applyBrightness/applyColorTheme"
```

---

### Task 8: Update TerminalModeShell.astro — handle setBrightness/setColor

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`

**Step 1: Find and update the theme handling**

Search for `setTheme` in TerminalModeShell.astro. It will be in the `runLine` function where `result.setTheme` is handled.

Replace that block with:

```ts
if (result.setBrightness) {
  const applyBrightness = (window as any).__applyBrightness;
  if (applyBrightness) applyBrightness(result.setBrightness);
}
if (result.setColor) {
  const applyColor = (window as any).__applyColorTheme;
  if (applyColor) applyColor(result.setColor);
  // Full immersive palette on terminal element
  const termEl = document.getElementById('terminal-mode-shell');
  if (result.setColor === 'inherit') {
    termEl?.removeAttribute('data-theme');
  } else {
    termEl?.setAttribute('data-theme', result.setColor);
  }
}
```

Also find any `applyTheme` or `lsSet('terminal:theme', ...)` calls and update/remove them as appropriate.

**Step 2: Restore terminal color theme on open**

In the `terminal:open` event listener (or wherever the shell initializes), add:

```ts
const savedColor = lsGet('terminal:theme');
const termEl = document.getElementById('terminal-mode-shell');
if (savedColor && savedColor !== 'inherit') {
  termEl?.setAttribute('data-theme', savedColor);
} else {
  termEl?.removeAttribute('data-theme');
}
```

**Step 3: Add `[data-theme]` styles for TerminalModeShell**

The `<style is:global>` targeting `#terminal-widget[data-theme="..."]` only covers the widget. Add a matching set for `#terminal-mode-shell`:

In `TerminalModeShell.astro`'s `<style is:global>` block (or add one), duplicate the palette overrides with `#terminal-mode-shell[data-theme="..."]` selectors, identical values.

**Step 4: Build and verify**

```bash
bun run build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(theme): update TerminalModeShell to handle setBrightness/setColor"
```

---

### Task 9: End-to-end visual verification

**Step 1: Start dev server**

```bash
bun run dev
```

**Step 2: Verify ThemePicker popover**

- Open the site, click the theme label in the TerminalChrome bar
- Popover should appear with two groups
- Click "dark" → site goes dark, popover label updates to `☾ dark · inherit`
- Click "amber" → links/accents turn amber, label updates to `☾ dark · amber`
- Click "light" → site goes light with amber accents
- Click "inherit" → accents revert to default green
- Press Escape → popover closes
- Click outside → popover closes

**Step 3: Verify terminal theme command**

- Open terminal (Ctrl+Shift+T or Terminal button)
- Type `theme` → should show grouped output with both axes
- Type `theme dark` → site goes dark
- Type `theme amber` → terminal and site accents go amber
- Type `theme ice` → terminal and site accents go ice blue
- Type `theme inherit` → resets color
- Type `theme light` → site goes light

**Step 4: Verify no flash on reload**

- Set theme to `dark · ice`
- Hard-reload the page
- Page should load directly in dark+ice without any light flash

**Step 5: Commit if all good**

```bash
git add -A
git commit -m "feat(theme): complete theme system — two-axis light/dark + color with GUI picker"
```
