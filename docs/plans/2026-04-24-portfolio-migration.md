# Portfolio → Blog Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all project/work content from `../bustamam-tech` (TanStack Start) into `./blog` (Astro) so the Astro blog becomes the single unified site.

**Architecture:** Add a `work` Astro content collection backed by Markdown files (one per project), build a `/work` index page and `/work/[slug]` detail pages following the existing blog patterns. Decorative animations are replaced with CSS/Tailwind equivalents or dropped. No React islands are needed.

**Tech Stack:** Astro 5.17.1, Tailwind v4, CSS custom properties (no `tailwind.config.*`), Zod content schemas, `.astro` components throughout.

---

## Part 1 — Component Audit

### Category A — Pure content/data: map to `.astro` components

| Portfolio file | What it does | Astro equivalent |
|---|---|---|
| `src/data/consulting-projects.ts` | 10 consulting project objects | `src/content/work/*.md` files (type: consulting) |
| `src/data/employment-projects.ts` | 6 employment project objects | `src/content/work/*.md` files (type: employment) |
| `src/components/consulting-projects-section.tsx` | Renders all consulting cards | `src/components/WorkSection.astro` |
| `src/components/employment-projects-section.tsx` | Renders all employment cards | `src/components/WorkSection.astro` (same, filtered) |
| `src/components/base-project-card.tsx` | Card with logo, title, skills, badges | `src/components/WorkCard.astro` |
| `src/components/consulting-project-card.tsx` | Thin wrapper over BaseProjectCard | Collapse into `WorkCard.astro` via props |
| `src/components/employment-project-card.tsx` | Thin wrapper over BaseProjectCard | Collapse into `WorkCard.astro` via props |
| `src/components/project-card.tsx` | Compact card for homepage featured items | `src/components/WorkCardFeatured.astro` |
| `src/routes/work.tsx` | /work page layout | `src/pages/work/index.astro` |
| `src/components/DefaultCatchBoundary.tsx` | React error boundary | Astro handles natively — **drop** |
| `src/components/NotFound.tsx` | 404 component | `src/pages/404.astro` — **drop** (Astro native) |
| `src/components/theme-provider.tsx` | React Context theme | Blog has `ThemeToggle.astro` — **drop** |
| `src/components/theme-toggle.tsx` | Theme button | Blog has `ThemeToggle.astro` — **drop** |
| `src/components/theme-aware-favicon.tsx` | Favicon swap | Blog handles in `BaseHead.astro` — **drop** |

### Category B — Interactive/animated: Tailwind or drop

| Portfolio component | Animation | Tailwind/CSS replacement | React island? |
|---|---|---|---|
| `animated-background.tsx` | `motion.div` layoutId spring under nav active item | Blog nav uses different pattern (underline/color). **Drop** | No |
| `base-project-card.tsx` entry | `opacity:0, y:10, blur(10px)` → visible stagger | CSS `@keyframes fadeUp` + `animation-delay: calc(var(--i) * 0.08s)` as inline style per card | No |
| `consulting-projects-section.tsx` heading | `motion.h2` fade-in-blur | Tailwind `animate-fade-in` (one-shot, define in global.css) | No |
| `employment-projects-section.tsx` heading | same | same | No |
| `dialog.tsx` | `motion.dialog` scale 0.9→1 + opacity | Native `<dialog>` + CSS `@starting-style { opacity:0; scale:0.95 }` + `transition` | No |
| `project-modal.tsx` | Uses dialog.tsx | Port to native `<dialog>` + vanilla `<script>` in `.astro` | No |
| `rolling-text.tsx` | CSS-only word roll (already no motion) | Astro `<script>` tag + same CSS classes | No |
| `routes/index.tsx` scroll chevron | `animate={{ y:[0,4,0] }}` infinite | Tailwind `animate-bounce` | No |
| `routes/index.tsx` hero stagger | Multiple motion.div entry animations | CSS `@keyframes fadeUp` stagger (same as cards) | No |
| `text-effect.tsx` | Per-char `opacity/blur/y` stagger with AnimatePresence | Split text in Astro render, output `<span style="--i:{i}">` per char, CSS `animation-delay:calc(var(--i)*0.04s)` | No |
| `text-shimmer.tsx` | Infinite `background-position` motion | CSS `@keyframes shimmer` + `background-clip:text` (one utility class in global.css) | No |
| `text-loop.tsx` | AnimatePresence spring cycling text | **Drop** — hero cycling pitch copy ("launch/scale/build") is a consulting pitch, not relevant to blog persona | No |
| `text-shimmer-wave.tsx` | Per-char 3D translateZ wave | **Drop** — excessive decoration, not used in work/portfolio display | No |

