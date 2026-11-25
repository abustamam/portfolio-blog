import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-training/reserved/';
const ENDPOINT = '**/api/ai-quiz/tracks';
const NAMES = { everyday: 'Everyday AI', connect: 'Connect', build: 'Build' } as const;
const GUIDES = {
  everyday: ['/ai-guides/never-paste/', '/ai-guides/prompt/', '/ai-guides/examples/'],
  connect: ['/ai-guides/never-paste/', '/ai-guides/which-tool/', '/ai-guides/when-ai-is-wrong/'],
  build: ['/ai-guides/never-paste/', '/ai-guides/when-ai-is-wrong/', '/ai-guides/which-model/'],
};
const COUNTS = { ok: true, counts: { everyday: 2, connect: 5, build: 8 } };

const mockCounts = (page: Page) =>
  page.route(ENDPOINT, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(COUNTS) }));

const visibleGuides = (page: Page) =>
  page.locator('.reserved-guides:visible a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));

test.describe('post-deposit page', () => {
  test('is noindex, out of the sitemap and out of the nav', async ({ page }) => {
    const html = readFileSync(`${DIST}ai-training/reserved/index.html`, 'utf8');
    expect(html).toMatch(/<meta name="robots" content="noindex/);
    expect(readFileSync(`${DIST}sitemap-0.xml`, 'utf8')).not.toContain('/ai-training/reserved');
    await page.goto('/ai-training/');
    await expect(page.locator('a[href^="/ai-training/reserved"]')).toHaveCount(0);
    expect(await page.locator('nav a[href*="reserved"]').count()).toBe(0);
  });

  test('says what happens next, in order, with no link to the cohort pages', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('body')).toContainText('Salaam');
    const steps = page.locator('.reserved-steps > li');
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText('launches at 5 deposits');
    await expect(steps.nth(1)).toContainText('WhatsApp');
    await expect(steps.nth(2)).toContainText('refundable');
    await expect(steps.nth(2)).toContainText('$25 comes back in full');
    await expect(page.locator('a[href^="/ai-cohort"]:not([href="/ai-cohort/waitlist/"])')).toHaveCount(0);
    await expect(page.locator('a[href="/ai-cohort/waitlist/"]')).toHaveCount(0);
  });

  test('no query: generic content naming all three tracks, no count', async ({ page }) => {
    await mockCounts(page);
    await page.goto(PAGE);
    await expect(page.locator('h1 [data-only]:visible')).toHaveText('Your seat is reserved');
    for (const name of Object.values(NAMES)) await expect(page.locator('.ai-lead')).toContainText(name);
    expect(await visibleGuides(page)).toEqual(['/ai-guides/never-paste/', '/ai-guides/prompt/', '/ai-guides/when-ai-is-wrong/']);
    await expect(page.locator('#reserved-count')).toBeHidden();
  });

  for (const [id, name] of Object.entries(NAMES)) {
    test(`?track=${id}: fits the track, its guides and its live count`, async ({ page }) => {
      await mockCounts(page);
      await page.goto(`${PAGE}?track=${id}`);
      await expect(page.locator('h1 [data-only]:visible')).toHaveText(`Your seat in ${name} is reserved`);
      expect(await visibleGuides(page)).toEqual(GUIDES[id as keyof typeof GUIDES]);
      const expected = { everyday: '2 of 5 reserved to launch', connect: 'Launching · 5 of 8 seats taken', build: 'This track is full. Join the waitlist.' }[id]!;
      await expect(page.locator('#reserved-count')).toHaveText(expected);
    });
  }

  test('a full track links the waitlist from the count line', async ({ page }) => {
    await mockCounts(page);
    await page.goto(`${PAGE}?track=build`);
    const link = page.locator('#reserved-count a');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/ai-cohort/waitlist/');
    await expect(link).toHaveText('Join the waitlist.');
    await expect(page.locator('a[href^="/ai-cohort"]:not([href="/ai-cohort/waitlist/"])')).toHaveCount(0);
  });

  test('every "message me" on the page opens WhatsApp through the redirect', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator('main').innerText();
    const mentions = (text.match(/message me/gi) ?? []).length;
    const links = await page.locator('main a[href="/api/ai-quiz/whatsapp"][target="_blank"]').evaluateAll(
      (as) => as.filter((a) => /message me/i.test(a.textContent ?? '')).length,
    );
    expect(mentions).toBeGreaterThanOrEqual(1);
    expect(links).toBe(mentions);
  });

  test('unknown track falls back to generic', async ({ page }) => {
    await mockCounts(page);
    for (const q of ['?track=nope', '?track=generic', '?track=']) {
      await page.goto(PAGE + q);
      await expect(page.locator('h1 [data-only]:visible')).toHaveText('Your seat is reserved');
      await expect(page.locator('#reserved-count')).toBeHidden();
    }
  });

  test('hides the count when the endpoint fails', async ({ page }) => {
    await page.route(ENDPOINT, (r) => r.fulfill({ status: 503, body: '{}' }));
    await page.goto(`${PAGE}?track=everyday`);
    await expect(page.locator('h1 [data-only]:visible')).toHaveText('Your seat in Everyday AI is reserved');
    await expect(page.locator('#reserved-count')).toBeHidden();
    await page.route(ENDPOINT, (r) => r.abort());
    await page.goto(`${PAGE}?track=build`);
    await expect(page.locator('h1 [data-only]:visible')).toHaveText('Your seat in Build is reserved');
    await expect(page.locator('#reserved-count')).toBeHidden();
  });

  test('works with JavaScript off, even with a track in the URL', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${PAGE}?track=connect`);
    await expect(page.locator('h1 [data-only]:visible')).toHaveText('Your seat is reserved');
    await expect(page.locator('.reserved-steps > li')).toHaveCount(3);
    expect(await visibleGuides(page)).toHaveLength(3);
    await expect(page.locator('#reserved-count')).toBeHidden();
    await expect(page.locator('a[href="mailto:admin@bustamam.tech"]').first()).toBeVisible();
    await context.close();
  });

  test('has the contact mailto and a share link', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('a[href="mailto:admin@bustamam.tech"]').first()).toBeVisible();
    await expect(page.locator('#share')).toBeVisible();
    await expect(page.locator('a[href^="https://wa.me/?text="]')).toHaveAttribute('href', /ai-training/);
  });

  test('every guide link points at a built page', async () => {
    for (const href of new Set(Object.values(GUIDES).flat())) {
      expect(() => readFileSync(`${DIST}${href.slice(1)}index.html`), href).not.toThrow();
    }
  });

  test('fits a phone screen without horizontal scroll', async ({ page }) => {
    await mockCounts(page);
    for (const width of [375, 320]) {
      for (const q of ['', '?track=connect']) {
        await page.setViewportSize({ width, height: 812 });
        await page.goto(PAGE + q);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${PAGE}${q} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    }
  });
});
