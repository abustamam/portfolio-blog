import { test, expect } from '@playwright/test';

// The wordmark must not depend on installed fonts: it is outlined paths, and
// TECHNOLOGY's ink spans exactly BUSTAMAM's ink, left edge to right edge.
test('header wordmark is outlined and TECHNOLOGY is justified to BUSTAMAM', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('.brand-logo-svg');
  await expect(svg.locator('text')).toHaveCount(0);

  const box = await svg.evaluate((el) => {
    const bb = (sel: string) => (el.querySelector(sel) as SVGGraphicsElement).getBBox();
    const top = bb('.wordmark-top');
    const sub = bb('.wordmark-sub');
    return { topL: top.x, topR: top.x + top.width, subL: sub.x, subR: sub.x + sub.width };
  });
  expect(Math.abs(box.topL - box.subL)).toBeLessThan(1);
  expect(Math.abs(box.topR - box.subR)).toBeLessThan(1);
});

test.describe('wordmark draw animation', () => {
  test('plays on the first page of a session, not on the next', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.brand-logo-wrap')).toHaveClass(/is-drawing/);
    await page.goto('/writing');
    await expect(page.locator('.brand-logo-wrap')).not.toHaveClass(/is-drawing/);
  });

  test('never plays under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.brand-logo-wrap')).not.toHaveClass(/is-drawing/);
  });
});
