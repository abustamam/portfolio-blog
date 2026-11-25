import { test, expect } from '@playwright/test';
import { GLOSSARY } from '../src/consts/guides/glossary';

// /ai-guides/glossary/: every entry in glossary.ts is rendered from the data.
// Run after `bun run build`; the preview serves the built site.

const PAGE = '/ai-guides/glossary/';
const entry = (id: string) => `[data-gl-entry="${id}"]`;

test.describe('glossary page', () => {
  test('every glossary entry renders with its id as the anchor', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-gl-entry]')).toHaveCount(GLOSSARY.length);
    for (const t of GLOSSARY) {
      const el = page.locator(`#${t.id}`);
      await expect(el, t.id).toHaveCount(1);
      await expect(el, t.id).toHaveAttribute('data-gl-entry', t.id);
      await expect(el.locator('dt'), t.id).toHaveText(t.term);
      await expect(el, t.id).toContainText(t.short);
      await expect(el, t.id).toContainText(t.why);
    }
  });

  test('a fragment link scrolls to that entry', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto(`${PAGE}#usage-limit`);
    const box = await page.locator('#usage-limit').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(200);
  });

  test('entries are in alphabetical order by term, ignoring case', async ({ page }) => {
    await page.goto(PAGE);
    const shown = (await page.locator('[data-gl-entry] dt').allTextContents()).map((s) => s.trim());
    const expected = GLOSSARY.map((t) => t.term).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    expect(shown).toEqual(expected);
  });

  test('synonyms show inside their entry as "also called" and are not anchors', async ({ page }) => {
    await page.goto(PAGE);
    const usage = page.locator(entry('usage-limit'));
    await expect(usage.locator('[data-gl-also]')).toHaveText('also called quota, allowance, cap, rate limit');
    for (const t of GLOSSARY) {
      for (const s of t.also ?? []) {
        // A synonym is never an anchor of its own. (The one id that equals a
        // synonym, `conversation`, is the entry's own id, not a second anchor.)
        const slug = s.toLowerCase().replace(/\s+/g, '-');
        const matches = page.locator(`[id="${slug}"]`);
        await expect(matches, s).toHaveCount(t.id === slug ? 1 : 0);
        await expect(page.locator(`[id="${s}"]`), s).toHaveCount(t.id === s ? 1 : 0);
      }
    }
    // Entries without synonyms show no "also called" line.
    await expect(page.locator(entry('prompt')).locator('[data-gl-also]')).toHaveCount(0);
  });

  test('British and US spellings of one word show once', async ({ page }) => {
    await page.goto(PAGE);
    const also = await page.locator(entry('memory')).locator('[data-gl-also]').innerText();
    expect(also).toContain('personalization');
    expect(also).not.toContain('personalisation');
    expect(also).toContain('saved memory');
  });

  test('a guide link renders only when that guide is published', async ({ page, request }) => {
    await page.goto(PAGE);
    let linked = 0;
    let unlinked = 0;
    for (const t of GLOSSARY) {
      const link = page.locator(entry(t.id)).locator('[data-gl-guide]');
      const published = t.guide ? (await request.get(`/ai-guides/${t.guide}/`)).status() === 200 : false;
      if (published) {
        linked++;
        await expect(link, t.id).toHaveCount(1);
        await expect(link, t.id).toHaveAttribute('href', `/ai-guides/${t.guide}/`);
      } else {
        unlinked++;
        await expect(link, t.id).toHaveCount(0);
      }
    }
    // The two branches are both exercised today (some guides published, some not).
    expect(linked).toBeGreaterThan(0);
    expect(unlinked).toBeGreaterThan(0);
  });

  test('the six you need first lists exactly the first:true entries, each linking to its anchor', async ({ page }) => {
    await page.goto(PAGE);
    const wanted = GLOSSARY.filter((t) => t.first);
    expect(wanted).toHaveLength(6);
    const links = page.locator('[data-gl-first] a');
    await expect(links).toHaveCount(wanted.length);
    expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(wanted.map((t) => `#${t.id}`));
    await expect(links).toHaveText(wanted.map((t) => t.term));
  });

  test('works without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(PAGE);
    await expect(page.locator('[data-gl-entry]')).toHaveCount(GLOSSARY.length);
    await expect(page.locator('[data-gl-first] a')).toHaveCount(6);
    await ctx.close();
  });

  test('is listed on the hub under "Look something up"', async ({ page }) => {
    await page.goto('/ai-guides/');
    await expect(page.getByRole('heading', { name: 'Look something up' })).toBeVisible();
    await expect(page.locator('a[href="/ai-guides/glossary/"]').first()).toBeVisible();
  });
});
