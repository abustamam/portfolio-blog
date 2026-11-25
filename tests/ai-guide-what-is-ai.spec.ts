import { test, expect } from '@playwright/test';
import {
  START, STEPS, STATIC_STEPS, ILLUSTRATION_NOTE, addWord, sentenceAt, otherPercent, skipsTop,
} from '../src/consts/guides/nextWord';

// /ai-guides/what-is-ai/: the next-word data, the stepper and the page.
// Run after `bun run build` (Playwright serves `astro preview` of the build).

const PAGE = '/ai-guides/what-is-ai/';
const FULL = 'I left my umbrella at home, so I got wet on the way home.';

test.describe('what-is-ai: data', () => {
  test('six steps, as the issue gives them, with the picked word among the candidates', () => {
    expect(STEPS.map((s) => s.picked)).toEqual(['wet', 'on', 'the', 'way', 'home', '.']);
    expect(STEPS.map((s) => s.candidates.map((c) => `${c.word} ${c.percent}`))).toEqual([
      ['wet 62', 'soaked 21', 'caught 9', 'a 5'],
      ['on 44', 'walking 23', '. 18', 'and 9'],
      ['the 71', 'my 22', 'our 4'],
      ['way 58', 'walk 24', 'bus 9', 'train 5'],
      ['to 49', 'home 38', 'back 8'],
      ['. 83', 'again 9', 'today 5'],
    ]);
    for (const s of STEPS) expect(s.candidates.map((c) => c.word)).toContain(s.picked);
  });

  test('percentages are listed high to low and never add past 100; the remainder is "everything else"', () => {
    for (const [i, s] of STEPS.entries()) {
      const pcts = s.candidates.map((c) => c.percent);
      expect(pcts, `step ${i + 1}`).toEqual([...pcts].sort((a, b) => b - a));
      const sum = pcts.reduce((a, b) => a + b, 0);
      expect(sum, `step ${i + 1}`).toBeLessThanOrEqual(100);
      expect(otherPercent(s)).toBe(100 - sum);
    }
    expect(STEPS.map(otherPercent)).toEqual([3, 6, 3, 4, 5, 3]);
  });

  test('only step 5 skips the most likely word, and it is the second choice, with a caption', () => {
    expect(STEPS.map(skipsTop)).toEqual([false, false, false, false, true, false]);
    expect(STEPS[4].candidates[1].word).toBe(STEPS[4].picked);
    expect(STEPS[4].caption).toMatch(/same question can get a different answer twice/);
    expect(STEPS.filter((s) => s.caption)).toHaveLength(1);
  });

  test('sentences build word by word, and a period attaches to the word before it', () => {
    expect(sentenceAt(0)).toBe(START);
    expect(sentenceAt(1)).toBe(`${START} wet`);
    expect(sentenceAt(5)).toBe('I left my umbrella at home, so I got wet on the way home');
    expect(sentenceAt(6)).toBe(FULL);
    expect(addWord('so I got wet', '.')).toBe('so I got wet.');
    expect(addWord('so I got', 'wet')).toBe('so I got wet');
    expect(STATIC_STEPS).toEqual([1, 3, 6]);
  });
});

test.describe('what-is-ai: page', () => {
  test('is on the hub in the "start from zero" group, ahead of the other guides', async ({ page }) => {
    await page.goto('/ai-guides/');
    await expect(page.locator('[data-hub-group-heading="start"]')).toHaveText('Never used AI? Start from zero');
    const start = page.locator('[data-hub-list="start"] [data-guide-id]');
    const ids = await start.evaluateAll((els) => els.map((e) => e.getAttribute('data-guide-id')));
    expect(ids).toContain('what-is-ai');
    const steps = await start.evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-step'))));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    const card = page.locator('[data-guide-card="what-is-ai"]');
    await expect(card).toContainText('What an AI chat app is');
    await expect(card).toContainText('Next-word stepper');
    await expect(page.locator('[data-hub-list="guides"] [data-guide-id="what-is-ai"]')).toHaveCount(0);
  });

  test('links the next guide, When AI gets it wrong and the glossary', async ({ page }) => {
    await page.goto(PAGE);
    for (const href of ['/ai-guides/first-ten-minutes/', '/ai-guides/when-ai-is-wrong/', '/ai-guides/glossary/']) {
      expect(await page.locator(`article a[href="${href}"]`).count(), href).toBeGreaterThan(0);
    }
  });

  test('wraps none of its own terms, and marks each other term once', async ({ page }) => {
    await page.goto(PAGE);
    const wrapped = await page.locator('article [data-term]').evaluateAll((els) => els.map((e) => e.textContent?.trim().toLowerCase()));
    for (const own of ['ai', 'chat app', 'chatbot', 'prompt', 'model', 'answer', 'response']) expect(wrapped).not.toContain(own);
    // "training data" and "LLM" are wrapped in the source too, but this page is the glossary's own
    // explanation of them, so the component renders them as plain text here.
    expect(wrapped).toEqual(expect.arrayContaining(['hallucination', 'memory']));
    expect(new Set(wrapped).size).toBe(wrapped.length);
    await expect(page.locator('article :is(h1,h2,h3,a,button,code) [data-term]')).toHaveCount(0);
  });

  test('voice: no hype words, no exclamation marks, no training talk above the call to action', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator('[data-guide] > article').innerText();
    expect(text).not.toMatch(/\b(?:unlock|powerful|magic|magical|game-changer|revolutionary)\b/i);
    expect(text).not.toContain('!');
    expect(text).not.toMatch(/\b(?:we|our|ours)\b/i);
    expect(text.replace(/training data/gi, '')).not.toMatch(/\b(?:tracks?|training|courses?|cohorts?)\b/i);
    // American spelling
    expect(text).not.toMatch(/\b(?:colour|organis|summaris|personalis|neighbour|memoris|favour)\w*/i);
  });

  test('375px: no horizontal scroll, with and without JavaScript', async ({ browser }) => {
    for (const javaScriptEnabled of [true, false]) {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, javaScriptEnabled, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(PAGE);
      if (javaScriptEnabled) {
        const next = page.locator('[data-nw-next]');
        for (let i = 0; i < STEPS.length; i++) await next.click();
      }
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `javaScriptEnabled=${javaScriptEnabled}`).toBeLessThanOrEqual(0);
      await ctx.close();
    }
  });
});

