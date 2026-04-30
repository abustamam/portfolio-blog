# Terminal Widget Design

**Date:** 2026-04-30
**Status:** Approved
**Owner:** Rasheed + Assistant
**Follows:** Option C (PR #4 — tab completion, themes, localStorage, easter eggs)

## Goal

Replace the static hero card on the home page with a real interactive terminal widget. The widget runs the full command engine, starts with a typewriter `whoami` intro, and expands cleanly into full-screen terminal mode with session state carried over.

## Scope

- New `TerminalWidget.astro` component — live terminal in the hero card
- Typewriter intro: `whoami` typed on load (IntersectionObserver on mobile)
- Fixed-height scrollable output, live prompt, blocky blinking cursor
- Tab completion, ArrowUp/Down history, Ctrl+C — same as full-screen shell
- No pager — long output scrolls within the widget
- Expand button → clean fade transition into full-screen terminal mode
- Session state (output lines + history) carried over via localStorage on expand
- Full-screen shell pre-populates from session on open, then clears the one-shot key

## Out of Scope

- Ctrl+L in the widget (clearing a card terminal is weird UX)
- `exit` closing the widget (prints its normal message, stays open)
- Pager in the widget

## Design

### 1. Component Architecture

**New file:** `src/components/TerminalWidget.astro`

Replaces the static card markup in the hero. Receives `siteData` as a prop (same JSON the full-screen shell uses). Runs `runCommandLine` in a self-contained IIFE. Owns the typewriter intro, output area, prompt, and expand button.

**`src/pages/index.astro`**
- Import and render `<TerminalWidget siteData={...} />` in place of the static card `<div>`
- Remove the static timestamp `setInterval` loop (`.term-ts` spans are gone)
- Remove the `hero-terminal-open` click handler (widget owns expand now)

**`src/components/terminal/TerminalModeShell.astro`**
- On `openMode()`: read `terminal:session-lines` (JSON `{text,cls}[]`) and `terminal:history` (JSON `string[]`) from localStorage; pre-populate output buffer and history stack; clear `terminal:session-lines` after consuming (one-shot)
- `terminal:cwd` and `terminal:theme` already read on open from Option C — no change needed there

**`src/components/terminal/terminal-commands.ts`** — no changes.

### 2. Inline Widget UX

**DOM structure:**
```
┌──────────────────────────────────────────┐
│ whoami.sh                    [expand ↗]  │  ← chrome bar
├──────────────────────────────────────────┤
│                                          │
│  (scrollable output area, h-48)          │
│  $ whoami                                │
│  rasheed bustamam · …                   │
│  engineering journal · since 2019        │
│  …                                       │
│                                          │
├──────────────────────────────────────────┤
│  rasheed@bustamam:~$ █                   │  ← live prompt, always visible
└──────────────────────────────────────────┘
```

The prompt row is pinned below the scrollable output (flex column, output `flex-1 overflow-y-auto`, prompt `shrink-0`).

**Blocky cursor:** same `inline-block w-1.75 h-3.25 bg-accent ml-0.5 align-middle animate-[termBlink_1s_step-end_infinite]` span, always rendered on the prompt line.

**Typewriter intro sequence:**
1. `IntersectionObserver` at threshold 0.3 — fires immediately on desktop (widget is in viewport), deferred on mobile until the card scrolls into view. Runs once.
2. Type `whoami` at 60ms/char into a read-only display span on the prompt line.
3. 300ms pause.
4. Call `runCommandLine('whoami', initialState, siteData)` — flush result lines into output buffer instantly.
5. Clear the display span; show the live `<input>` prompt with blinking cursor. Ready for input.

**Input handling:** real `<input type="text">` — same keydown handlers as the full-screen shell:
- `Enter` → run command, append echo + output lines, scroll to bottom
- `Tab` → `getCompletion`, same behavior
- `ArrowUp/Down` → history traversal
- `Ctrl+C` → clear input
- No `Ctrl+L`, no pager

**No pager:** `cat` on a long post streams all lines into the scrollable output area. `shouldUsePager` check is skipped in the widget's `runLine`.

**Auto-scroll:** after every command, `outputEl.scrollTop = outputEl.scrollHeight`.

### 3. Expand Transition

**On expand click:**
1. Serialize to localStorage:
   - `terminal:session-lines` — JSON array of `{text: string, cls: string}` for every line in the widget's output buffer
   - `terminal:history` — JSON array of command strings from the widget's history buffer
   - `terminal:cwd` and `terminal:theme` — already written continuously, no change
2. Fade widget output area to opacity 0 over 150ms (`transition-opacity duration-150`)
3. Dispatch `terminal:open` (same event the TerminalChrome button uses)
4. Full-screen shell opens with standard fade-in; before first render it reads and consumes `terminal:session-lines` and `terminal:history`
5. `terminal:session-lines` is deleted from localStorage after consumption (one-shot)

**Widget state after expand:**
- Output area stays faded (`opacity-0 pointer-events-none`) while full-screen is open
- Listens for `terminal:closed` event → fades back in (`opacity-100`), remains interactive

**Full-screen shell reads `terminal:history`** and pre-fills `historyBuffer` so ArrowUp works from the widget session. It does NOT delete `terminal:history` — that persists normally for the next session.

### 4. localStorage Keys Summary

| Key | Written by | Read by | One-shot? |
|-----|-----------|---------|-----------|
| `terminal:cwd` | Widget + shell (on cd) | Shell (on open) | No |
| `terminal:theme` | Widget + shell (on theme) | Shell + widget (on open) | No |
| `terminal:open` | Shell (on open/close) | Shell (on page load) | No |
| `terminal:history` | Widget (on expand) | Shell (on open) | No |
| `terminal:session-lines` | Widget (on expand) | Shell (on open) | Yes — deleted after read |

### 5. Files Affected

- `src/components/TerminalWidget.astro` — **new file**
- `src/pages/index.astro` — swap static card for `<TerminalWidget />`, remove timestamp loop + old click handler
- `src/components/terminal/TerminalModeShell.astro` — read session-lines + history on `openMode()`

## Testing Checklist

**Typewriter intro**
- [ ] Desktop: `whoami` types on page load, output appears, prompt focuses
- [ ] Mobile: widget off-screen on load → animation defers until scrolled into view
- [ ] Animation runs exactly once per page load (not on re-scroll)

**Inline interaction**
- [ ] Type `ls`, Enter → output appears, auto-scrolls
- [ ] `cat <long-post>` → lines stream into scrollable area (no pager)
- [ ] `cd writing`, `ls` → cwd persists, written to `terminal:cwd`
- [ ] `theme green` → widget turns green
- [ ] Tab completion works (`hel<Tab>` → `help `)
- [ ] ArrowUp/Down cycles history
- [ ] Ctrl+C clears input

**Expand transition**
- [ ] Click expand → widget fades, full-screen opens with same output content
- [ ] Full-screen history stack contains widget session commands
- [ ] `terminal:session-lines` absent from localStorage after shell opens
- [ ] Full-screen shell closes → widget fades back in, still interactive
- [ ] Open full-screen directly (no widget session) → starts clean as before
