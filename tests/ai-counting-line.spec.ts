import { test, expect } from '@playwright/test';

// #109: the site says in one line what it counts, and that it uses no trackers.
const LINE = "No trackers and no cookies. I count page requests from the server's own logs, as weekly totals.";

for (const path of ['/ai-guides/', '/colophon/']) {
  test(`${path} states what is counted`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('[data-counting-line]')).toHaveText(LINE);
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
