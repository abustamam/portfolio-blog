import { test, expect } from '@playwright/test';

// Frontmatter `pubDate: '2026-08-18'` parses as UTC midnight. Formatting it with
// local-time getters renders "Aug 17" on any build machine west of UTC, so these
// only bite when the build runs in such a timezone (CI builds with
// TZ=America/Los_Angeles for that reason).
const POST = 'six-ways-i-fooled-myself-benchmarking';
const SERIES_POST = 'url-shortener-phase-1-baseline'; // pubDate: '2026-03-04'

test('the writing index shows the frontmatter pubDate', async ({ page }) => {
  await page.goto('/writing/');
  const row = page.locator(`a[href="/writing/${POST}/"]`).first();
  await expect(row).toContainText('Aug 18 2026');
  await expect(row).not.toContainText('Aug 17 2026');
});

test('a post page shows the frontmatter pubDate', async ({ page }) => {
  await page.goto(`/writing/${POST}/`);
  await expect(page.getByText('Aug 18 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('Aug 17 2026')).toHaveCount(0);
});

test('a series page shows the frontmatter pubDate', async ({ page }) => {
  await page.goto('/series/url-shortener-systems-design/');
  const item = page.locator('li', { has: page.locator(`a[href*="${SERIES_POST}"]`) }).first();
  await expect(item).toContainText('March 4, 2026');
});

test('the JSON feed and RSS feed carry the frontmatter pubDate', async ({ request }) => {
  const feed = await (await request.get('/feed.json')).json();
  const item = feed.items.find((i: { url: string }) => i.url.includes(POST));
  expect(item.date_published.slice(0, 10)).toBe('2026-08-18');

  const rss = await (await request.get('/rss.xml')).text();
  const entry = rss.split('<item>').find((s) => s.includes(POST));
  expect(entry).toContain('<pubDate>Tue, 18 Aug 2026');
});
