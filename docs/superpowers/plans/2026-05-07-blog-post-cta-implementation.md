# Blog Post CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the existing `AvailabilityCard` CTA component to every blog post page, placed after the article prose and before the related posts grid.

**Architecture:** Reuse the existing `AvailabilityCard.astro` component in the `BlogPost.astro` layout. No new components or styling needed.

**Tech Stack:** Astro, HTML, Tailwind CSS

---

## File Structure

- `src/layouts/BlogPost.astro` — layout for all blog posts. Modified to import and render `AvailabilityCard` between the article and related posts.
- `src/components/AvailabilityCard.astro` — existing CTA component. No changes.

---

### Task 1: Import AvailabilityCard in BlogPost layout

**Files:**
- Modify: `src/layouts/BlogPost.astro`

- [ ] **Step 1: Add the import**

  In the frontmatter (the `---` block), add an import for `AvailabilityCard` alongside the existing imports:

  ```astro
  import AvailabilityCard from '../components/AvailabilityCard.astro';
  ```

  Place it after the `CopyButton` import on line 5.

- [ ] **Step 2: Add the component between article and related posts**

  Find the closing `</article>` tag (around line 167). Immediately after it, insert:

  ```astro
  <!-- CTA -->
  <AvailabilityCard />
  ```

  This should sit between:
  - The closing `</article>`
  - The right sidebar `</aside>`
  - The closing `</div>` for `post-body-grid`
  - The closing `</div>` for the `page-shell`

  Then after that page-shell div closes, the related posts section begins.

  The exact insertion point is after:
  ```astro
        </aside>
      </div>
    </div>
  ```
  (the closing tags for right sidebar, post-body-grid, and page-shell)

  and before:
  ```astro
    <!-- Related posts -->
    {allPosts.length > 0 && (
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/layouts/BlogPost.astro
  git commit -m "feat: add hire-me CTA to blog posts"
  ```

---

### Task 2: Verify visually

**Files:**
- No file changes

- [ ] **Step 1: Start dev server**

  ```bash
  bun dev
  ```

- [ ] **Step 2: Open a blog post and confirm CTA placement**

  Navigate to any blog post (e.g., `/writing/ai-literacy-not-competition/`).

  Confirm:
  1. The CTA section appears after the article content.
  2. The CTA section appears before the "↳ related writing" heading.
  3. The CTA visually matches the homepage (same badge, headline, contact grid, button styling).
  4. The "start a conversation" button links to `mailto:admin@bustamam.tech`.

- [ ] **Step 3: Test responsiveness**

  Resize the browser to mobile width and confirm the CTA still renders correctly without layout issues.

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ CTA rendered on every blog post page — covered by modifying `BlogPost.astro`
   - ✅ Placement after article prose, before related posts — covered by insertion point
   - ✅ Copy and styling consistent with homepage `AvailabilityCard` — covered by reusing the component
   - ✅ Same copy on all posts — covered (component has hardcoded copy)
   - ✅ Email link as primary action — covered (button uses `mailto:`)

2. **Placeholder scan:**
   - ✅ No TBDs, TODOs, or vague instructions
   - ✅ Exact file paths provided
   - ✅ Exact insertion points described

3. **Type consistency:**
   - ✅ No types or interfaces involved; this is a pure component placement change

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-07-blog-post-cta-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
