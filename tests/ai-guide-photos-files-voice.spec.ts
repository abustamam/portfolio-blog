import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { ATTACH_APPS, ATTACH_EXAMPLES, ACCEPT_ORDER, allCells, lastChecked } from '../src/consts/guides/attachExamples';
import { UNCONFIRMED } from '../src/consts/guides/aiTools';

// /ai-guides/photos-files-voice/: the data file, the three cards, the matrix, links, phone width, JS off.
// Run after `bun run build`; Playwright serves the built site.

const PATH = '/ai-guides/photos-files-voice/';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const built = () => readFileSync(`${DIST}ai-guides/photos-files-voice/index.html`, 'utf8');

const onDomain = (url: string, domains: string[]) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' && domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
};

test.describe('photos-files-voice: data', () => {
  test('four apps, three cells each, every cell sourced on the vendor, dated, and unconfirmed cells say so', () => {
    expect(ATTACH_APPS.map((a) => a.id)).toEqual(['chatgpt', 'gemini', 'copilot', 'claude']);
    for (const a of ATTACH_APPS) expect(Object.keys(a.accepts).sort()).toEqual([...ACCEPT_ORDER].sort());
    for (const { app, key, fact } of allCells()) {
      const where = `${app.id}.${key}`;
      expect(onDomain(fact.source, app.domains), `${where} source ${fact.source}`).toBe(true);
      expect(fact.checked, where).toBe('2026-11-25');
      expect(fact.text.trim().length, where).toBeGreaterThan(0);
      if (!fact.confirmed) expect(fact.text, where).toBe(UNCONFIRMED);
      expect(fact.text, where).not.toMatch(/^no\b/i);
    }
    expect(lastChecked()).toBe('2026-11-25');
  });

  test('the cells the orchestrator confirmed are exactly the confirmed ones', () => {
    const unconfirmed = allCells().filter((c) => !c.fact.confirmed).map((c) => `${c.app.id}.${c.key}`);
    expect(unconfirmed.sort()).toEqual(['claude.file', 'claude.photo', 'copilot.file', 'copilot.photo']);
  });

  test('three cards: two with a check line, the voice card with none', () => {
    expect(ATTACH_EXAMPLES.map((e) => e.id)).toEqual(['letter', 'manual', 'voice']);
    expect(ATTACH_EXAMPLES.map((e) => e.check !== null)).toEqual([true, true, false]);
    expect(ATTACH_EXAMPLES[2].noCheck).toMatch(/nothing to verify/i);
  });
});

test.describe('photos-files-voice: page', () => {
  test('is built, in the start-from-zero group, in step order, and not a draft', async ({ page }) => {
    await page.goto('/ai-guides/');
    const ids = await page.locator('[data-hub-list="start"] [data-guide-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-guide-id')));
    const steps = await page
      .locator('[data-hub-list="start"] [data-guide-id]')
      .evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-step'))));
    expect(ids).toContain('photos-files-voice');
    expect(steps, ids.join(',')).toEqual([...steps].sort((a, b) => a - b));
    expect(await page.locator('[data-hub-group-heading="start"]').textContent()).toBe('Never used AI? Start from zero');
    await expect(page.locator('[data-guide-list] [data-guide-id="photos-files-voice"]')).toHaveCount(0);
  });

  test('three cards with the made-up document details, each with a marked check line', async ({ page }) => {
    await page.goto(PATH);
    const cards = page.locator('[data-ax-card]');
    await expect(cards).toHaveCount(3);
    const letter = cards.nth(0);
    for (const t of ['Riverbend Water District', 'Resident', '14 Alder Court', '$84.17', 'December 12', '0142']) {
      await expect(letter.locator('.ax-paper')).toContainText(t);
    }
    await expect(letter.locator('.ax-paper')).toContainText('(555)');
    await expect(cards.nth(1).locator('.ax-chip')).toContainText('12 pages');
    await expect(cards.nth(1).locator('[data-ax-answer]')).toContainText('E4');
    await expect(cards.nth(1).locator('[data-ax-answer]')).toContainText('page 9');
    await expect(cards.nth(2).locator('.ax-wave span').first()).toBeAttached();
    await expect(cards.nth(2).locator('[data-ax-question]')).toContainText('chicken thighs');

    await expect(page.locator('[data-ax-check="yes"]')).toHaveCount(2);
    await expect(page.locator('[data-ax-check="yes"]').first()).toContainText('Check this');
    await expect(cards.nth(2).locator('[data-ax-check="none"]')).toContainText('Nothing to verify');
  });

  test('the matrix shows every cell; unconfirmed cells read "Check the company\'s page" and link the source', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('[data-attach-table] tbody tr')).toHaveCount(4);
    await expect(page.locator('[data-attach-table] td')).toHaveCount(12);
    const unconfirmed = page.locator('[data-attach-table] td[data-confirmed="false"]');
    await expect(unconfirmed).toHaveCount(4);
    for (const td of await unconfirmed.all()) {
      await expect(td.locator('a')).toHaveText(UNCONFIRMED);
      expect(await td.locator('a').getAttribute('href')).toMatch(/^https:\/\//);
    }
    await expect(page.locator('[data-attach-table] tr[data-app="gemini"] td[data-accept="voice"]')).toContainText('Yes (Gemini Live)');
    await expect(page.locator('[data-last-checked]')).toHaveText('November 25, 2026');
    expect(await page.locator('[data-last-checked]').getAttribute('datetime')).toBe('2026-11-25');
    await expect(page.locator('[data-attach-table] td', { hasText: /^\s*No\b/ })).toHaveCount(0);
  });

  test('links to the four pages the issue lists', async ({ page }) => {
    await page.goto(PATH);
    for (const href of ['/ai-guides/never-paste/', '/ai-guides/when-ai-is-wrong/', '/ai-guides/usage-limits/', '/ai-guides/glossary/']) {
      await expect(page.locator(`article a[href="${href}"], main a[href="${href}"]`).first(), href).toBeAttached();
    }
  });

  test('defines its own terms and does not wrap them as glossary terms', () => {
    const html = built();
    for (const w of ['attach', 'upload', 'file', 'PDF', 'Voice mode', 'Dictation']) expect(html, w).toContain(`<strong>${w}</strong>`);
    expect(html).not.toMatch(/data-term="(attach|voice-mode)"/);
  });

  test('first use of the glossary terms it does not define itself is wrapped: chat and free plan', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('a.term[data-term="conversation"]').first()).toBeAttached();
    await expect(page.locator('a.term[data-term="plan"]').first()).toBeAttached();
  });

  test('American spelling and no exclamation marks', async ({ page }) => {
    await page.goto(PATH);
    const text = await page.locator('article').first().innerText();
    expect(text).not.toMatch(/organis|colour|summaris|personalis|neighbour|\bcentre\b/i);
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/\b\d{1,2} December\b/);
  });

  test('375px: no horizontal scroll, cards and matrix fit', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PATH);
    const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    expect(w.doc).toBeLessThanOrEqual(w.win);
    for (const el of await page.locator('[data-ax-card], [data-attach-table]').all()) {
      const box = await el.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(376);
    }
  });
});

test.describe('photos-files-voice: JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('all three cards, their check lines and the matrix are all there', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('[data-ax-card]')).toHaveCount(3);
    await expect(page.locator('[data-ax-check]')).toHaveCount(3);
    await expect(page.locator('[data-ax-check="yes"]').first()).toBeVisible();
    await expect(page.locator('[data-attach-table] td')).toHaveCount(12);
  });
});
