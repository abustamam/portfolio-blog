import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-cohort/log-analysis/';
const ZIP = '/downloads/log-analysis-kit.zip';

test.describe('log analysis kit page', () => {
  test('is noindex, out of the sitemap and the cohort nav', () => {
    const html = readFileSync(`${DIST}ai-cohort/log-analysis/index.html`, 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex">');
    const sitemap = readFileSync(`${DIST}sitemap-0.xml`, 'utf8');
    expect(sitemap).not.toContain('log-analysis');
    expect(html.match(/<nav class="cohort-nav"[\s\S]*?<\/nav>/)?.[0]).not.toContain('log-analysis');
  });

  test('links the zip at the top and bottom, and the zip is served', async ({ page, request }) => {
    await page.goto(PAGE);
    const links = page.locator(`a[data-kit-download][href="${ZIP}"][download]`);
    await expect(links).toHaveCount(2);
    const res = await request.get(ZIP);
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 4).toString('hex')).toBe('504b0304');
  });

  test('has three prompts with copy buttons, and they copy the prompt text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    const wrappers = page.locator('.copy-wrapper:has(pre[data-prompt])');
    await expect(wrappers).toHaveCount(3);
    await expect(page.locator('.copy-wrapper')).toHaveCount(3); // log excerpts get no copy button
    await wrappers.first().locator('.copy-btn').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('<EMAIL>');
    expect(copied.trimEnd()).toMatch(/Here is the log:$/);
  });

  test('marks private values before and placeholders after', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.log-compare > li')).toHaveCount(5);
    for (const li of await page.locator('.log-compare > li').all()) {
      await expect(li.locator('mark.log-pii').first()).toBeVisible();
      await expect(li.locator('mark.log-ph').first()).toBeVisible();
    }
    // The "after" lines carry none of the highlighted values.
    const after = await page.locator('.log-compare > li code:nth-of-type(2)').allInnerTexts();
    const pii = await page.locator('.log-compare mark.log-pii').allInnerTexts();
    for (const v of pii) for (const a of after) expect(a).not.toContain(v);
  });

  test('fits a phone screen without horizontal scroll', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(PAGE);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
});
