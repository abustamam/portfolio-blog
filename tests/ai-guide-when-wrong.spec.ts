import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { MISTAKE_ROUNDS, MISTAKE_TYPES } from '../src/consts/guides/mistakeRounds';
import { missedTypes, newGame, nextRound, score, tap, wrongPartIndex } from '../src/utils/spotTheMistake';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';

// /ai-guides/when-ai-is-wrong/ and its "Spot the mistake" game. Run after `bun run build`.

const PATH = '/ai-guides/when-ai-is-wrong/';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const built = () => readFileSync(`${DIST}ai-guides/when-ai-is-wrong/index.html`, 'utf8');

test.describe('when-ai-is-wrong: rounds data', () => {
  test('five illustration rounds, one per mistake type, each with exactly one wrong part and no tool', () => {
    expect(MISTAKE_ROUNDS).toHaveLength(5);
    expect(MISTAKE_ROUNDS.map((r) => r.type).sort()).toEqual(MISTAKE_TYPES.map((t) => t.id).sort());
    for (const r of MISTAKE_ROUNDS) {
      expect(r.kind, r.id).toBe('illustration');
      expect('tool' in r && r.tool !== undefined, `${r.id} has a tool`).toBe(false);
      expect(r.parts.filter((p) => p.wrong), r.id).toHaveLength(1);
      expect(r.parts.length, r.id).toBeGreaterThanOrEqual(3);
    }
  });

  test('sources are short: a table of at most 8 rows or a passage of at most 120 words', () => {
    for (const r of MISTAKE_ROUNDS) {
      if (r.source.kind === 'table') {
        expect(r.source.rows.length, r.id).toBeLessThanOrEqual(8);
        for (const row of r.source.rows) expect(row.length, r.id).toBe(r.source.headers.length);
      } else {
        const words = r.source.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
        expect(words, r.id).toBeLessThanOrEqual(120);
      }
    }
  });

  test('people in the rounds are placeholders', () => {
    const text = JSON.stringify(MISTAKE_ROUNDS);
    expect(text).toMatch(/PERSON-\d/);
    // No vendor or tool named in any round.
    expect(text).not.toMatch(/ChatGPT|OpenAI|Claude|Anthropic|Gemini|Bard|Copilot|Google|Microsoft|Apple|Meta|Llama/i);
  });
});

test.describe('when-ai-is-wrong: game logic', () => {
  test('a perfect run scores 5 of 5 and misses nothing', () => {
    let s = newGame(MISTAKE_ROUNDS);
    for (const r of MISTAKE_ROUNDS) {
      const t = tap(s, MISTAKE_ROUNDS, wrongPartIndex(r));
      expect(t.result).toBe('found');
      s = nextRound(t.state, MISTAKE_ROUNDS);
    }
    expect(score(s)).toBe(5);
    expect(missedTypes(s, MISTAKE_ROUNDS)).toEqual([]);
  });

  test('a wrong first tap counts once, and the round is still solvable', () => {
    let s = newGame(MISTAKE_ROUNDS);
    const first = MISTAKE_ROUNDS[0];
    const right = first.parts.findIndex((p) => !p.wrong);
    const a = tap(s, MISTAKE_ROUNDS, right);
    expect(a.result).toBe('look-again');
    const b = tap(a.state, MISTAKE_ROUNDS, right);
    expect(b.result).toBe('look-again');
    // Next does nothing until the mistake is found.
    expect(nextRound(b.state, MISTAKE_ROUNDS).round).toBe(0);
    const c = tap(b.state, MISTAKE_ROUNDS, wrongPartIndex(first));
    expect(c.result).toBe('found');
    expect(tap(c.state, MISTAKE_ROUNDS, right).result).toBe('ignored');
    s = nextRound(c.state, MISTAKE_ROUNDS);
    for (const r of MISTAKE_ROUNDS.slice(1)) s = nextRound(tap(s, MISTAKE_ROUNDS, wrongPartIndex(r)).state, MISTAKE_ROUNDS);
    expect(score(s)).toBe(4);
    expect(missedTypes(s, MISTAKE_ROUNDS)).toEqual([first.type]);
  });
});

