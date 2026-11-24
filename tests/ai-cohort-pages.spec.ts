import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGES = ['/ai-cohort/', '/ai-cohort/prompt/', '/ai-cohort/never-paste/', '/ai-cohort/hand-off/'];

test.describe('cohort pages', () => {
  test('every built cohort page is noindex', () => {
    for (const p of PAGES) {
      const html = readFileSync(`${DIST}${p.slice(1)}index.html`, 'utf8');
      expect(html, p).toContain('<meta name="robots" content="noindex">');
    }
  });

  test('pages carry no Meet link, email address or phone number', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p);
      const text = await page.locator('body').innerText();
      expect(text, p).not.toMatch(/meet\.google\.com/);
      expect(text, p).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
      expect(text, p).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
      await expect(page.locator('a[href*="meet.google.com"], a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
    }
  });

  test('the nav links every cohort page and marks the current one', async ({ page }) => {
    await page.goto('/ai-cohort/never-paste/');
    const nav = page.locator('nav.cohort-nav');
    for (const href of [...PAGES, '/ai-cohort/intake/']) await expect(nav.locator(`a[href="${href}"]`)).toHaveCount(1);
    await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute('href', '/ai-cohort/never-paste/');
  });

  test('home lists the four sessions with their dates', async ({ page }) => {
    await page.goto('/ai-cohort/');
    const sessions = page.locator('.cohort-sessions > li');
    await expect(sessions).toHaveCount(4);
    await expect(sessions.nth(0)).toContainText('Monday, January 11');
    await expect(sessions.nth(3)).toContainText('Monday, February 1');
    await expect(page.locator('a[href="/ai-cohort/intake/"]').first()).toBeVisible();
  });

  test('prose lists show markers (the site reset strips them)', async ({ page }) => {
    await page.goto('/ai-cohort/never-paste/');
    const ol = page.locator('.cohort-prose ol').first();
    await expect(ol).toHaveCSS('list-style-type', 'decimal');
    await page.goto('/ai-cohort/');
    await expect(page.locator('.cohort-prose ul').first()).toHaveCSS('list-style-type', 'disc');
    await expect(page.locator('.cohort-sessions')).toHaveCSS('list-style-type', 'none');
  });

  test('the prompt template has a copy button', async ({ page }) => {
    await page.goto('/ai-cohort/prompt/');
    await expect(page.locator('.copy-wrapper .copy-btn')).toHaveCount(1);
    await expect(page.locator('.copy-wrapper pre')).toContainText('Situation:');
  });

  test('every cohort page fits a phone screen without horizontal scroll', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      for (const p of PAGES) {
        await page.goto(p);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${p} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    }
  });
});
