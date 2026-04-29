# Terminal UX Polish + Mobile Support

**Date:** 2026-04-28  
**Status:** Approved  
**Branch:** feat/terminal-mode-planning  
**Owner:** Rasheed + Assistant

## Goal

Fix the terminal so it is genuinely usable on mobile (Option B), and note the immediate follow-on PR (Option C) that closes remaining spec gaps.

## Scope

### This PR (Option B)

**Mobile fixes**
- Touch targets: minimize button and TerminalChrome toggle are too small for touch
- iOS virtual keyboard hides the prompt input under the keyboard
- Pager has no touch controls — keyboard-only hjkl/arrows are unreachable on mobile

**Desktop polish**
- No command history — ArrowUp/Down does nothing, breaking basic terminal muscle memory
- `/` and `⌘K` site-search shortcuts fire inside terminal mode and steal focus from the prompt
- Pager renders as a 40vh drawer with output still visible above it — should dominate the viewport
- A `[pager] N lines…` line is permanently appended to the scroll buffer before the pager opens

### Next PR (Option C — immediate follow-on)

- Tab completion (commands and paths)
- `Ctrl+L` / `Ctrl+C` keyboard shortcuts
- `theme` command (currently a stub)
- localStorage persistence of cwd and mode
- `trace` / `coffee` easter eggs
- `..` standalone shorthand for `cd ..`

## Design

### 1. Touch Targets

**Minimize button** (`w-2 h-2`, 8px circle):  
Wrap with `p-3 -m-3` padding/negative-margin utility to create a 44px invisible hit area. Visual dot is unchanged.

**TerminalChrome "Terminal" toggle**:  
Bump from `py-0.5` to `py-1.5`. The chrome bar is 34px tall so full 44px is not possible — acceptable since mobile users also have the hero card button on the index page.

### 2. iOS Virtual Keyboard

The shell uses `fixed inset-0`. On iOS Safari, the virtual keyboard does not resize fixed elements — the prompt sits below the keyboard and is hidden. Additionally, `text-xs` (12px) on the input triggers iOS auto-zoom.

**Fix:**
- Subscribe to `visualViewport.resize` in the shell script. On resize, set `--vvp-height` as a CSS custom property on the shell element.
- Override shell height: `height: var(--vvp-height, 100dvh)` instead of relying solely on `inset-0`.
- Set `font-size: 16px` explicitly on `#terminal-input` to suppress iOS auto-zoom.

### 3. Pager Touch Buttons

Add two `<button>` elements in the pager meta bar:
- `‹ prev` (left) — calls `pageUp`
- `next ›` (right) — calls `pageDown`
- Keyboard hint text between them: `arrows · hjkl · q quit`
- Each button: `min-h-[44px] px-4` for touch targets
- Buttons are always rendered; touch users need them, keyboard users ignore them

### 4. Command History

Add `historyBuffer: string[]` and `historyIndex: number` (init `-1`) alongside existing shell state.

**On submit:** push command to `historyBuffer`, reset `historyIndex = -1`. Save empty draft buffer.

**ArrowUp in prompt:**
- If `historyIndex === -1`: save current input value as draft
- Increment index (clamped to `historyBuffer.length - 1`)
- Set input value to `historyBuffer[historyBuffer.length - 1 - historyIndex]`
- Only fires when pager is not active (existing `if (pagerState)` guard already covers this)

**ArrowDown in prompt:**
- Decrement index
- At `-1`: restore draft
- Only fires when pager is not active

### 5. Gate Site-Search Shortcuts

In `src/pages/index.astro`, the `keydown` handler for `/` and `⌘K` gets one guard added:

```ts
if (document.documentElement.classList.contains('terminal-mode')) return;
```

The terminal already adds/removes `terminal-mode` on the `<html>` element — no new state needed.

### 6. Pager Layout Fix

Currently the pager is a `shrink-0 max-h-[40vh]` flex child. The output remains visible above it — looks broken.

**Fix:**
- `openPager()`: add `hidden` class to `#terminal-output`, remove `max-h-[40vh]` from pager, switch pager from `shrink-0` to `flex-1`
- `closePager()`: reverse — remove `hidden` from output, restore `shrink-0` and `max-h-[40vh]` on pager

Pager and output are siblings in the same flex column; swapping visibility and flex sizing is a clean swap.

### 7. Remove Ghost Pager Announce Line

Delete the `appendLine(…)` call immediately before `openPager(bodyLines)` in the `runLine` function:

```ts
// DELETE this line:
appendLine(`[pager] ${bodyLines.length} lines — arrows or hjkl, q to close`, 'text-mute');
openPager(bodyLines);
```

The pager meta bar already shows line count and nav hints. The echoed line is redundant and persists in the scroll buffer after the pager closes.

## Files Affected

- `src/components/terminal/TerminalModeShell.astro` — all mobile fixes, history, pager layout, ghost line removal
- `src/components/TerminalChrome.astro` — toggle button touch target
- `src/pages/index.astro` — gate `/` and `⌘K` shortcuts

## Testing Checklist

**Mobile (iOS Safari / Chrome Android)**
- [ ] Tap "Terminal" in chrome bar — terminal opens, prompt visible above keyboard
- [ ] Type a command — no auto-zoom, input not hidden by keyboard
- [ ] Run `cat` on a long post — pager opens, prev/next buttons visible and tappable
- [ ] Tap minimize dot — terminal closes

**Desktop**
- [ ] ArrowUp cycles through command history; ArrowDown restores forward / draft
- [ ] Press `/` inside terminal — site search does NOT capture focus
- [ ] Run `cat` on a long post — pager fills viewport, output is hidden behind it
- [ ] After closing pager — no stray `[pager] N lines` line in output buffer
- [ ] `Cmd/Ctrl+Shift+T` still toggles correctly

## Follow-On (Option C)

File a PR immediately after this one lands. Scope:
- Tab completion
- `Ctrl+L` / `Ctrl+C`
- `theme` command
- localStorage persistence
- Easter eggs (`trace`, `coffee`)
- `..` standalone alias
