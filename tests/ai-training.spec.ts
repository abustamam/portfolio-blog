import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-training/';
const LINKS = {
  everyday: 'https://buy.stripe.com/eVq5kE5rI9W8cztc0zdAk03',
  connect: 'https://buy.stripe.com/00w5kE9HYb0c0QL5CbdAk01',
  build: 'https://buy.stripe.com/6oU4gA8DU2tG6b5aWvdAk02',
};
const PRICES = { everyday: '$79', connect: '$99', build: '$149' };

test.describe('AI training page', () => {
  test('is indexed and in the sitemap; participant pages are not', () => {
    const html = readFileSync(`${DIST}ai-training/index.html`, 'utf8');
    expect(html).not.toContain('name="robots"');
    const sitemap = readFileSync(`${DIST}sitemap-0.xml`, 'utf8');
    expect(sitemap).toContain('bustamam.tech/ai-training/');
    expect(sitemap).not.toContain('/ai-cohort/');
  });

  test('each track has its price, four sessions and its own $25 deposit link', async ({ page }) => {
    await page.goto(PAGE);
    for (const [id, href] of Object.entries(LINKS)) {
      const card = page.locator(`#${id}`);
      await expect(card.locator('a.cohort-cta')).toHaveAttribute('href', href);
      await expect(card.locator('a.cohort-cta')).toContainText('$25');
      await expect(card.locator('.track-kicker')).toContainText(PRICES[id as keyof typeof PRICES]);
      await expect(card.locator('.track-sessions > li')).toHaveCount(4);
    }
  });

  test('says what every track includes, how launch works, and links the quiz', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.training-included')).toContainText('private WhatsApp group');
    await expect(page.locator('body')).toContainText('Tracks run back to back');
    await expect(page.locator('.training-slots > li')).toHaveCount(3);
    await expect(page.locator('.training-slots')).toContainText('After Ramadan');
    await expect(page.locator('a[href="/ai-quiz/"]').first()).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
    expect(text).not.toMatch(/meet\.google\.com/);
  });

  test('shows live counts from the endpoint', async ({ page }) => {
    await page.route('**/api/ai-quiz/tracks', (r) =>
      r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, counts: { everyday: 1, connect: 5, build: 8 } }) }),
    );
    await page.goto(PAGE);
    await expect(page.locator('.track-count[data-track="everyday"]')).toHaveText('1 of 5 reserved to launch');
    await expect(page.locator('.track-count[data-track="connect"]')).toHaveText('Launching · 5 of 8 seats taken');
    await expect(page.locator('.track-count[data-track="build"]')).toHaveText('Full. Join the waitlist.');
  });

  test('keeps the counts hidden when the endpoint fails', async ({ page }) => {
    await page.route('**/api/ai-quiz/tracks', (r) => r.fulfill({ status: 503, body: '{}' }));
    await page.goto(PAGE);
    await expect(page.locator('.track-count:visible')).toHaveCount(0);
  });

  test('fits a phone screen without horizontal scroll', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(PAGE);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${PAGE} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test('nginx sends the old sign-up URLs here', () => {
    const conf = readFileSync(fileURLToPath(new URL('../nginx.conf', import.meta.url)), 'utf8');
    expect(conf).toMatch(/\^\/ai-cohort-1\/\?\$ \{\s*return 301 \/ai-training\/#everyday;/);
    expect(conf).toMatch(/\^\/ai-cohort-2\/\?\$ \{\s*return 301 \/ai-training\/#connect;/);
  });

  test('every "message me" opens WhatsApp through the redirect, in a new tab', async ({ page }) => {
    const src = readFileSync(fileURLToPath(new URL('../src/pages/ai-training.astro', import.meta.url)), 'utf8');
    const inSource = src.match(/message me/gi) ?? [];
    expect(inSource.length).toBe(3);
    await page.goto(PAGE);
    const text = await page.locator('main').textContent() ?? '';
    const total = (text.match(/message me/gi) ?? []).length;
    expect(total).toBe(3);
    const links = page.locator('main a[href="/api/ai-quiz/whatsapp"][target="_blank"]', { hasText: /message me/i });
    await expect(links).toHaveCount(3);
  });

  test('a full track links to the waitlist and its Reserve button goes there', async ({ page }) => {
    await page.route('**/api/ai-quiz/tracks', (r) =>
      r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, counts: { everyday: 1, connect: 5, build: 8 } }) }),
    );
    await page.goto(PAGE);
    const count = page.locator('.track-count[data-track="build"]');
    await expect(count).toHaveText('Full. Join the waitlist.');
    const link = count.locator('a');
    await expect(link).toHaveAttribute('href', '/ai-cohort/waitlist/');
    await expect(page.locator('#build a.cohort-cta')).toHaveAttribute('href', '/ai-cohort/waitlist/');
    const res = await page.request.get(new URL('/ai-cohort/waitlist/', page.url()).href);
    expect(res.status()).toBe(200);
    // Other tracks keep their deposit links.
    await expect(page.locator('#everyday a.cohort-cta')).toHaveAttribute('href', LINKS.everyday);
    await expect(page.locator('#connect a.cohort-cta')).toHaveAttribute('href', LINKS.connect);
    await expect(page.locator('.track-count[data-track="connect"] a')).toHaveCount(0);
  });
});