**Verdict: Zero React islands needed** for the work migration. All animations are either replaceable with CSS or can be dropped.

### Category C — Functionality with no blog equivalent

| Portfolio route/feature | Status | Decision |
|---|---|---|
| `/services` (10 service cards) | Not in blog nav, separate pitch page | **Can wait** — build as `src/pages/services.astro` later if desired |
| Contact section (homepage CTA) | Blog's `AuthorBio.astro` already covers availability/contact | **Blog already has this** — skip |
| Dark logo handling for images | `darkLogo: boolean` inverts logo in dark mode | Handle with CSS `filter: invert(1)` on `[data-theme="dark"] .logo-dark` |

---

## Part 2 — Motion-Primitives Replacement Reference

The portfolio uses `motion` v12 (lightweight Framer Motion fork), not `motion-primitives`. All usages can be replaced.

### 1. Entry fade-up stagger (most common — 8 components)

**Current:**
```tsx
// motion import
const ENTRY_VARIANTS = {
  hidden: { opacity: 0, y: 10, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};
<motion.div initial="hidden" animate="visible"
  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}>
```

**Replacement** (add to `src/styles/global.css`):
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
In `.astro` template:
```astro
{entries.map((entry, i) => (
  <div class="animate-fade-up" style={`--delay:${300 + i * 80}`}>
    ...
  </div>
))}
```

### 2. Scroll-indicator bounce (`routes/index.tsx`)

**Current:**
```tsx
<motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
  <ChevronDown />
</motion.div>
```
**Replacement:** `<span class="inline-block animate-bounce">↓</span>` — Tailwind built-in.

### 3. Dialog open/close animation (`dialog.tsx`)

**Current:** `motion.dialog` with `scale:0.9→1, opacity:0→1`.

**Replacement** (global.css):
```css
dialog[open] {
  animation: dialogIn 0.18s ease-out both;
}
@keyframes dialogIn {
  from { opacity: 0; scale: 0.93; }
  to   { opacity: 1; scale: 1; }
}
@starting-style {
  dialog[open] { opacity: 0; scale: 0.93; }
}
```
`@starting-style` gives the close transition in Chromium 117+ / Firefox 129+. Fallback is instant close — acceptable.

### 4. Text shimmer (`text-shimmer.tsx`)

**Current:** Infinite `motion` animation on `background-position`.

**Replacement** (global.css):
```css
@keyframes shimmer {
  from { background-position: 0 0; }
  to   { background-position: -200% 0; }
}
.text-shimmer {
  background: linear-gradient(
    90deg, var(--ink) 40%, var(--accent) 50%, var(--ink) 60%
  ) 200% 0 / 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 2.5s linear infinite;
}
```

### 5. Per-character text reveal (`text-effect.tsx`)

**Current:** AnimatePresence + per-span motion with stagger.

**Replacement** (pure Astro, no JS):
```astro
---
const chars = text.split('');
---
<span class="inline-flex flex-wrap">
  {chars.map((c, i) => (
    <span class="animate-fade-up"
          style={`--delay:${i * 40}`}
          aria-hidden={c === ' ' ? 'true' : undefined}>
      {c === ' ' ? ' ' : c}
    </span>
  ))}
</span>
```
Uses the same `animate-fade-up` keyframe from §1.

### 6. Components to simply drop (no replacement needed)

- `TextLoop` — cycling hero words. Blog's hero can use static text.
- `TextShimmerWave` — 3D wave effect. Decorative, not used in work content.
- `AnimatedBackground` — nav hover background. Blog nav has a cleaner treatment already.

---

## Part 3 — Data Layer Mapping

### Current portfolio data shape

**`src/data/consulting-projects.ts`** — 10 items:
```typescript
interface ConsultingProject {
  company: string;
  projectName?: string;
  role: string;
  period: string;           // e.g. "2025"
  description: string;
  skills: string[];
  image?: string;           // path like "/images/projects/logos/nuema-logo.svg"
  badges?: ('acquired' | 'zeroToOne')[];
  companyMission?: string;
  darkLogo?: boolean;
}
```

