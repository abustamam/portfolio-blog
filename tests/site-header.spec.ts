import { test, expect } from '@playwright/test';

// Which primary-nav item is marked as the section the page belongs to.
// null: the page belongs to none of them, so nothing is marked.
const CASES: [path: string, label: string | null, exact: boolean][] = [
  ['/', null, false],
  ['/colophon/', null, false],
  ['/writing/', 'writing', true],
  ['/series/', 'writing', false],
  ['/work/', 'work', true],
  ['/about/', 'about', true],
  ['/contact/', 'contact', true],
  ['/ai-guides/', 'ai guides', true],
  ['/ai-guides/prompt/', 'ai guides', false],
  ['/ai-training/', 'ai training', true],
  ['/ai-quiz/', 'ai training', false],
  ['/ai-cohort/', 'ai training', false],
];

test.describe('site header: current section', () => {
  for (const [path, label, exact] of CASES) {
    test(`${path} marks ${label ?? 'nothing'}`, async ({ page }) => {
      await page.goto(path);
      for (const nav of ['Primary', 'Mobile primary']) {
        const current = page.locator(`nav[aria-label="${nav}"] a[aria-current]`);
        if (label === null) {
          await expect(current, nav).toHaveCount(0);
          continue;
        }
        await expect(current, nav).toHaveCount(1);
        expect((await current.textContent())?.trim(), nav).toBe(label);
        // "page" only on the link to this very page; a section ancestor is "true".
        await expect(current, nav).toHaveAttribute('aria-current', exact ? 'page' : 'true');
      }
      // The desktop nav inks the current item and mutes the rest.
      const inked = await page
        .locator('nav[aria-label="Primary"] a')
        .evaluateAll((as) => as.filter((a) => a.classList.contains('text-ink')).map((a) => a.textContent?.trim()));
      expect(inked).toEqual(label === null ? [] : [label]);
      // The drawer links are all ink, so the current one is set in a heavier weight.
      const heavier = await page.locator('nav[aria-label="Mobile primary"] a').evaluateAll((as) => {
        const weight = (a: Element) => Number(getComputedStyle(a).fontWeight);
        const base = Math.min(...as.map(weight));
        return as.filter((a) => weight(a) > base).map((a) => a.textContent?.trim());
      });
      expect(heavier).toEqual(label === null ? [] : [label]);
    });
  }
});
