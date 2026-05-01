# Consulting-First Homepage Redesign

**Date:** 2026-05-01
**Status:** Approved

## Problem

The site serves two purposes: online presence as a software consultant and a technical blog. The current homepage is blog-first — the post list is the primary body, the consulting pitch (availability card) is buried at the bottom. Prospective clients land on what looks like a blog and have to dig to find the hiring signal.

## Goal

Make the homepage a consulting landing page. Clients get a clear pitch, fast. Blog readers navigate to `/writing` from the nav. Neither experience is compromised.

## Approach

**Clean split:** The homepage becomes 100% consulting. The blog stays at `/writing` unchanged. No hybrid layout, no post list on the homepage.

## Homepage Structure

Four sections, in order:

### 1. Hero

**Badge:** `● available for Q3 2026`
_(replaces "distributed systems in public" — blog signal, not consulting signal)_

**Headline (h1):**
> You need to ship. Your team is maxed out.

**Subhead:**
> I'm Rasheed Bustamam — an independent software consultant based in California. I build web and mobile applications for teams that need a senior engineer without the full-time hire.

**CTAs:**
- Primary: `$ start a conversation →` (mailto:admin@bustamam.tech)
- Secondary: `$ see my work →` (/work)

The terminal widget is removed from the hero. It's a fun detail for blog readers, not the right first impression for a client.

### 2. What I Build

Three scannable capability statements. Label + one sentence each.

**Web Applications**
Full-stack web apps from greenfield to production — API design, database modeling, frontend, deployment.

**Mobile Applications**
Native and cross-platform mobile apps. iOS, Android, or React Native depending on what your project actually needs.

**Systems & Infrastructure**
Caching, scaling, observability, third-party integrations. The plumbing that keeps things running when traffic spikes.

### 3. Selected Work

- Section header: `§ selected work`
- 3–4 cards using the existing `WorkCard` component
- "view all work →" link to `/work`
- Cards are chosen via a new `featured: true` flag in the work content frontmatter
- Rasheed marks 3–4 entries as featured; the homepage filters for them

### 4. Availability / Closing CTA

The existing `AuthorBio` availability card, promoted to a proper closing section. Copy stays nearly identical:

```
● accepting new work

Taking on new engagements for Q3 2026.
Let's talk about what you're building.

based in    California
working     remote
contact     admin@bustamam.tech

$ start a conversation →
```

Remove: "about the author" label, GitHub link, RSS link — blog signals, not consulting signals.

## Other Changes

| Location | Change |
|----------|--------|
| `src/consts.ts` `SITE_TITLE` | Change from `'Bustamam Technology Blog'` to `'Rasheed Bustamam — Software Consultant'` |
| `src/consts.ts` `SITE_DESCRIPTION` | Update to consulting-focused description |
| `src/pages/index.astro` | Replace with consulting homepage (hero, what I build, selected work, availability) |
| `src/components/AuthorBio.astro` | Remove from homepage; keep on `/writing` index and blog posts |
| `src/content/work/*.md` | Add `featured: true` to 3–4 entries (Rasheed decides which) |
| `src/content.config.ts` | Add `featured` boolean field to work collection schema |

## What Does Not Change

- `/writing` — blog index, unchanged
- `/work` — full work listing, unchanged
- `/about` — unchanged for now (separate task)
- `/contact` — unchanged for now (separate task)
- `SiteHeader` nav — unchanged (`writing · work · about · contact`)
- All blog post routes — unchanged
- `TerminalWidget` — removed from homepage hero; can stay on `/writing` if desired

## Success Criteria

- A prospective client landing on `/` sees: problem statement → capability confirmation → credibility (work) → CTA. No post list in the way.
- Blog readers who go to `/writing` see the same experience as today.
- The availability signal (`● available for Q3 2026`) is visible above the fold.
