import { test, expect } from '@playwright/test';

// No post sets readMin/words in frontmatter; they are computed from the body.
// The index, related-writing cards and the post header must all agree.
const POST = 'six-ways-i-fooled-myself-benchmarking';

async function postReadMin(page: import('@playwright/test').Page) {
  await page.goto(`/writing/${POST}/`);
  const header = await page.getByText(/\d+ min read/).first().textContent();
  return Number(header!.match(/(\d+) min read/)![1]);
}

test('every row on the writing index shows a reading time and word count', async ({ page }) => {
  await page.goto('/writing/');
  const lens = page.locator('.post-row__len');
  const n = await lens.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(lens.nth(i)).toContainText(/\b\d+ min\b/);
    await expect(lens.nth(i)).toContainText(/[\d,]+ w/);
  }
});

test('the index reading time matches the post page', async ({ page }) => {
  const min = await postReadMin(page);
  await page.goto('/writing/');
  const row = page.locator(`a[href="/writing/${POST}/"]`).first();
  await expect(row.locator('.post-row__len')).toContainText(`${min} min`);
});

test('related-writing cards show a reading time', async ({ page }) => {
  await page.goto(`/writing/${POST}/`);
  const cards = page.locator('text=↳ related writing').locator('..').locator('a[href^="/writing/"]');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(cards.nth(i)).toContainText(/\d+ min/);
  }
});
