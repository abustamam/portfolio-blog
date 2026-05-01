# Consulting-First Homepage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the blog-index homepage with a consulting landing page (hero → what I build → selected work → availability CTA) while leaving `/writing` unchanged.

**Architecture:** The homepage (`src/pages/index.astro`) is rewritten from scratch. A new `AvailabilityCard.astro` component is extracted from `AuthorBio.astro` for reuse as the homepage closing CTA. Featured work entries are selected via the existing `featured: boolean` field already in the work collection schema.

**Tech Stack:** Astro 5, Tailwind CSS (utility classes via `class:`), Astro Content Collections, TypeScript

---

### Task 1: Mark featured work entries

Pick 3–4 consulting entries that best represent your range. Suggested: `breezy.md`, `nuema.md`, `milken-cic.md`, `edvo.md` — most recent consulting work with recognizable clients. Change any subset you prefer.

**Files:**
- Modify: `src/content/work/breezy.md`
- Modify: `src/content/work/nuema.md`
- Modify: `src/content/work/milken-cic.md`
- Modify: `src/content/work/edvo.md`

**Step 1: Set `featured: true` in breezy.md**

Find the line `featured: false` (or add it if missing) and change it to:
```yaml
featured: true
```

**Step 2: Repeat for nuema.md, milken-cic.md, edvo.md**

Same change in each file: `featured: true`

**Step 3: Verify the build picks them up**

```bash
cd /media/rasheed-bustamam/Extra/coding/blog
bun run build 2>&1 | tail -5
```
Expected: no errors about the work collection.

**Step 4: Commit**

```bash
git add src/content/work/breezy.md src/content/work/nuema.md src/content/work/milken-cic.md src/content/work/edvo.md
git commit -m "content: mark featured consulting work entries"
```

---

### Task 2: Update site constants

**Files:**
- Modify: `src/consts.ts`

**Step 1: Replace the constants**

Change:
```ts
export const SITE_TITLE = 'Bustamam Technology Blog';
export const SITE_DESCRIPTION =
	"An applications consultant learning distributed systems. Notes on web, mobile, and building at scale.";
```

To:
```ts
export const SITE_TITLE = 'Rasheed Bustamam — Software Consultant';
export const SITE_DESCRIPTION =
	"Independent software consultant based in California. Web and mobile applications for teams that need a senior engineer without the full-time hire.";
```

**Step 2: Verify no build errors**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean build.

**Step 3: Commit**

```bash
git add src/consts.ts
git commit -m "chore: update site title and description to consulting focus"
```

---

### Task 3: Create AvailabilityCard component

The existing `AuthorBio.astro` has two columns: author bio (left) + availability card (right). The homepage closing CTA needs just the availability card, full-width, without the author bio, GitHub link, or RSS link.

**Files:**
- Create: `src/components/AvailabilityCard.astro`

**Step 1: Create the file**

```astro
---
// AvailabilityCard.astro — standalone closing CTA for the consulting homepage
---

<section class="px-gutter py-14 border-t border-line bg-surface">
  <div class="max-w-lg">
    <div class="flex items-center gap-2.5 mb-4.5">
      <span class="w-1.75 h-1.75 rounded-full bg-accent shadow-[0_0_0_3px_var(--color-accent-bg)]"></span>
      <span class="font-mono text-11 text-accent-ink tracking-loose uppercase bg-accent-bg py-0.75 px-2 rounded-sm">
        accepting new work
      </span>
    </div>
    <p class="font-serif text-2xl text-ink leading-snug tracking-tight m-0 mb-5.5">
      Taking on new engagements for <em class="italic text-accent">Q3 2026</em>.
      Let's talk about what you're building.
    </p>
    <div class="grid grid-cols-2 gap-5 font-mono text-11 text-mute mb-6 max-w-xs">
      <div>
        <div class="text-faint text-10 tracking-loose uppercase mb-1">based in</div>
        <div class="text-ink">California</div>
      </div>
      <div>
        <div class="text-faint text-10 tracking-loose uppercase mb-1">working</div>
        <div class="text-ink">remote</div>
      </div>
      <div>
        <div class="text-faint text-10 tracking-loose uppercase mb-1">contact</div>
        <div class="text-ink">admin@bustamam.tech</div>
      </div>
    </div>
    <a
      href="mailto:admin@bustamam.tech"
      class="inline-block bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white py-2.5 px-4.5 rounded-sm font-mono text-xs tracking-snug no-underline"
    >
      $ start a conversation →
    </a>
  </div>
</section>
```

**Step 2: Verify build**

```bash
bun run build 2>&1 | tail -5
```
Expected: clean build (component not used anywhere yet, so this is just a syntax check).

**Step 3: Commit**

```bash
git add src/components/AvailabilityCard.astro
git commit -m "feat: add AvailabilityCard component for consulting homepage CTA"
```

---

### Task 4: Rewrite the homepage

