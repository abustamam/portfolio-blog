# UI Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three improvements: (1) unify the page shell and kill all entrance animations across the work pages, (2) replace placeholder copy on the homepage badge and chrome bar, (3) overhaul traffic light buttons so all three dots are interactive with correct macOS-style behavior and hover glyphs.

**Architecture:** Pure HTML/CSS/JS changes in Astro components. No new dependencies. The traffic lights use a CSS group-hover pattern to show `× ─ +` glyphs inside the dots. Each terminal context (TerminalChrome, TerminalWidget, TerminalModeShell) gets the correct action mapping per the design doc.

**Tech Stack:** Astro 5, Tailwind CSS v4, vanilla JS

---

### Task 1: Unify work/index.astro container

**Files:**
- Modify: `src/pages/work/index.astro`

**Step 1: Swap the container class**

Find this opening `<main>` tag:
```html
<main class="max-w-4xl mx-auto px-5 pt-8 pb-12 sm:px-8 sm:pt-12 sm:pb-16">
```

Replace with:
```html
<main class="page-shell pt-12 pb-20">
```

**Step 2: Remove animation from the header**

Find:
```html
<header class="animate-fade-up mb-12" style="--delay:0">
```

Replace with:
```html
<header class="mb-12">
```

**Step 3: Remove animated prop from WorkSection calls**

Find both `<WorkSection ... animated={true} ...>` calls and remove the `animated={true}` prop from each. The prop still exists in WorkSection (will be cleaned up in Task 2), so this is safe.

**Step 4: Build and verify**

```bash
cd /media/rasheed-bustamam/Extra/coding/blog && bun run build 2>&1 | tail -10
```

Expected: clean build.

**Step 5: Visual check**

```bash
bun run dev
```

Navigate to `/work`. Layout should now match the page-shell width used on about/contact. No animation on load.

**Step 6: Commit**

```bash
git add src/pages/work/index.astro
git commit -m "feat(layout): unify work index to page-shell, remove entrance animation"
```

---

### Task 2: Remove animate-fade-up from WorkSection and WorkCard

**Files:**
- Modify: `src/components/WorkSection.astro`
- Modify: `src/components/WorkCard.astro`

**Step 1: Update WorkSection.astro**

Remove the `animated` prop from the interface and the `const { title, entries, animated = true, indexOffset = 0 }` destructure — change to:

```ts
const { title, entries, indexOffset = 0 } = Astro.props;
```

Update the interface:
```ts
interface Props {
  title: string;
  entries: CollectionEntry<'work'>[];
  indexOffset?: number;
}
```

Remove `animate-fade-up` and `style="--delay:100"` from the `<h2>` element:
```html
<!-- before -->
<h2 class="animate-fade-up font-mono text-11 ..." style="--delay:100">

<!-- after -->
<h2 class="font-mono text-11 font-normal text-faint tracking-caps uppercase m-0 mb-5 pb-2 border-b border-line">
```

Update the `<WorkCard>` call to remove the `animated` prop:
```astro
<WorkCard entry={entry} index={indexOffset + i} />
```

**Step 2: Update WorkCard.astro**

Remove the `animated` prop from the interface and destructure:
```ts
const { entry, index = 0 } = Astro.props;
```

Interface:
```ts
interface Props {
  entry: CollectionEntry<'work'>;
  index?: number;
}
```

Remove the `delay` variable (was only used for animation).

On the `<a>` element, remove the `animate-fade-up` from `class:list` and the `style` prop:
```astro
<!-- before -->
<a
  href={`/work/${entry.id}/`}
  class:list={[
    'block no-underline ...',
    animated && 'animate-fade-up',
  ]}
  style={animated ? `--delay:${delay}` : undefined}
>

<!-- after -->
<a
  href={`/work/${entry.id}/`}
  class="block no-underline text-inherit border border-line rounded p-5 px-6 bg-surface transition-colors duration-150 hover:border-accent hover:shadow-sm"
>
```

**Step 3: Build**

```bash
bun run build 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add src/components/WorkSection.astro src/components/WorkCard.astro
git commit -m "feat(layout): remove animated prop and entrance animations from WorkSection/WorkCard"
```

---

### Task 3: Remove animate-fade-up from work/[...slug].astro and unify container

**Files:**
- Modify: `src/pages/work/[...slug].astro`

**Step 1: Swap the outer container**

Find:
```html
<main class="max-w-4xl mx-auto px-8 pt-10 pb-16 max-[700px]:px-5 max-[700px]:pt-6 max-[700px]:pb-12">
```

Replace with:
```html
<main class="page-shell pt-10 pb-16">
```

**Step 2: Remove all animate-fade-up and style="--delay:..." occurrences**

There are 5 occurrences in this file. Remove `animate-fade-up` class and `style="--delay:N"` from each:

1. `<header class="flex items-center gap-4 mb-6 animate-fade-up" style="--delay:0">` → `<header class="flex items-center gap-4 mb-6">`
2. `<blockquote class="... animate-fade-up" style="--delay:80">` → remove those two
3. `<div class="font-serif text-base leading-[1.7] text-ink animate-fade-up ..." style="--delay:160">` → remove those two
4. `<section class="mt-8 border-t border-line pt-6 animate-fade-up" style="--delay:240">` → remove those two
5. `<aside class="sticky top-8 animate-fade-up max-[700px]:static ..." style="--delay:80">` → remove those two

**Step 3: Build and visual check**

```bash
bun run build 2>&1 | tail -5
bun run dev
```

Navigate to a work detail page (e.g., `/work/breezy`). Should load without any fade-in animation. Layout width should match the rest of the site.

**Step 4: Commit**

```bash
git add "src/pages/work/[...slug].astro"
git commit -m "feat(layout): unify work slug to page-shell, remove all entrance animations"
```

---

### Task 4: Remove fadeUp from global.css

**Files:**
- Modify: `src/styles/global.css`

**Step 1: Verify no remaining usages**

```bash
grep -rn "animate-fade-up\|fadeUp" src/ --include="*.astro" --include="*.ts" --include="*.css"
```

Expected: only the definition in `global.css`. If any Astro files still appear, fix them first.

**Step 2: Remove the keyframe and class**

Find and delete this block in `global.css`:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
.animate-fade-up {
  animation: fadeUp 0.5s ease-out both;
  animation-delay: calc(var(--delay, 0) * 1ms);
}
```

**Step 3: Build**

```bash
bun run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "chore: remove unused fadeUp keyframe and animate-fade-up class"
```

---

### Task 5: Update placeholder copy

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/TerminalChrome.astro`

**Step 1: Update homepage badge (index.astro)**

Find:
```html
journal · vol 04 · spring 2026
```

Replace the text node with:
```html
distributed systems in public
```

(Keep the surrounding `<div>` element with its classes unchanged.)

**Step 2: Update availability text (TerminalChrome.astro)**

Find:
```html
<span class="hidden sm:inline ...">available · Q3</span>
```

Replace the text:
```html
<span class="hidden sm:inline text-ink overflow-hidden text-ellipsis whitespace-nowrap max-w-28vw sm:max-w-none">available for work</span>
```

**Step 3: Build and visual check**

```bash
bun run build 2>&1 | tail -5
bun run dev
```

Check homepage: badge should read "distributed systems in public". Chrome bar should read "available for work".

**Step 4: Commit**

```bash
git add src/pages/index.astro src/components/TerminalChrome.astro
git commit -m "fix(copy): replace placeholder badge and availability text"
```

---

### Task 6: Traffic lights — TerminalChrome

**Files:**
- Modify: `src/components/TerminalChrome.astro`

**Behavior:** Red=disabled(×), Yellow=disabled(─), Green=open terminal full-screen(+)

**Step 1: Replace the traffic lights markup**

Find the traffic lights `<div>`:
```html
<div class="flex items-center gap-1.5 px-3.5 border-r border-line h-full shrink-0">
  <span class="w-1.75 h-1.75 rounded-full bg-danger"></span>
  <span class="w-1.75 h-1.75 rounded-full bg-faint"></span>
  <span class="w-1.75 h-1.75 rounded-full bg-accent"></span>
</div>
```

Replace with:
```html
<div class="group flex items-center gap-1.5 px-3.5 border-r border-line h-full shrink-0">
  <button
    type="button"
    disabled
    aria-label="Close (unavailable)"
    class="traffic-light w-2 h-2 rounded-full bg-faint border border-black/10 flex items-center justify-center opacity-60 cursor-not-allowed"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none" style="font-size:6px; opacity:0">×</span>
  </button>
  <button
    type="button"
    disabled
    aria-label="Minimize (unavailable)"
    class="traffic-light w-2 h-2 rounded-full bg-faint border border-black/10 flex items-center justify-center opacity-60 cursor-not-allowed"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none" style="font-size:6px; opacity:0">─</span>
  </button>
  <button
    id="chrome-traffic-green"
    type="button"
    aria-label="Open terminal"
    class="traffic-light w-2 h-2 rounded-full bg-accent border border-black/10 flex items-center justify-center cursor-pointer"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none" style="font-size:6px; opacity:0">+</span>
  </button>
</div>
```

**Step 2: Add hover CSS**

Add to the `<style>` block in TerminalChrome.astro (or add one):
```html
<style>
  .group:hover .traffic-light-glyph { opacity: 1 !important; }
</style>
```

**Step 3: Add green button script**

