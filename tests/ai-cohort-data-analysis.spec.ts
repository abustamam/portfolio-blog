import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const KIT = fileURLToPath(new URL('../kits/data-analysis/', import.meta.url));
const PAGE = '/ai-cohort/data-analysis/';
const ZIP = '/downloads/data-analysis-kit.zip';

// Computed from the CSV on disk, not from answer-key.json.
function fromCsv() {
  const rows = readFileSync(`${KIT}expenses-2025.csv`, 'utf8').trimEnd().split('\n').slice(1).map((text, i) => {
    const [date, , category, amount] = text.split(',');
    return { n: i + 2, text, date, category, cents: amount === '' ? null : Math.round(Number(amount) * 100) };
  });
  const seen = new Set<string>();
  const total = { asInFile: 0, outlierKept: 0, afterFixes: 0 };
  const byCategory: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  let travelMarch = 0;
  let outlierRow = 0;
  for (const r of rows) {
    total.asInFile += r.cents ?? 0;
    if ((r.cents ?? 0) > 90000) outlierRow = r.n;
    if (seen.has(r.text)) continue;
    seen.add(r.text);
    const cents = (r.cents ?? 0) > 90000 ? 18450 : (r.cents ?? 0);
    const cat = r.category === 'Supplies' ? 'Office Supplies' : r.category;
    total.outlierKept += r.cents ?? 0;
    total.afterFixes += cents;
    byCategory[cat] = (byCategory[cat] ?? 0) + cents;
    byMonth[r.date.slice(0, 7)] = (byMonth[r.date.slice(0, 7)] ?? 0) + cents;
    if (cat === 'Travel' && r.date.startsWith('2025-03')) travelMarch += cents;
  }
  return { rows: rows.length, total, byCategory, byMonth, travelMarch, outlierRow, blankRow: rows.find((r) => r.cents === null)!.n };
}
const num = (s: string) => Number(s.replace(/[$,]/g, ''));

test.describe('data analysis kit page', () => {
  test('is noindex, out of the sitemap and the cohort nav', () => {
    const html = readFileSync(`${DIST}ai-cohort/data-analysis/index.html`, 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(readFileSync(`${DIST}sitemap-0.xml`, 'utf8')).not.toContain('data-analysis');
    expect(html.match(/<nav class="cohort-nav"[\s\S]*?<\/nav>/)?.[0]).not.toContain('data-analysis');
  });

  test('links the zip at the top and bottom, and the zip is served', async ({ page, request }) => {
    await page.goto(PAGE);
    await expect(page.locator(`a[data-kit-download][href="${ZIP}"][download]`)).toHaveCount(2);
    const res = await request.get(ZIP);
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 4).toString('hex')).toBe('504b0304');
  });

  test('facts on the page match the numbers computed from the CSV', async ({ page }) => {
    const want = fromCsv();
    await page.goto(PAGE);
    const fact = async (k: string) => num(await page.locator(`[data-fact="${k}"]`).first().innerText());
    expect(await fact('rowsInFile')).toBe(want.rows);
    expect(await fact('totals.asInFile')).toBeCloseTo(want.total.asInFile / 100, 2);
    expect(await fact('totals.afterFixes')).toBeCloseTo(want.total.afterFixes / 100, 2);
    expect(await fact('totals.outlierKept')).toBeCloseTo(want.total.outlierKept / 100, 2);
    expect(await fact('question.answer')).toBeCloseTo(want.travelMarch / 100, 2);
    expect(await fact('oddities.outlier.row')).toBe(want.outlierRow);
    expect(await fact('oddities.blank.row')).toBe(want.blankRow);
    // Every category and month row in the two tables.
    for (const [k, v] of Object.entries(want.byCategory)) expect(await fact(`byCategory.${k}`), k).toBeCloseTo(v / 100, 2);
    for (const [k, v] of Object.entries(want.byMonth)) expect(await fact(`byMonth.${k}`), k).toBeCloseTo(v / 100, 2);
    await expect(page.locator('table.totals tbody tr')).toHaveCount(Object.keys(want.byCategory).length + Object.keys(want.byMonth).length);
  });

  test('has four prompts with copy buttons, and they copy the prompt text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    const wrappers = page.locator('.copy-wrapper:has(pre[data-prompt])');
    await expect(wrappers).toHaveCount(4);
    await expect(page.locator('.copy-wrapper')).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await wrappers.nth(i).locator('.copy-btn').click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      for (const part of ['Situation:', 'Task:', 'Input:', 'Format:', 'Check:']) expect(copied, `prompt ${i + 1}`).toContain(part);
    }
  });

  test('links the safe-file section and the when-AI-is-wrong guide, and both anchors exist', async ({ page, request }) => {
    await page.goto(PAGE);
    await expect(page.locator('a[href="/ai-cohort/never-paste/#make-a-file-safe-in-three-steps"]')).toHaveCount(1);
    await expect(page.locator('a[href="/ai-guides/when-ai-is-wrong/"]').first()).toBeVisible();
    const target = readFileSync(`${DIST}ai-cohort/never-paste/index.html`, 'utf8');
    expect(target).toContain('id="make-a-file-safe-in-three-steps"');
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