test.describe('what-is-ai: stepper', () => {
  test('adds one word per press and marks the pick; step 5 picks "home" with its caption; start again resets', async ({ page }) => {
    await page.goto(PAGE);
    const root = page.locator('[data-next-word]');
    await expect(root.locator('[data-nw-static]')).toBeHidden();
    await expect(root.locator('[data-nw-live]')).toBeVisible();
    const sentence = root.locator('[data-nw-sentence]');
    await expect(sentence).toHaveText(START);
    await expect(root.locator('[data-nw-step]:visible')).toHaveCount(0);

    const next = root.locator('[data-nw-next]');
    for (let n = 1; n <= STEPS.length; n++) {
      if (n === 1) await next.focus();
      await page.keyboard.press(n === 1 ? 'Enter' : 'Space');
      await expect(sentence).toHaveText(sentenceAt(n));
      const step = root.locator('[data-nw-step]:visible');
      await expect(step).toHaveCount(1);
      await expect(step).toHaveAttribute('data-nw-step', String(n));
      const picked = step.locator('[data-picked]');
      await expect(picked).toHaveCount(1);
      await expect(picked).toContainText(STEPS[n - 1].picked === '.' ? '. (period)' : STEPS[n - 1].picked);
      await expect(picked).toContainText('picked');
      await expect(step.locator('.nw__row')).toHaveCount(STEPS[n - 1].candidates.length);
      if (n === 5) await expect(step).toContainText('It does not always take the top choice');
      else await expect(step.locator('.nw__caption')).toHaveCount(0);
    }
    await expect(sentence).toHaveText(FULL);
    await expect(next).toBeHidden();

    const reset = root.locator('[data-nw-reset]');
    await expect(reset).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(sentence).toHaveText(START);
    await expect(root.locator('[data-nw-step]:visible')).toHaveCount(0);
    await expect(next).toBeFocused();
    await expect(reset).toBeHidden();
  });

  test('says the percentages are made up, and makes no network request', async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    const note = page.locator('[data-next-word] figcaption');
    await expect(note).toHaveText(ILLUSTRATION_NOTE);
    await expect(note).toContainText('made up');
    await expect(note).toContainText('not measured from a real model');
    await page.locator('[data-nw-next]').click();
    expect(requests).toEqual([]);
  });

  test('without JavaScript the sentence is shown at steps 1, 3 and 6, each with its bars', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(PAGE);
    const root = page.locator('[data-next-word]');
    await expect(root.locator('[data-nw-live]')).toBeHidden();
    const stages = root.locator('[data-nw-static] .nw__stage');
    await expect(stages).toHaveCount(3);
    for (const [i, n] of STATIC_STEPS.entries()) {
      const stage = stages.nth(i);
      await expect(stage.locator('.nw__sentence')).toHaveText(sentenceAt(n));
      await expect(stage.locator('.nw__row')).toHaveCount(STEPS[n - 1].candidates.length);
      await expect(stage.locator('.nw__row[data-picked]')).toContainText('picked');
      await expect(stage.locator('.nw__pct').first()).toHaveText(`${STEPS[n - 1].candidates[0].percent}%`);
    }
    await expect(root.locator('figcaption')).toContainText('made up');
    await ctx.close();
  });

  test('the bars are not the only signal: every percentage is written out', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('[data-nw-next]').click();
    const row = page.locator('[data-nw-step="1"] .nw__row').first();
    await expect(row.locator('.nw__pct')).toHaveText('62%');
    await expect(row.locator('.nw__fill')).toHaveAttribute('style', /width:62%/);
  });
});

test.describe('what-is-ai: search figure', () => {
  test('shows the question, three results and one chat answer, with the caption', async ({ page }) => {
    await page.goto(PAGE);
    const fig = page.locator('[data-search-figure]');
    await expect(fig).toContainText('What time does the pharmacy on Main Street close?');
    await expect(fig.locator('[data-search-result]')).toHaveCount(3);
    await expect(fig.locator('.nw-search__answer')).toHaveCount(1);
    await expect(fig).toContainText('Search finds pages someone wrote. Chat writes a new sentence, and nothing guarantees it is true.');
  });
});

test.describe('what-is-ai: dark mode', () => {
  test('the stepper is readable in dark mode', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(PAGE);
    await page.locator('[data-nw-next]').click();
    const bg = await page.locator('[data-next-word]').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
    await expect(page.locator('[data-nw-step="1"] .nw__row[data-picked]')).toBeVisible();
  });
});