**`src/data/employment-projects.ts`** — 6 items:
```typescript
interface EmploymentProject {
  company: string;
  role: string;
  period: string;           // e.g. "Aug 2023 - Present · 2 yrs 4 mos"
  location: string;
  description: string;
  companyMission?: string;
  skills?: string[];
  additionalRoles?: { role: string; period: string; description: string; }[];
  image?: string;
  darkLogo?: boolean;
  badges?: ('acquired' | 'zeroToOne')[];
}
```

### Proposed Zod schema for `work` content collection

Add to `src/content.config.ts`:

```typescript
const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      // Core identity
      company:     z.string(),
      projectName: z.string().optional(),
      role:        z.string(),
      type:        z.enum(['consulting', 'employment']),

      // Dates — store ISO strings, coerce to Date for sorting
      startDate: z.coerce.date(),
      endDate:   z.coerce.date().optional(), // omit = present
      period:    z.string(), // human-readable: "Aug 2023 – Present"

      // Employment-only
      location: z.string().optional(),

      // Description lives in the markdown body.
      // companyMission goes here so it can render separately from body:
      companyMission: z.string().optional(),

      // Skills
      skills: z.array(z.string()).default([]),

      // Branding
      logo:     image().optional(),
      darkLogo: z.boolean().default(false),

      // Badges
      badges: z.array(z.enum(['acquired', 'zeroToOne'])).default([]),

      // Multi-role (employment only)
      additionalRoles: z
        .array(z.object({
          role:        z.string(),
          period:      z.string(),
          description: z.string(),
        }))
        .optional(),

      // Display controls
      order:    z.number().optional(),   // manual sort override
      featured: z.boolean().default(false),
      draft:    z.boolean().default(false),
    }),
});
```

### Frontmatter shape per project file

**Consulting example** (`src/content/work/nuema.md`):
```markdown
---
company: Nuema
role: Software Engineer
type: consulting
startDate: 2025-01-01
period: "2025"
skills: [Expo, Prisma, tRPC, AWS, Serverless, React Native]
logo: ../../assets/work/logos/nuema-logo.svg
darkLogo: true
badges: []
featured: false
order: 1
---

Built the mobile platform from zero...
(description goes here as markdown body)
```

**Employment example** (`src/content/work/embedded-insurance.md`):
```markdown
---
company: Embedded Insurance, Inc.
role: Senior Software Engineer
type: employment
startDate: 2023-08-01
period: "Aug 2023 – Present"
location: Remote
companyMission: "Embed insurance into any product or service."
skills: [Software Design, Retool, Remix, React.js, Temporal.io]
logo: ../../assets/work/logos/ei-logo.svg
featured: true
order: 1
additionalRoles:
  - role: Tech Lead
    period: "Jan 2024 – Present"
    description: "Led a team of 4..."
---

Led backend architecture for...
```

**Logo migration:** Copy SVGs from `bustamam-tech/public/images/projects/logos/` to `blog/src/assets/work/logos/`. Using `src/assets/` lets Astro optimize them at build time. Reference with `image()` in the schema.

---

## Part 4 — What Needs to Be Built

The SiteHeader already links `/work` (lines 37 and 71 of `src/components/SiteHeader.astro`) — no nav changes required.

### Files to create

| File | What it is |
|---|---|
| `src/content.config.ts` | Add `work` collection + export |
| `src/content/work/*.md` | 16 files (10 consulting + 6 employment) |
| `src/assets/work/logos/` | Copy SVG logos here |
| `src/components/WorkCard.astro` | Card component (replaces BaseProjectCard) |
| `src/components/WorkSection.astro` | Section wrapper with type heading (replaces ConsultingProjectsSection / EmploymentProjectsSection) |
| `src/pages/work/index.astro` | /work index page |
| `src/pages/work/[...slug].astro` | /work/[slug] detail page |
| `src/styles/global.css` additions | `@keyframes fadeUp`, `.animate-fade-up`, `.text-shimmer`, dialog animation |

### Pages — pattern reference

**`src/pages/work/index.astro`** follows the pattern of `src/pages/series/index.astro`:
- `getCollection('work', ({ data }) => !data.draft)`
- Sort by `data.startDate` descending (or `data.order` if set)
- Group by `data.type` (employment first, then consulting — or vice versa)
- Render two `WorkSection` blocks

