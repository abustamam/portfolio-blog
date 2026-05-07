# Blog Post CTA Design

Date: 2026-05-07
Status: Approved (design), pending implementation

## Objective

Add a "hire me" call-to-action section at the end of every blog post so that readers who finish an article have a clear, consistent next step to start a consulting engagement.

## Scope

In scope:

- A CTA section rendered on every blog post page (`BlogPost.astro` layout)
- Placement immediately after the article prose, before the related posts grid
- Copy and styling consistent with the existing homepage `AvailabilityCard`
- Same CTA copy on all posts (no per-post customization for now)
- Email link (`mailto:admin@bustamam.tech`) as the primary action

Out of scope:

- Per-post CTA customization
- Analytics or conversion tracking
- Form-based contact (e.g., Calendly embed)
- Changes to homepage CTA or other page CTAs
- A/B testing different copy

## Proposed Architecture

### 1) Reuse `AvailabilityCard.astro` component

The homepage already has a well-designed, proven CTA component (`AvailabilityCard.astro`). Reuse it inside the blog post layout to maintain visual consistency across the site.

### 2) Placement in `BlogPost.astro`

Insert the CTA component between the closing `</article>` tag and the "↳ related writing" section.

Visual flow per post:

```
[Article prose]
→ [AvailabilityCard CTA]
→ [Related posts grid]
→ [SiteFooter]
```

### 3) Copy

- **Status badge:** `accepting new work` (with green dot)
- **Headline:** *"Building web or mobile apps? I'm taking on new projects for Q3 2026. Let's talk about what you're building."*
- **Contact grid:**
  - based in → California
  - working → remote
  - contact → admin@bustamam.tech
  - elsewhere → github · rss
- **CTA button:** `$ start a conversation →` → `mailto:admin@bustamam.tech`

## Data Flow

1. Reader finishes article prose.
2. `BlogPost.astro` renders `<AvailabilityCard />` immediately after `</article>`.
3. Reader sees the CTA with consistent homepage styling.
4. Clicking the button opens their default mail client with a pre-addressed email.

## Error Handling and Edge Cases

- **No JavaScript required:** The CTA is a static `<a href="mailto:...">` link. It works without JS.
- **Mail client not configured:** The browser will handle the `mailto:` scheme gracefully (typically a no-op or OS prompt).
- **Repeat readers:** Same CTA on every post is intentional for consistency and reinforcement.

## Testing and Verification Plan

### Static validation

- Run `bun dev` and verify no build errors after adding the component import and usage.

### Visual verification

- Open any blog post and confirm the CTA appears after the article and before related posts.
- Verify styling matches the homepage CTA (colors, spacing, typography, button).
- Test at multiple viewport widths (mobile, tablet, desktop).

### Functional verification

- Click the CTA button and confirm it opens a mail client with `admin@bustamam.tech` pre-filled.

## Implementation Notes

- Import `AvailabilityCard` from `../components/AvailabilityCard.astro` inside `BlogPost.astro`.
- No changes needed to `AvailabilityCard.astro` itself; it is already a standalone, reusable component with its own `px-gutter` padding.
- Place the CTA as a standalone section after the closing `page-shell` that contains `post-body-grid` (the three-column article layout) and before the "↳ related writing" section.

## Success Criteria

- Every published blog post displays the CTA after the article prose.
- The CTA visually matches the homepage availability card.
- The CTA button opens a pre-addressed email to `admin@bustamam.tech`.
- No visual regressions on existing post layout (related posts, footer, TOC, etc.).