/** Click (or press, with `key`) through every round; `missFirst` taps a correct part first in that round. */
async function play(page: Page, opts: { missFirst?: number; key?: 'Enter' | ' ' } = {}) {
  for (let r = 0; r < MISTAKE_ROUNDS.length; r++) {
    const round = page.locator(`[data-round="${r}"]`);
    await expect(round).toBeVisible();
    const parts = round.locator('[data-part]');
    const act = async (i: number) => {
      const el = parts.nth(i);
      if (opts.key) {
        await el.focus();
        await page.keyboard.press(opts.key);
      } else await el.click();
    };
    if (opts.missFirst === r) {
      await act(MISTAKE_ROUNDS[r].parts.findIndex((p) => !p.wrong));
      await expect(round.locator('[data-feedback]')).toContainText(/look again/i);
      await expect(round.locator('[data-reveal]')).toBeHidden();
    }
    await act(wrongPartIndex(MISTAKE_ROUNDS[r]));
    const reveal = round.locator('[data-reveal]');
    await expect(reveal).toBeVisible();
    await expect(reveal).toContainText(MISTAKE_ROUNDS[r].check);
    const next = round.locator('[data-next]');
    if (opts.key) {
      // Focus moves to the explanation so it is read out, and Tab reaches Next.
      await expect(reveal).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(next).toBeFocused();
      await page.keyboard.press(opts.key);
    } else await next.click();
  }
  await expect(page.locator('[data-end]')).toBeVisible();
}

test.describe('when-ai-is-wrong: the page', () => {
  test('the illustrations line is visible before the first round', async ({ page }) => {
    await page.goto(PATH);
    const note = page.locator('[data-illustrations-note]');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/illustrations/i);
    await expect(note).toContainText(/not|none/i);
    const before = await page.evaluate(() => {
      const n = document.querySelector('[data-illustrations-note]')!;
      const r = document.querySelector('[data-round="0"]')!;
      return Boolean(n.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(before).toBe(true);
    const box = (await note.boundingBox())!;
    const first = (await page.locator('[data-round="0"]').boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(first.y);
  });

  test('the parts are buttons and only the first round shows at the start', async ({ page }) => {
    await page.goto(PATH);
    for (let r = 0; r < MISTAKE_ROUNDS.length; r++) {
      const parts = page.locator(`[data-round="${r}"] [data-part]`);
      await expect(parts).toHaveCount(MISTAKE_ROUNDS[r].parts.length);
      for (const tag of await parts.evaluateAll((els) => els.map((e) => `${e.tagName}:${e.getAttribute('type')}`)))
        expect(tag).toBe('BUTTON:button');
    }
    await expect(page.locator('[data-round]:visible')).toHaveCount(1);
    await expect(page.locator('[data-round="0"]')).toBeVisible();
  });

  test('a perfect run scores 5 of 5, and play again starts over', async ({ page }) => {
    await page.goto(PATH);
    await play(page);
    const end = page.locator('[data-end]');
    await expect(end.locator('[data-score]')).toHaveText('You found 5 of 5 on the first try.');
    await expect(end.locator('[data-missed]')).toBeHidden();
    await expect(end.locator('[data-perfect]')).toBeVisible();

    await end.locator('[data-restart]').click();
    await expect(end).toBeHidden();
    await expect(page.locator('[data-round="0"]')).toBeVisible();
    await expect(page.locator('[data-round="0"] [data-reveal]')).toBeHidden();
    await expect(page.locator('[data-round="0"] [data-part]:disabled')).toHaveCount(0);
    await play(page, { missFirst: 2 });
    await expect(end.locator('[data-score]')).toHaveText('You found 4 of 5 on the first try.');
  });

  test('one wrong first tap scores 4 of 5 and links that type\'s section', async ({ page }) => {
    await page.goto(PATH);
    await play(page, { missFirst: 1 });
    const end = page.locator('[data-end]');
    await expect(end.locator('[data-score]')).toHaveText('You found 4 of 5 on the first try.');
    const type = MISTAKE_TYPES.find((t) => t.id === MISTAKE_ROUNDS[1].type)!;
    const links = end.locator('[data-missed] a:visible');
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute('href', `#${type.anchor}`);
    await expect(links).toHaveText(type.label);
    await expect(page.locator(`article h3#${type.anchor}`)).toHaveCount(1);
  });

  test('every missed-type link points at a section on the page', async ({ page }) => {
    await page.goto(PATH);
    for (const t of MISTAKE_TYPES) await expect(page.locator(`article h3#${t.anchor}`), t.anchor).toHaveCount(1);
  });

  test('the game works by keyboard alone', async ({ page }) => {
    await page.goto(PATH);
    await play(page, { key: 'Enter', missFirst: 4 });
    await expect(page.locator('[data-end]')).toBeFocused();
    await expect(page.locator('[data-end] [data-score]')).toHaveText('You found 4 of 5 on the first try.');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-stm-next] a')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-restart]')).toBeFocused();
    await page.keyboard.press(' ');
    await expect(page.locator('[data-round="0"] [data-part]').first()).toBeFocused();
  });

  test('playing sends no network requests, changes no URL and saves nothing of its own', async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const before = await page.evaluate(() => ({ ...localStorage }));
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await play(page, { missFirst: 0 });
    await page.locator('[data-restart]').click();
    await play(page);
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    expect(page.url()).toBe(url);
    const after = await page.evaluate(() => ({ ...localStorage }));
    expect(after).toEqual(before);
    expect(Object.keys(after).every((k) => k === GUIDE_STORE_KEY)).toBe(true);
    expect(await page.evaluate(() => document.cookie)).toBe('');
  });
});

