import { test, expect } from '@playwright/test';

const AI_PAGES = ['/ai-training/', '/ai-quiz/', '/ai-cohort/', '/ai-cohort/prompt/', '/ai-cohort/intake/', '/ai-cohort/waitlist/'];

test.describe('AI pages: letterhead and layout', () => {
  test('AI pages show the letterhead, not the terminal bar; other pages keep the terminal bar', async ({ page }) => {
    for (const p of AI_PAGES) {
      await page.goto(p);
      await expect(page.locator('.ai-letterhead'), p).toBeVisible();
      await expect(page.locator('#terminal-expand-btn'), p).toHaveCount(0);
      await expect(page.locator('#theme-picker-btn'), p).toBeVisible();
      await expect(page.locator('body > div > footer'), p).not.toContainText('all systems nominal');
    }
    await page.goto('/about');
    await expect(page.locator('#terminal-expand-btn')).toBeVisible();
    await expect(page.locator('.ai-letterhead')).toHaveCount(0);
  });

  test('reading columns stay narrow on a wide screen', async ({ page }) => {
    // Was 1162px at 1280: .page-shell's max-width beat Tailwind's max-w-2xl.
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const p of ['/ai-cohort/', '/ai-cohort/never-paste/', '/ai-quiz/', '/ai-cohort/intake/']) {
      await page.goto(p);
      const width = await page.locator('.ai-shell').evaluate((el) => el.getBoundingClientRect().width);
      expect(width, `${p} column is ${width}px`).toBeLessThanOrEqual(760);
    }
  });

  test('the site header and homepage link to the training page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav[aria-label="Primary"] a[href="/ai-training/"]')).toBeVisible();
    await expect(page.locator('main a[href="/ai-training/"], section a[href="/ai-training/"]').first()).toBeVisible();
  });

  test('the worked example steps through task, prompt and check', async ({ page }) => {
    await page.goto('/ai-training/');
    const wx = page.locator('[data-wx]');
    await expect(wx.locator('#wx-panel-0')).toBeVisible();
    await wx.locator('[data-wx-tab="2"]').click();
    await expect(wx.locator('#wx-panel-2')).toBeVisible();
    await expect(wx.locator('#wx-panel-0')).toBeHidden();
    await expect(wx.locator('[data-wx-tab="2"]')).toHaveAttribute('aria-selected', 'true');
    await expect(wx.locator('.wx-checks > li')).toHaveCount(3);
    await wx.locator('[data-wx-tab="2"]').press('ArrowLeft');
    await expect(wx.locator('#wx-panel-1')).toBeVisible();
  });

  test('with reduced motion the example rests on the last step and nothing is hidden', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/ai-training/');
    await expect(page.locator('#wx-panel-2')).toBeVisible();
    await expect(page.locator('h1')).toHaveCSS('opacity', '1');
    await context.close();
  });

  test('the three track cards line up and fit side by side on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/ai-training/');
    const tops = await page.locator('.training-track').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const feet = await page.locator('.track-foot').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(feet).size).toBe(1);
  });

  test('cohort home: pre-work ticks persist on the device', async ({ page }) => {
    await page.goto('/ai-cohort/');
    const box = page.locator('#cohort-checklist input[data-check="pre-1"]');
    await box.check();
    await page.reload();
    await expect(box).toBeChecked();
  });
});
