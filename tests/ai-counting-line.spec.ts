import { test, expect } from '@playwright/test';

// #109: the site says in one line what it counts, and that it uses no trackers.
// It lives in the shared footer, so it shows on both the letterhead and terminal layouts.
const LINE = 'no cookies or trackers · page counts come from server logs';

for (const path of ['/ai-guides/', '/colophon/', '/']) {
  test(`${path} footer states what is counted`, async ({ page }) => {
    await page.goto(path);
    const line = page.locator('[data-counting-line]');
    await expect(line).toHaveCount(1);
    await expect(line).toHaveText(LINE);
    await expect(page.locator('footer [data-counting-line]')).toBeVisible();
  });
}

test('no page loads a third-party script or sets a cookie', async ({ page, context }) => {
  const thirdParty: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost' && r.resourceType() === 'script') thirdParty.push(r.url());
  });
  for (const path of ['/ai-guides/', '/ai-quiz/', '/ai-training/']) await page.goto(path);
  expect(thirdParty).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});
