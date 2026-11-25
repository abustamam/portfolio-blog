import { test, expect } from '@playwright/test';
import { GLOSSARY } from '../src/consts/guides/glossary';

// The shared never-paste text marks its first uses of glossary words with
// <Term> (#137). Both pages render the same two partials. Run after `bun run build`.

const PAGES = ['/ai-guides/never-paste/', '/ai-cohort/never-paste/'];
// The terms the partials mark: one in each half, the last in the "after" half.
const MARKED = ['conversation', 'ai', 'attach', 'chat-history', 'training-data'];
const WIDTHS = [375, 1280];

for (const path of PAGES) {
  for (const width of WIDTHS) {
    // protects=a reader on this page at this width can open the definition card of each word the partials mark, in both halves; fails_when=a marked word is missing, not clickable, or opens no card or the wrong one; no_claim=hover, keyboard or touch behavior, or that the card text reads well (tests/ai-guide-term.spec.ts covers the component)
    test(`${path} at ${width}px: clicking each marked word opens its card`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      for (const id of MARKED) {
        const trigger = page.locator(`article a.term[data-term="${id}"]`);
        await expect(trigger, id).toHaveCount(1);
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        const card = page.locator('#term-card');
        await expect(card, id).toBeVisible();
        await expect(card.locator('.term-card__term'), id).toHaveText(GLOSSARY.find((t) => t.id === id)!.term);
        await expect(card.locator('.term-card__short'), id).toHaveText(GLOSSARY.find((t) => t.id === id)!.short);
      }
    });
  }
}