The entire `src/pages/index.astro` is replaced. The new page has four sections: hero, what I build, selected work, availability CTA.

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Replace the entire file contents**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import WorkCard from '../components/WorkCard.astro';
import AvailabilityCard from '../components/AvailabilityCard.astro';

const featuredWork = (await getCollection('work', ({ data }) => data.featured && !data.draft))
  .sort((a, b) => {
    if (a.data.order !== undefined && b.data.order !== undefined) {
      return a.data.order - b.data.order;
    }
    return b.data.startDate.getTime() - a.data.startDate.getTime();
  });
---

<BaseLayout
  title="Rasheed Bustamam — Software Consultant"
  description="Independent software consultant based in California. I build web and mobile applications for teams that need a senior engineer without the full-time hire."
  chromePath="/"
>

  <!-- Hero -->
  <section class="px-gutter pt-10 pb-10 md:pt-16 md:pb-14 border-b border-line">
    <div class="inline-flex items-center gap-2.5 py-1.25 px-3 bg-accent-bg text-accent-ink rounded-sm font-mono text-11 tracking-loose uppercase mb-8">
      <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
      available for Q3 2026
    </div>
    <h1 class="display-hero font-serif font-medium m-0 text-ink tracking-tight max-w-2xl">
      You need to ship.<br/>
      Your team is <em class="italic text-accent font-medium">maxed out.</em>
    </h1>
    <p class="mt-6.5 max-w-[540px] font-serif text-lg leading-[1.55] text-mute">
      I'm <span class="text-ink">Rasheed Bustamam</span> — an independent software consultant based in California.
      I build web and mobile applications for teams that need a senior engineer without the full-time hire.
    </p>
    <div class="flex gap-3.5 mt-8">
      <a
        href="mailto:admin@bustamam.tech"
        class="bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white py-2.25 px-4 rounded-sm font-mono text-xs tracking-snug no-underline"
      >
        $ start a conversation →
      </a>
      <a
        href="/work"
        class="bg-transparent text-ink border border-line py-2.25 px-4 rounded-sm font-mono text-xs tracking-snug no-underline"
      >
        $ see my work →
      </a>
    </div>
  </section>

  <!-- What I Build -->
  <section class="px-gutter py-12 border-b border-line">
    <div class="font-mono text-10 text-faint tracking-caps uppercase mb-8">§ what i build</div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <div class="font-serif text-lg font-medium text-ink mb-2">Web Applications</div>
        <p class="font-serif text-base text-mute leading-relaxed m-0">
          Full-stack web apps from greenfield to production — API design, database modeling, frontend, deployment.
        </p>
      </div>
      <div>
        <div class="font-serif text-lg font-medium text-ink mb-2">Mobile Applications</div>
        <p class="font-serif text-base text-mute leading-relaxed m-0">
          Native and cross-platform mobile apps. iOS, Android, or React Native depending on what your project actually needs.
        </p>
      </div>
      <div>
        <div class="font-serif text-lg font-medium text-ink mb-2">Systems &amp; Infrastructure</div>
        <p class="font-serif text-base text-mute leading-relaxed m-0">
          Caching, scaling, observability, third-party integrations. The plumbing that keeps things running when traffic spikes.
        </p>
      </div>
    </div>
  </section>

  <!-- Selected Work -->
  {featuredWork.length > 0 && (
    <section class="px-gutter py-12 border-b border-line">
      <div class="flex items-center justify-between mb-6">
        <div class="font-mono text-10 text-faint tracking-caps uppercase">§ selected work</div>
        <a href="/work" class="font-mono text-11 text-mute no-underline">view all work →</a>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {featuredWork.map((entry, i) => (
          <WorkCard entry={entry} index={i} />
        ))}
      </div>
    </section>
  )}

  <!-- Availability CTA -->
  <AvailabilityCard />

</BaseLayout>
```

**Step 2: Verify the dev server shows no errors**

The dev server is already running at `http://localhost:4321`. Check terminal for any Astro build errors after saving.

Expected: no TypeScript or Astro errors.

**Step 3: Verify in browser**

Open `http://localhost:4321` and confirm:
- Badge reads "available for Q3 2026" (not "distributed systems in public")
- Headline reads "You need to ship. Your team is maxed out."
- No post list on the page
- "What I Build" three-column section is visible
- 3–4 work cards appear under "§ selected work"
- Availability CTA section appears at the bottom
- `/writing` at `http://localhost:4321/writing` still shows the post list unchanged

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: replace blog-index homepage with consulting landing page"
```

---

### Task 5: Final build verification

**Step 1: Run the full production build**

```bash
cd /media/rasheed-bustamam/Extra/coding/blog
bun run build 2>&1
```
Expected: clean build, no errors or warnings about missing imports or type mismatches.

**Step 2: Confirm `/writing` is unchanged**

Navigate to `http://localhost:4321/writing` and verify the full post list still renders with the filter bar, search, and `AuthorBio` at the bottom.

**Step 3: Commit if any cleanup was needed**

```bash
git add -p
git commit -m "chore: post-build cleanup"
```
Only needed if step 1 surfaced any fixable warnings.
