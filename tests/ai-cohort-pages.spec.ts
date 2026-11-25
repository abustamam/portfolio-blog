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

  test('pages use the current track names, not Foundations / Applied / Builder', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p);
      const text = await page.locator('body').innerText();
      expect(text, p).not.toMatch(/\b(Foundations|Applied|Builder)\b/);
    }
    await page.goto('/ai-cohort/prompt/');
    for (const name of ['Everyday AI', 'Connect', 'Build']) {
      await expect(page.locator('.cohort-prose strong', { hasText: new RegExp(`^${name}:$`) })).toHaveCount(1);
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

  // These run against COHORT.datesConfirmed: false. Once the dates are
  // announced and the flag flips, replace them with dated assertions.
  test('home lists the four sessions without dates while dates are provisional', async ({ page }) => {
    await page.goto('/ai-cohort/');
    const sessions = page.locator('.cohort-sessions > li');
    await expect(sessions).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(sessions.nth(i).locator('.session-date')).toHaveText(`Session ${i + 1}`);
    }
    await expect(page.locator('a[href="/ai-cohort/intake/"]').first()).toBeVisible();
  });

  test('home shows no cohort dates while they are provisional', async ({ page }) => {
    await page.goto('/ai-cohort/');
    const text = await page.locator('body').innerText();
    for (const date of ['January 11', 'January 4', 'jan 11', 'the 11th', 'February 1']) {
      expect(text.toLowerCase(), date).not.toContain(date.toLowerCase());
    }
    expect(text.toLowerCase()).toContain('dates to be confirmed');
  });

  test('no session is marked next or done while dates are provisional', async ({ page }) => {
    await page.goto('/ai-cohort/');
    await expect(page.locator('.session-next:visible')).toHaveCount(0);
    await expect(page.locator('.cohort-sessions > li[data-state]')).toHaveCount(0);
  });

  test('the old #before-jan-4 anchor still exists', async ({ page }) => {
    await page.goto('/ai-cohort/');
    await expect(page.locator('#before-jan-4')).toHaveCount(1);
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