Add a `<script>` block to TerminalChrome.astro:
```html
<script>
  const greenBtn = document.getElementById('chrome-traffic-green');
  greenBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('terminal:open'));
  });
</script>
```

**Step 4: Build and visual check**

```bash
bun run dev
```

- Hover over the traffic lights in the chrome bar: glyphs should appear
- Click green dot: terminal should open (same as clicking "Terminal" button)
- Red and yellow should be visually muted and not clickable

**Step 5: Commit**

```bash
git add src/components/TerminalChrome.astro
git commit -m "feat(traffic-lights): wire TerminalChrome dots — green opens terminal, others disabled"
```

---

### Task 7: Traffic lights — TerminalWidget

**Files:**
- Modify: `src/components/TerminalWidget.astro`

**Behavior:** Red=disabled(×), Yellow=disabled(─), Green=expand to full-screen(+)

**Step 1: Replace the traffic lights markup**

Find the chrome bar dots section. Currently it looks like:
```html
<div class="flex items-center gap-1.5">
  <button id="widget-expand-btn" type="button" ...>
    <span id="widget-dot-1" class="w-2 h-2 rounded-full border border-line pointer-events-none bg-faint"></span>
  </button>
  <span id="widget-dot-2" class="w-2 h-2 rounded-full border border-line bg-faint"></span>
  <span id="widget-dot-3" class="w-2 h-2 rounded-full border border-line bg-faint"></span>
</div>
```

Replace with:
```html
<div class="group flex items-center gap-1.5">
  <button
    id="widget-dot-1-btn"
    type="button"
    disabled
    aria-label="Close (unavailable)"
    class="w-2 h-2 rounded-full border border-line bg-faint flex items-center justify-center opacity-60 cursor-not-allowed"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none pointer-events-none" style="font-size:6px; opacity:0">×</span>
  </button>
  <button
    id="widget-dot-2-btn"
    type="button"
    disabled
    aria-label="Minimize (unavailable)"
    class="w-2 h-2 rounded-full border border-line bg-faint flex items-center justify-center opacity-60 cursor-not-allowed"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none pointer-events-none" style="font-size:6px; opacity:0">─</span>
  </button>
  <button
    id="widget-expand-btn"
    type="button"
    aria-label="Open terminal in full-screen mode"
    class="w-2 h-2 rounded-full border border-line bg-faint flex items-center justify-center"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none pointer-events-none" style="font-size:6px; opacity:0">+</span>
  </button>
</div>
```

Note: `widget-expand-btn` is now on dot 3 (green). The `id` references in the script below must update.

**Step 2: Update the dot references in the JS**

The focus/blur handler (`setFocused`) references `widget-dot-1`, `widget-dot-2`, `widget-dot-3`. Update them to the new IDs:

```ts
const dot1 = document.getElementById('widget-dot-1-btn') as HTMLElement | null;
const dot2 = document.getElementById('widget-dot-2-btn') as HTMLElement | null;
const dot3 = document.getElementById('widget-expand-btn') as HTMLElement | null;
```

The `setFocused` function currently sets class strings on these. Update so the color classes are applied but size/layout classes are preserved. Replace the className assignments in `setFocused` with just toggling the background color:

```ts
function setFocused(on: boolean) {
  widget.style.transition = 'border-color 0.2s ease';
  widget.style.borderColor = on ? 'var(--color-accent)' : '';
  if (dot1) {
    dot1.style.backgroundColor = on ? 'var(--color-danger)' : '';
  }
  if (dot2) {
    dot2.style.backgroundColor = on ? 'var(--color-mute)' : '';
  }
  if (dot3) {
    dot3.style.backgroundColor = on ? 'var(--color-accent)' : '';
  }
}
```

When not focused, the dots revert to `bg-faint` (from the class). When focused, the inline style overrides it. On blur, clear the inline style:

```ts
function setFocused(on: boolean) {
  widget.style.transition = 'border-color 0.2s ease';
  widget.style.borderColor = on ? 'var(--color-accent)' : '';
  const colors = on
    ? ['var(--color-danger)', 'var(--color-mute)', 'var(--color-accent)']
    : ['', '', ''];
  [dot1, dot2, dot3].forEach((d, i) => {
    if (d) d.style.backgroundColor = colors[i];
  });
}
```

**Step 3: Add hover CSS**

Add a `<style>` block (or add to an existing one) in TerminalWidget.astro:

```html
<style>
  #terminal-widget .group:hover .traffic-light-glyph { opacity: 1 !important; }
</style>
```

**Step 4: Build and visual check**

```bash
bun run dev
```

- Hover over widget traffic lights: glyphs appear
- Green dot (third) expands to full-screen terminal
- Red and yellow are muted/disabled
- When widget is focused (click inside), red goes danger-color, green goes accent-color