**`src/pages/work/[...slug].astro`** follows `src/pages/blog/[...slug].astro`:
- `getStaticPaths()` from `getCollection('work')`
- Render `<Content />` for the markdown body
- Sidebar for skills, badges, period, location
- Link back to `/work`

### `WorkCard.astro` props interface

```typescript
interface Props {
  entry: CollectionEntry<'work'>;
  animated?: boolean; // enables animate-fade-up + --delay
  index?: number;     // stagger index
}
```

The card renders: logo (with `darkLogo` CSS handling), company, role, period, skills pills, badges. No modal — link to detail page instead (cleaner, more indexable).

---

## Part 5 — Prioritized Migration Checklist

### Phase 1 — Data (no UI, highest value, zero risk)

- [ ] **Task 1:** Add `work` collection to `src/content.config.ts`
- [ ] **Task 2:** Create `src/assets/work/logos/` and copy the 16 SVG logos from `bustamam-tech/public/images/projects/logos/`
- [ ] **Task 3:** Create all 10 consulting project `.md` files in `src/content/work/`
- [ ] **Task 4:** Create all 6 employment project `.md` files in `src/content/work/`
- [ ] **Task 5:** Run `bun run build` to verify Zod validation passes on all 16 entries

### Phase 2 — /work index page

- [ ] **Task 6:** Add `@keyframes fadeUp` + `.animate-fade-up` to `src/styles/global.css`
- [ ] **Task 7:** Create `src/components/WorkCard.astro`
- [ ] **Task 8:** Create `src/components/WorkSection.astro`
- [ ] **Task 9:** Create `src/pages/work/index.astro`
- [ ] **Task 10:** Run dev server, verify `/work` renders all 16 entries with correct grouping and stagger animation
- [ ] **Task 11:** Commit — `feat: add /work index page with content collection`

### Phase 3 — /work/[slug] detail pages

- [ ] **Task 12:** Create `src/pages/work/[...slug].astro`
- [ ] **Task 13:** Link each `WorkCard` to its detail page
- [ ] **Task 14:** Run dev server, click through 2–3 detail pages. Verify markdown body, skills, logo render correctly
- [ ] **Task 15:** Commit — `feat: add /work/[slug] detail pages`

### Phase 4 — CSS animations (polish pass, can be skipped initially)

- [ ] **Task 16:** Add dialog `@starting-style` animation to `global.css`
- [ ] **Task 17:** Add `.text-shimmer` utility to `global.css` (if hero needs it)
- [ ] **Task 18:** Commit — `style: add Tailwind-native entry and shimmer animations`

### Phase 5 — Can wait

- `/services` page — not referenced in blog nav; build if/when desired
- `/contact` page — `AuthorBio.astro` already handles availability/contact CTA
- Homepage featured-work callout — add a `featured: true` filter on `/` once work section exists

### Drop entirely (no action needed)

| Item | Reason |
|---|---|
| `text-loop.tsx` | Hero pitch copy not relevant to journal persona |
| `text-shimmer-wave.tsx` | Excessive 3D decoration |
| `animated-background.tsx` | Blog nav doesn't use this pattern |
| `theme-provider.tsx` / `theme-toggle.tsx` | Blog already has `ThemeToggle.astro` |
| `DefaultCatchBoundary.tsx` / `NotFound.tsx` | Astro native |
| TanStack Router / React Query infra | Framework-specific plumbing |
| Test routes (`_pathlessLayout`, `route-a/b`, `/redirect`, `/deferred`) | Demo scaffolding |
| `/posts` and `/users` routes | Demo scaffolding |

---

## Execution Notes

- All logos should move to `src/assets/` (not `public/`) so Astro can optimize them. Update `astro.config.mjs` if needed to ensure `sharp` handles SVGs (it does by default in Astro 5).
- The `period` field is a human-readable string for display; `startDate` / `endDate` are Date objects for sorting. Both are needed.
- `darkLogo: true` → add CSS rule: `[data-theme="dark"] .work-logo.is-dark { filter: invert(1) brightness(2); }` in `global.css`.
- No React island is needed anywhere in this migration. All interactivity (theme, nav drawer) is already handled by the blog's vanilla JS `<script>` blocks in `.astro` components.
