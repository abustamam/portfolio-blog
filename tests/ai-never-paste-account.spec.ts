import { test, expect } from '@playwright/test';

// The shared never-paste text starts with the account decision: which account
// you are using decides what you may paste, so it comes before the table.
// Both pages render src/content/ai-partials/never-paste-before.mdx and never-paste-after.mdx. Run after `bun run build`.

const PAGES = ['/ai-guides/never-paste/', '/ai-cohort/never-paste/'];

for (const path of PAGES) {
  test.describe(path, () => {
    test('the account decision, with its three cases, comes before the table', async ({ page }) => {
      await page.goto(path);
      const heading = page.locator('article h2#first-which-account');
      await expect(heading).toHaveCount(1);
      await expect(heading).toHaveText('First: which account?');

      const cases = page.locator('article h2#first-which-account + p + ul > li');
      await expect(cases).toHaveCount(3);
      await expect(cases.nth(0)).toContainText('A free or personal account, or a work file in a personal account');
      await expect(cases.nth(0)).toContainText('email to a stranger');
      await expect(cases.nth(1)).toContainText('A work account your employer has approved for that kind of data');
      await expect(cases.nth(1)).toContainText('follow their policy');
      await expect(cases.nth(2)).toContainText('Not sure which you have');
      await expect(cases.nth(2)).toContainText('treat it as the first case');

      // DOM order: the decision heading and its list precede the first table.
      const order = await page.evaluate(() => {
        const h = document.querySelector('article h2#first-which-account');
        const list = document.querySelector('article h2#first-which-account + p + ul');
        const table = document.querySelector('article table');
        if (!h || !list || !table) return null;
        const before = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        return { headingFirst: before(h, table), listFirst: before(list, table) };
      });
      expect(order).toEqual({ headingFirst: true, listFirst: true });
    });

    test('passwords, keys and codes stay out of every account, approved work accounts included', async ({ page }) => {
      await page.goto(path);
      const note = page.locator('article h2#first-which-account + p + ul + p');
      await expect(note).toHaveText(
        'Passwords, keys and one-time codes stay out of every account. That includes a work account your employer has approved.',
      );
    });

    test('the linked anchors still exist', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('article #make-a-file-safe-in-three-steps')).toHaveCount(1);
      await expect(page.locator('article #check-before-you-press-enter')).toHaveCount(1);
    });

    test('no separate "Work accounts" section remains', async ({ page }) => {
      await page.goto(path);
      const headings = await page.locator('article :is(h1, h2, h3, h4, h5, h6)').allInnerTexts();
      expect(headings.length).toBeGreaterThan(0);
      expect(headings.filter((t) => /work accounts?/i.test(t))).toEqual([]);
    });
  });
}

test('the cohort handout link says "What\'s safe to paste", not "Never paste these"', async ({ page }) => {
  await page.goto('/ai-cohort/');
  const link = page.locator('a[href="/ai-cohort/never-paste/"]', { hasText: "What's safe to paste" });
  await expect(link).toHaveCount(1);
  await expect(page.getByText('Never paste these')).toHaveCount(0);
});

test('when-ai-is-wrong links to the guide as "what\'s safe to paste into AI"', async ({ page }) => {
  await page.goto('/ai-guides/when-ai-is-wrong/');
  const link = page.locator('article a[href="/ai-guides/never-paste/"]');
  // The markdown pipeline turns the apostrophe into a typographic one.
  await expect(link).toHaveText(/^what[’']s safe to paste into AI$/);
});
