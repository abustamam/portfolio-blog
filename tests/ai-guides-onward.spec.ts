// Onward paths and labels added in the content review pass: every tool ends
// with a next step, the Scrubber does not call its output safe, and the
// model table stacks on a phone.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { nextGuide } from '../src/utils/startHere';

const SRC = fileURLToPath(new URL('../src/content/guides/', import.meta.url));

/** Which hub lists render, in hub order, from the published guides' frontmatter (not from the page). */
const LIST_IDS = { start: 'start-from-zero', guides: 'guides', reference: 'look-something-up' } as const;
const publishedGroups = new Set(
  readdirSync(SRC)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => readFileSync(SRC + f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '')
    .filter((fm) => !/^draft:\s*true\s*$/m.test(fm))
    .map((fm) => fm.match(/^group:\s*['"]?(\w+)/m)?.[1] ?? 'guides'),
);
const FIRST_LIST = (['start', 'guides', 'reference'] as const).find((k) => publishedGroups.has(k)) ?? 'guides';

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

test('the hub offers a way past the questions to all the guides', async ({ page }) => {
  await page.goto('/ai-guides/');
  const link = page.locator('[data-start-here] .start-here__hint a[href^="#"]');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '#all-guides');
  await expect(page.locator('#all-guides')).toHaveText('All guides');
  // the target exists, is the first rendered list, and is the list for that group
  const target = page.locator(`ol#${LIST_IDS[FIRST_LIST]}[data-hub-list="${FIRST_LIST}"]`);
  await expect(target).toHaveCount(1);
  expect(await page.locator('[data-hub-list]').first().getAttribute('id')).toBe(LIST_IDS[FIRST_LIST]);
  await expect(page.locator('[data-guide-list]')).toHaveCount(publishedGroups.has('guides') ? 1 : 0);
});
