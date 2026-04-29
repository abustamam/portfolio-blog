# Terminal Option C Design

**Date:** 2026-04-28  
**Status:** Approved  
**Owner:** Rasheed + Assistant  
**Follows:** Option B (PR #3 — terminal UX + mobile)

## Goal

Close the remaining spec gaps in the terminal: tab completion (commands + paths, unix-style), keyboard shortcuts (`Ctrl+L`/`Ctrl+C`), `theme` command (palette swap), localStorage persistence, easter eggs (`trace`, `coffee`), and `..` standalone alias.

## Scope

- `..` standalone alias for `cd ..`
- `Ctrl+L` clear output, `Ctrl+C` cancel input line
- localStorage persistence of cwd, terminal open state, and theme
- Easter eggs: `trace` (fake stack trace), `coffee` (ASCII cup)
- `theme` command — palette swap within the terminal only
- Tab completion — commands + paths, common-prefix + list on ambiguous

## Design

### 1. Simple Items

**`..` standalone alias**  
In `terminal-commands.ts`, before the alias map, check if the raw command token is `..` and treat it as `cd ..`.

**`Ctrl+L` and `Ctrl+C`**  
In the global `keydown` handler in `TerminalModeShell.astro`, inside the `isOpen` gate:
- `Ctrl+L`: call `clearOutput()` (same effect as `clear` command). `e.preventDefault()` to suppress browser default.
- `Ctrl+C`: clear `input.value`, reset `historyIndex = -1`, `historyDraft = ''`. Does not exit mode.

**localStorage persistence**  
Keys: `terminal:open`, `terminal:cwd`, `terminal:theme`. All writes wrapped in try/catch for private browsing.

- On `openMode()`/`closeMode()`: write `terminal:open`.
- On cwd change (after `cd` resolves): write `terminal:cwd`.
- On `theme` command: write `terminal:theme`.
- On page load (in IIFE before `renderCwd()`): read all three, restore state. If `terminal:open` is `'1'`, call `openMode()`.

**Easter eggs**

`trace` output:
```
Segmentation fault (core dumped)
#0  0x00000000 in existence ()
#1  0x0000002a in consulting.c:404
#2  0x00c0ffee in main ()
    at life.c:1
note: try turning it off and on again
```

`coffee` output:
```
     ( (
      ) )
   .______.
   |      |]
   \      /
    `----'
> brewing ideas since 2019
```

Neither listed in `help`. Both hintable via `hint` and `man easter-eggs`.

### 2. Theme Command

**Palettes:** `inherit` (default), `green`, `amber`, `ice`.

**Mechanism:** Set `data-theme="<name>"` on `#terminal-mode-shell`. CSS rules in `<style is:global>` override four custom properties on the element:

| Property | green | amber | ice |
|---|---|---|---|
| `--terminal-bg` | `#0a0a0a` | `#0d0800` | `#060d14` |
| `--terminal-ink` | `#33ff33` | `#ffb000` | `#7dd3fc` |
| `--terminal-accent` | `#00ff88` | `#ffcc44` | `#38bdf8` |
| `--terminal-mute` | `#1a661a` | `#664a00` | `#1e3a4f` |

The terminal shell's background, text, accent, and muted text elements use these custom properties when a theme is active, falling back to site tokens via `var(--terminal-bg, var(--color-bg))`.

**Command behaviour:**
- `theme` (no args): print current theme and list available options.
- `theme <name>`: apply palette, persist to `terminal:theme`.
- `theme inherit`: reset to default.
- Unknown name: print error + list valid options.

### 3. Tab Completion

**New module:** `src/components/terminal/terminal-completion.ts`

```ts
export interface CompletionResult {
  completed: string;   // replacement value for input.value
  matches: string[];   // all matches (for display when > 1)
}

export function getCompletion(
  input: string,
  cwd: string,
  siteData: SiteTerminalData,
): CompletionResult
```

**Context detection:**
- If the input has no space (cursor is on first token): **command completion**.
- If the input has a space: **argument/path completion**.

**Command completion:**
- Candidate list: `help ? ls ll cd cat open man pwd clear exit whoami hint theme trace coffee`.
- Filter by prefix match against the partial token.
- Single match: return `completed = match + ' '`, `matches = []`.
- Multiple: return `completed = longestCommonPrefix(matches)`, `matches = [...all matches]`.
- Zero: return `completed = input`, `matches = []`.

**Path completion:**
- Extract the path argument (text after the last space).
- If the partial contains `/`, split on the last `/` to get `baseArg` + `stub`. Resolve `baseArg` relative to `cwd` using the existing `resolveCd`. Otherwise `base = cwd`, `stub = partial`.
- Get entries via `lsLines(resolvedBase, siteData)`.
- Filter entries by `stub` prefix (case-sensitive, matching existing filesystem convention).
- Apply same single/multiple/zero logic as command completion.
- Replace only the path argument portion of `input.value`, preserving the command prefix.

**Shell wiring:**
- `Tab` keydown: `e.preventDefault()`, call `getCompletion`.
- Set `input.value = result.completed`, move cursor to end.
- If `result.matches.length > 1`: `appendLine` each match (reuse `appendLine` with `text-mute` class), do not submit the line.
- Zero matches: no-op (silent, standard unix behaviour).

**Longest common prefix helper** (internal to the module):
```ts
function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return '';
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}
```

## Files Affected

- `src/components/terminal/terminal-commands.ts` — `..` alias, easter eggs, theme command
- `src/components/terminal/terminal-completion.ts` — **new file**, tab completion pure functions
- `src/components/terminal/TerminalModeShell.astro` — Tab/Ctrl+L/Ctrl+C keydown, theme data-attr + CSS, localStorage read/write, completion wiring

## Testing Checklist

**`..` alias**
- [ ] At `~/writing`, type `..` and Enter — moves to `~`

**Ctrl+L / Ctrl+C**
- [ ] `Ctrl+L` clears output buffer
- [ ] `Ctrl+C` clears input, does not exit terminal

**localStorage**
- [ ] Open terminal, cd to `~/writing`, reload page — terminal reopens at `~/writing`
- [ ] Set theme to `green`, reload — terminal opens with green theme
- [ ] Close terminal, reload — terminal stays closed

**Easter eggs**
- [ ] `trace` prints fake stack trace
- [ ] `coffee` prints ASCII cup
- [ ] Neither appears in `help` output

**Theme**
- [ ] `theme` prints current theme + options
- [ ] `theme green` turns terminal green
- [ ] `theme inherit` resets
- [ ] Unknown: `theme neon` prints error

**Tab completion — commands**
- [ ] `hel<Tab>` → `help `
- [ ] `c<Tab>` → `c` (ambiguous: cat, cd, clear), lists matches
- [ ] `<Tab>` on empty input → lists all commands

**Tab completion — paths**
- [ ] At `~`, `cd wri<Tab>` → `cd writing/`
- [ ] At `~`, `cd w<Tab>` → `cd w` (writing/, work/), lists both
- [ ] At `~/writing`, `cat <Tab>` lists post slugs
- [ ] `cd ~/wri<Tab>` → `cd ~/writing/` (absolute path)