**Step 5: Commit**

```bash
git add src/components/TerminalWidget.astro
git commit -m "feat(traffic-lights): overhaul TerminalWidget dots — green expands, others disabled"
```

---

### Task 8: Traffic lights — TerminalModeShell

**Files:**
- Modify: `src/components/terminal/TerminalModeShell.astro`

**Behavior:** Red=close terminal(×), Yellow=minimize to widget(─), Green=disabled(+)

**Step 1: Replace the traffic lights markup**

Find the current chrome dots:
```html
<div class="flex items-center gap-1.5">
  <button id="terminal-minimize-btn" type="button" ...>
    <span id="terminal-dot-1" class="w-2 h-2 rounded-full border border-line pointer-events-none bg-faint"></span>
  </button>
  <span id="terminal-dot-2" ...></span>
  <span id="terminal-dot-3" ...></span>
</div>
```

Replace with:
```html
<div class="group flex items-center gap-1.5">
  <button
    id="terminal-minimize-btn"
    type="button"
    aria-label="Close terminal"
    class="w-2 h-2 rounded-full border border-line bg-faint flex items-center justify-center"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none pointer-events-none" style="font-size:6px; opacity:0">×</span>
  </button>
  <button
    id="terminal-to-widget-btn"
    type="button"
    aria-label="Minimize to widget"
    class="w-2 h-2 rounded-full border border-line bg-faint flex items-center justify-center"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none pointer-events-none" style="font-size:6px; opacity:0">─</span>
  </button>
  <button
    id="terminal-dot-3"
    type="button"
    disabled
    aria-label="Fullscreen (already maximized)"
    class="w-2 h-2 rounded-full border border-line bg-faint flex items-center justify-center opacity-60 cursor-not-allowed"
  >
    <span class="traffic-light-glyph font-mono leading-none select-none pointer-events-none" style="font-size:6px; opacity:0">+</span>
  </button>
</div>
```

**Step 2: Wire the yellow "minimize to widget" button**

In the TerminalModeShell script, add a handler for `terminal-to-widget-btn`. This button should:
1. Fire `terminal:closed` (which closes the shell)
2. Scroll the `#terminal-widget` into view if on the homepage

Find where `terminal-minimize-btn` click is handled. After its handler, add:

```ts
const toWidgetBtn = document.getElementById('terminal-to-widget-btn');
toWidgetBtn?.addEventListener('click', () => {
  closeTerminal(); // call the same close function used by the minimize btn
  // Scroll widget into view after a tick
  setTimeout(() => {
    document.getElementById('terminal-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
});
```

Where `closeTerminal()` is whatever the existing minimize button calls (look for `window.dispatchEvent(new CustomEvent('terminal:closed'))` or similar — wrap it in a function if not already).

**Step 3: Update dot color logic**

Search for the existing `terminal-dot-1`, `terminal-dot-2`, `terminal-dot-3` references in the JS. The full-screen terminal may already update dot colors on focus. Update these references to match the new IDs where needed. The minimize button is still `terminal-minimize-btn`; dot-2 is now `terminal-to-widget-btn`; dot-3 is `terminal-dot-3`.

**Step 4: Add hover CSS**

Add a `<style is:global>` block:

```html
<style is:global>
  #terminal-mode-shell .group:hover .traffic-light-glyph { opacity: 1 !important; }
</style>
```

**Step 5: Build and verify**

```bash
bun run build 2>&1 | tail -5
bun run dev
```

- Open full-screen terminal (Terminal button or green dot in chrome)
- Hover over dots: × ─ + glyphs appear
- Click red (×): terminal closes, returns to site
- Click yellow (─): terminal closes, page scrolls to the terminal widget
- Green (+) is muted, not clickable

**Step 6: Commit**

```bash
git add src/components/terminal/TerminalModeShell.astro
git commit -m "feat(traffic-lights): TerminalModeShell — red closes, yellow minimizes to widget, green disabled"
```

---

### Task 9: Final verification pass

**Step 1: Build**

```bash
bun run build 2>&1 | grep -E "error|warn" | head -20
```

Expected: no errors.

**Step 2: Check all three traffic light contexts**

- `/` → TerminalChrome dots (hover for glyphs, green opens terminal)
- `/` → TerminalWidget dots (hover for glyphs, green expands terminal, dots color on focus)
- Open terminal → TerminalModeShell dots (red closes, yellow minimizes to widget)

**Step 3: Check page shell consistency**

- `/work` → same width as `/about` and `/contact`
- `/work/breezy` (any work detail) → same width, no entrance animation

**Step 4: Check copy**

- Homepage: badge reads "distributed systems in public"
- Chrome bar: reads "available for work"

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(ui-polish): complete — unified shell, copy updates, traffic light overhaul"
```
