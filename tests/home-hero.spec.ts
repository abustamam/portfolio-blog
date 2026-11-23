import { test, expect } from '@playwright/test';

const HEADLINE = /Founding-engineer judgment,\s*a few hours a week\./;

test.describe('homepage hero copy', () => {
  test('sells the fractional offer and drops the old copy', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(HEADLINE);
    await expect(page.getByText('fractional founding engineer and technical advisor', { exact: false }).first()).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('maxed out');
    expect(body).not.toContain('Q3 2026');
    expect(body).not.toContain('without the full-time hire');
    await expect(page).toHaveTitle(/Fractional Founding Engineer/);
  });

  test('lists the four offers in order and the proof strip', async ({ page }) => {
    await page.goto('/');
    const offers = page.locator('#offers-heading + ol h3');
    await expect(offers).toHaveText([
      'Fractional founding engineer',
      'Technical advisory',
      'Scoped zero-to-one builds',
      'AI-assisted delivery, measured',
    ]);
    const proof = page.getByRole('region', { name: 'Track record' });
    await expect(proof).toContainText('Edvo');
    await expect(proof).toContainText('CDK Global');
    await expect(proof).toContainText('XYO');
  });

  test('main nav and homepage do not link to the AI cohort quiz', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href*="ai-quiz"]')).toHaveCount(0);
    await expect(page.locator('a[href*="hands-on-ai-cohort"]')).toHaveCount(0);
  });
});

test.describe('hero terminal', () => {
  test('types the session, then hands over without stealing focus or scrolling', async ({ page }) => {
    await page.goto('/');
    const widget = page.locator('#terminal-widget');
    await expect(widget).toHaveAttribute('data-intro', 'pending');
    await expect(widget).toHaveAttribute('data-intro-done', '', { timeout: 15_000 });
    await expect(widget).not.toHaveAttribute('data-intro', /.*/);

    const output = page.locator('#widget-output');
    await expect(output).toContainText('fractional founding engineer + advisor');
    await expect(output).toContainText('a few engagements at a time');
    await expect(page.locator('#widget-input')).toBeVisible();

    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusedId).not.toBe('widget-input');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('reduced motion shows the final state with no typing', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const widget = page.locator('#terminal-widget');
    // Final state as soon as scripts run: no pending intro, input ready.
    await expect(widget).toHaveAttribute('data-intro-done', '', { timeout: 1_000 });
    await expect(widget).not.toHaveAttribute('data-intro', /.*/);
    await expect(page.locator('#widget-input')).toBeVisible({ timeout: 1_000 });
    const hidden = await page.locator('[data-script-row]').evaluateAll((rows) =>
      rows.filter((r) => getComputedStyle(r).visibility !== 'visible').length,
    );
    expect(hidden).toBe(0);
    await expect(page.locator('[data-type-cursor]')).toHaveCount(0);
  });

  test('a typed command produces output', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const input = page.locator('#widget-input');
    await expect(input).toBeVisible();
    await input.click();
    await input.fill('ls work');
    await input.press('Enter');
    const output = page.locator('#widget-output');
    await expect(output).toContainText('~ $ ls work');
    await expect(output).toContainText('edvo/');

    await input.fill('capacity');
    await input.press('Enter');
    await expect(output.getByText('a few engagements at a time')).toHaveCount(2);
  });

  test('clicking mid-intro skips to the end and focuses the prompt', async ({ page }) => {
    await page.goto('/');
    const widget = page.locator('#terminal-widget');
    await expect(widget).toHaveAttribute('data-intro', 'pending');
    await page.locator('#widget-output').click();
    await expect(widget).toHaveAttribute('data-intro-done', '');
    await expect(page.locator('#widget-input')).toBeFocused();
  });

  test('fits a 375px phone without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // Scoped to the top chrome, hero, proof strip and offers. The selected-work
    // cards are owned elsewhere and checked by their own tests.
    const overflowing = await page.evaluate(() => {
      const roots = [
        document.body.firstElementChild,
        document.querySelector('section[aria-labelledby="hero-heading"]'),
        document.querySelector('section[aria-label="Track record"]'),
        document.querySelector('section[aria-labelledby="offers-heading"]'),
      ].filter(Boolean) as Element[];
      return roots.flatMap((root) =>
        [root, ...root.querySelectorAll('*')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`),
      );
    });
    expect(overflowing).toEqual([]);
    const box = await page.locator('#terminal-widget').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });
});

test.describe('hero without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows headline, subhead, CTAs and the static session', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(HEADLINE);
    await expect(page.getByRole('link', { name: '$ start a conversation →' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '$ see my work →' })).toBeVisible();
    const output = page.locator('#widget-output');
    await expect(output.getByText('~ $ whoami')).toBeVisible();
    await expect(output.getByText('04  ai-assisted delivery, measured')).toBeVisible();
    await expect(output.getByRole('link', { name: /\/work/ })).toHaveAttribute('href', '/work/');
  });
});