test.describe('when-ai-is-wrong: build output', () => {
  test('every real case has an outbound https link', async ({ page }) => {
    await page.goto(PATH);
    const cases = page.locator('article p:has-text("It has happened") + ul > li');
    expect(await cases.count()).toBeGreaterThanOrEqual(1);
    for (const href of await cases.evaluateAll((lis) =>
      lis.map((li) => Array.from(li.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '')),
    )) {
      expect(href.length).toBeGreaterThanOrEqual(1);
      for (const h of href) expect(h).toMatch(/^https:\/\/(?!bustamam\.tech)/);
    }
    // Every outbound link in the article is https.
    const outbound = await page
      .locator('article a[href^="http"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const h of outbound) expect(h).toMatch(/^https:\/\//);
  });

  test('"Build the check in" carries the owner\'s paragraph verbatim, between the mistake types and the checklist', () => {
    const OWNER =
      "I don't check every answer by hand any more. Over time I've set things up so the AI has to show where each claim came from, does its sums somewhere I can see them, and gets checked by a second pass before I trust it. None of that is magic, and you can start with the habits below today. Getting it to run on your own work takes some setting up, and that's what we do in the hands-on training.";
    // The build curls apostrophes; the words must match exactly.
    const doc = built().replace(/[\u2018\u2019]/g, "'");
    const paragraphs = [...doc.matchAll(/<p>([^<]*)<\/p>/g)].map((m) => m[1]);
    expect(paragraphs.filter((t) => t === OWNER)).toHaveLength(1);
    const at = (needle: string) => {
      const i = doc.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const lastType = at('id="wrong-arithmetic"');
    const section = at('id="build-the-check-in"');
    const owner = at(`<p>${OWNER}</p>`);
    const habits = doc.indexOf('<ul', owner);
    const checklist = at('id="the-checklist"');
    expect(lastType).toBeLessThan(section);
    expect(section).toBeLessThan(owner);
    // "the habits below": the habit list comes after the paragraph, still inside the section.
    expect(owner).toBeLessThan(habits);
    expect(habits).toBeLessThan(checklist);
  });

  test('the page does not include the hand-off template\'s "when it breaks" table', () => {
    const doc = built();
    expect(doc).not.toMatch(/when it breaks/i);
    expect(doc).not.toMatch(/Likely cause/i);
    expect(doc).not.toMatch(/Monthly 5-minute check/i);
    expect(doc).not.toMatch(/How my task works now/i);
  });
});
