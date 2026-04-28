# Terminal Mode Design Spec

**Date:** 2026-04-28  
**Status:** Approved (brainstormed)  
**Owner:** Rasheed + Assistant

## Goal

Add a playful, fully keyboard-navigable **Terminal Mode** to the blog that:

- Feels like a shell, but is intentionally simulated (no real shell execution).
- Lets visitors navigate site structure through familiar commands (`ls`, `cd`, `cat`, `help`, etc.).
- Includes discoverable and hidden easter eggs.
- Supports complete keyboard-only operation, including reading long post output inside terminal mode.
- Aligns route structure and copy with a consistent `/writing` namespace.

## Product Decisions (Locked)

- **Execution model:** simulated shell only.
- **Mode model:** full-page mode switch (not overlay, not separate standalone app shell).
- **Hotkey:** `Cmd+Shift+T` / `Ctrl+Shift+T` toggles terminal mode.
- **Command depth:** medium playful shell.
- **Navigation mental model:** route-backed (`~` lists real top-level sections).
- **Post reading:** `cat` renders full post content in terminal.
- **Large output navigation:** arrow keys and vim-like `h/j/k/l` navigation supported.
- **Route consistency update:** move post routes to `/writing/:slug`; redirect old `/blog` paths.
- **Naming cleanup:** remove public-facing `/journal` references.

## Scope

### In Scope

- Terminal mode UI and state machine.
- Command parser and command handlers.
- Keyboard-first interaction model.
- Route-backed virtual filesystem representation.
- Full post rendering in terminal output (`cat`).
- New playful docs command (`man`) and easter-egg command set.
- Route migration:
  - `/blog` -> `/writing` redirect.
  - `/blog/:slug` -> `/writing/:slug` redirect.
  - canonical links updated to `/writing/:slug`.
- Copy/key cleanup from `journal` to neutral naming.

### Out of Scope

- Real shell command execution.
- Authenticated/private filesystem emulation.
- Multi-user terminal sessions.
- Search indexing redesign (only command-surface integration).

## Information Architecture and Routes

### Canonical Route Model

- Writing index: `/writing`
- Post detail: `/writing/:slug`
- Work index/detail: `/work`, `/work/:slug`
- Series index/detail: `/series`, `/series/:slug`
- Existing utility pages remain (`/about`, `/contact`, `/colophon`, etc.)

### Redirect Strategy

- Add permanent redirects:
  - `/blog` -> `/writing`
  - `/blog/:slug` -> `/writing/:slug`
- Preserve query params and hash on redirect.
- Keep redirects indefinitely for backlinks and SEO continuity.

### Terminal Filesystem Mapping

Terminal mode presents a route-backed tree:

- `~`
  - `writing/`
  - `work/`
  - `series/`
  - `about`
  - `contact`
  - `colophon`
  - optional hidden entries (only shown via easter-egg discovery)

When in `~/writing`, `ls` returns published post slugs.  
When in `~/writing/<slug>`, `cat` prints full post content.

## Terminal Mode Architecture

## 1) State Model

Single client-side state object:

- `isTerminalMode: boolean`
- `cwd: string` (e.g. `~`, `~/writing`, `~/writing/post-slug`)
- `history: string[]`
- `historyIndex: number | null`
- `outputBuffer: TerminalLine[]`
- `activePager: { content: string[]; offset: number; pageSize: number } | null`
- `terminalTheme: 'inherit' | 'green' | 'amber' | 'ice'` (optional)

This state is ephemeral by default, with optional localStorage persistence for:

- last mode (`isTerminalMode`)
- last cwd
- optional command history

## 2) Component Boundaries

- `TerminalModeShell` (full-page mode container)
- `TerminalViewport` (scroll/output region)
- `TerminalPrompt` (input row + caret)
- `TerminalCommandEngine` (parse + dispatch)
- `TerminalFsAdapter` (maps routes/content to virtual directories/files)
- `TerminalPager` (for large `cat` output)

These can live in Astro + client script with focused modules to avoid one large file.

## 3) Data Sources

- Content collections (`blog`, `work`, `series`) provide listing and detail payloads.
- Route adapters normalize these into virtual directory entries:
  - `type: 'dir' | 'file'`
  - `name`
  - `routeTarget`
  - `metadata` (date, tags, read time, etc.)

## Command Contract

### Core Commands

- `help` - list commands and hints.
- `ls [path]` - list entries in current/target virtual directory.
- `cd <path>` - move cwd through virtual tree.
- `pwd` - print current virtual path.
- `cat <target>` - render full textual content for a file-like target.
- `open [target]` - navigate browser route from current context.
- `clear` - clear terminal output.
- `exit` - leave terminal mode.

### Playful and Utility Commands

