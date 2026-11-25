import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGES = ['/ai-cohort-1/', '/ai-cohort-2/'];
const PAY = 'https://buy.stripe.com/4gM14o5rIfgsarlfcLdAk00';
const CONNECT = 'https://buy.stripe.com/00w5kE9HYb0c0QL5CbdAk01';
const BUILD = 'https://buy.stripe.com/6oU4gA8DU2tG6b5aWvdAk02';

test.describe('cohort sign-up pages', () => {
  test('are indexed, unlike the participant pages', () => {
    for (const p of PAGES) {
      const html = readFileSync(`${DIST}${p.slice(1)}index.html`, 'utf8');
      expect(html, p).not.toContain('name="robots"');
    }
    const sitemap = readFileSync(`${DIST}sitemap-0.xml`, 'utf8');
    for (const p of PAGES) expect(sitemap, p).toContain(`bustamam.tech${p}`);
    expect(sitemap).not.toContain('/ai-cohort/<');
  });

  test('show no participant nav, email address or phone number', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p);
      await expect(page.locator('nav.cohort-nav')).toHaveCount(0);
      const text = await page.locator('body').innerText();
      expect(text, p).not.toMatch(/meet\.google\.com/);
      expect(text, p).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
      expect(text, p).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
    }
  });

  test('cohort 1 lists the four sessions and links the payment link and cohort 2', async ({ page }) => {
    await page.goto('/ai-cohort-1/');
    const sessions = page.locator('.cohort-sessions > li');
    await expect(sessions).toHaveCount(4);
    await expect(sessions.nth(0)).toContainText('Monday, January 11');
    await expect(sessions.nth(3)).toContainText('Monday, February 1');
    await expect(page.locator(`a.cohort-cta[href="${PAY}"]`)).toHaveCount(2);
    await expect(page.locator('a.cohort-cta').first()).toContainText('$79');
    await expect(page.locator('a[href="/ai-cohort-2/"]')).toHaveCount(1);
    await expect(page.locator('body')).toContainText('job search');
  });

  test('cohort 2 offers each option with its own deposit link and the rule', async ({ page }) => {
    await page.goto('/ai-cohort-2/');
    await expect(page.locator('#connect a.cohort-cta')).toHaveAttribute('href', CONNECT);
    await expect(page.locator('#build a.cohort-cta')).toHaveAttribute('href', BUILD);
    await expect(page.locator('#connect')).toContainText('$99');
    await expect(page.locator('#build')).toContainText('$149');
    await expect(page.locator('#connect .option-sessions > li')).toHaveCount(4);
    await expect(page.locator('#build .option-sessions > li')).toHaveCount(4);
    await expect(page.locator('#how')).toBeVisible();
    await expect(page.locator('body')).toContainText('Friday, January 15, 2027');
    await expect(page.locator('a[href="/ai-cohort-1/"]')).toHaveCount(1);
  });

  test('fit a phone screen without horizontal scroll', async ({ page }) => {
    for (const p of PAGES) {
      for (const width of [375, 320]) {
        await page.setViewportSize({ width, height: 812 });
        await page.goto(p);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${p} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    }
  });
});
