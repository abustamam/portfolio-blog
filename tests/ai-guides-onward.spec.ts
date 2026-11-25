// Onward paths and labels added in the content review pass: every tool ends
// with a next step, the Scrubber does not call its output safe, and the
// model table stacks on a phone.
import { test, expect } from '@playwright/test';
import { nextGuide } from '../src/utils/startHere';

test.describe('"next guide" in step order, never a reference guide (pure)', () => {
  const L = [
    { id: 'what-is-ai', step: 0.1, group: 'start' as const },
    { id: 'never-paste', step: 1, group: 'guides' as const },
    { id: 'glossary', step: 1.5, group: 'reference' as const },
    { id: 'prompt', step: 2, group: 'guides' as const },
    { id: 'cheat-sheet', step: 9, group: 'reference' as const },
  ];
  test('it walks 0.1 then 1 then 2 and skips the reference guides between', () => {
    expect(nextGuide(L, 'what-is-ai')!.id).toBe('never-paste');
    expect(nextGuide(L, 'never-paste')!.id).toBe('prompt');
  });
  test('a reference guide is never offered, and the last real guide has no next', () => {
    expect(L.map((g) => nextGuide(L, g.id)?.id).filter((id) => id === 'glossary' || id === 'cheat-sheet')).toEqual([]);
    expect(nextGuide(L, 'prompt')).toBeUndefined();
    expect(nextGuide(L, 'missing')).toBeUndefined();
  });
  test('input order does not matter', () => {
    expect(nextGuide([...L].reverse(), 'never-paste')!.id).toBe('prompt');
  });
});

test('the Scrubber says what it does not catch, and does not call the result safe', async ({ page }) => {
  await page.goto('/ai-guides/never-paste/');
  await expect(page.locator('label[for="scrub-out"]')).not.toContainText(/safe/i);
  await expect(page.locator('[data-copy-safe]')).not.toContainText(/safe/i);
  const still = page.locator('[data-scrub-still]');
  for (const word of ['names', 'addresses', 'passwords', 'health']) await expect(still).toContainText(word);
});

test('each guide names the next guide in step order; the last one has none', async ({ page }) => {
  await page.goto('/ai-guides/never-paste/');
  await expect(page.locator('[data-next-guide] a')).toHaveAttribute('href', '/ai-guides/prompt/');
  await page.goto('/ai-guides/job-search/');
  await expect(page.locator('[data-next-guide]')).toHaveCount(0);
});

test('the tool picker result links the paste guide and the prompt guide', async ({ page }) => {
  await page.goto('/ai-guides/which-tool/');
  const next = page.locator('[data-tp-next]');
  await expect(next.locator('a[href="/ai-guides/never-paste/"]')).toHaveCount(1);
  await expect(next.locator('a[href="/ai-guides/prompt/"]')).toHaveCount(1);
});

test('the game score screen links the quiz', async ({ page }) => {
  await page.goto('/ai-guides/when-ai-is-wrong/');
  await expect(page.locator('[data-end] [data-stm-next] a[href="/ai-quiz/"]')).toHaveCount(1);
});

test('at 375px the model table fits the column instead of scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/ai-guides/which-model/');
  const { scroll, client } = await page.locator('[data-model-table]').evaluate((t) => ({ scroll: t.scrollWidth, client: t.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
});

test('the hub offers a way past the questions to the guide list', async ({ page }) => {
  await page.goto('/ai-guides/');
  await expect(page.locator('[data-start-here] a[href="#guides"]')).toBeVisible();
  await expect(page.locator('ol#guides[data-guide-list]')).toHaveCount(1);
});