- `man <topic>` - custom playful manual pages.
  - examples: `man ls`, `man cat`, `man easter-eggs`, `man rasheed`
- `whoami` - persona text.
- `theme [name]` - terminal palette swap (optional).
- `hint` - progressive hint system for easter eggs.

### Optional Aliases (medium shell richness)

- `ll` -> `ls`
- `..` shorthand handled in `cd`
- `?` -> `help`

## `cat` Rendering Rules

### Standard Behavior

- If target resolves to a post file context, print:
  - title line
  - metadata block (date/tags/length)
  - full body rendered to text-friendly terminal formatting
- Inline links shown as readable text + route.

### Long Output Pager (Required)

When output exceeds viewport page size:

- Terminal enters pager mode.
- Navigation keys:
  - `ArrowDown`, `j`: next line
  - `ArrowUp`, `k`: previous line
  - `ArrowRight`, `l`: next page
  - `ArrowLeft`, `h`: previous page
  - `Space`: next page
  - `b`: previous page
  - `g`: top
  - `G`: bottom
  - `q` or `Esc`: exit pager back to prompt

Prompt is visually suspended while pager is active to avoid keybinding ambiguity.

## Keyboard-Only Interaction Model

### Global

- `Cmd/Ctrl + Shift + T`: toggle terminal mode.
- On entry, focus lands directly on prompt input.

### Prompt and Editing

- `Enter`: execute command.
- `ArrowUp`/`ArrowDown`: command history traversal.
- `Tab`: command/path suggestion cycle (basic completion).
- `Ctrl+L`: clear output (alias to `clear`).
- `Ctrl+C`: cancel current input line (does not exit mode).

### Accessibility

- Keep logical focus ring for keyboard users.
- Announce mode changes (`Terminal mode on/off`) via ARIA live region.
- Ensure pager state and command errors are screen-reader readable.

## Easter Egg Design

### Discovery Model

Easter eggs should be discoverable via:

- `man easter-eggs`
- subtle output hints (`try: trace`, `try: coffee`, etc.)
- hidden routes/commands not listed in default `help`.

### Guardrails

- Easter eggs never block core navigation.
- Unknown command messages remain friendly and hintful.
- Keep hidden commands thematic to site voice and personal brand.

## Error Handling

- Unknown command:
  - `command not found: <cmd>`
  - suggest `help` and closest matches.
- Invalid path:
  - `cd: no such file or directory: <path>`
- Non-readable target:
  - `cat: cannot read '<target>'`
- Pager safeguards:
  - ignore unsupported keys silently.
  - never trap user without `q`/`Esc`.

## Migration and Compatibility Plan

## 1) Route Migration

- Move post route handler from `/blog/[...slug]` to `/writing/[...slug]`.
- Update all internal links currently pointing to `/blog/${id}/`.
- Keep redirects from legacy `/blog` paths.

## 2) Terminal Chrome Copy Cleanup

- Replace display copy `~/journal...` with `~` + mapped route path.
- Rename internal storage keys from `journal:*` to `site:*` or `terminal:*`.

## 3) SEO and Feeds

- Update canonical URLs to `/writing/:slug`.
- Ensure RSS/feed links output canonical writing URLs.
- Keep redirect chain single-hop (`/blog/:slug` -> `/writing/:slug`).

## Testing Strategy

## Functional

- Enter/exit mode via button and hotkey.
- `ls`, `cd`, `pwd`, `cat`, `open`, `man`, `help` happy paths.
- Route-backed listings match actual published content.
- Redirects resolve correctly from `/blog` legacy paths.

## Keyboard

- Full journey with no mouse:
  - enter mode
  - navigate directories
  - read long post with pager
  - open route
  - exit mode
- Validate both arrows and `hjkl`.

## Accessibility

- Screen reader announcements for mode and errors.
- Focus remains trapped appropriately in mode and restored on exit.

## Regression

- Existing `/writing` page behavior preserved outside terminal mode.
- Search shortcuts and other current keyboard handlers do not conflict.

## Risks and Mitigations

- **Keybinding conflicts** with existing shortcuts  
  Mitigation: gate terminal key handlers by `isTerminalMode` and pager state.

- **Large content rendering performance** in `cat`  
  Mitigation: pre-split lines, virtualized pager window if needed.

- **URL migration regressions**  
  Mitigation: comprehensive link audit + redirect tests + feed/canonical checks.

## Implementation Notes for Planning Phase

- Build command engine as pure functions first (parse -> action), then wire UI.
- Keep filesystem adapter declarative to simplify future route additions.
- Add redirect and canonical updates in same milestone as route move to avoid mixed URLs.
- Deliver terminal mode behind a feature flag if rollout safety is desired.
