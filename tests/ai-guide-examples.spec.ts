import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { EXAMPLE_CARDS, TIME_SAVED_FIGURE, cardText, toPresets, visibleCardIds } from '../src/consts/guides/examples';
import { FIELDS } from '../src/utils/startHere';
import { PROMPT_FIELDS } from '../src/utils/promptBuilder';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';

// "One weekly task, by profession" (#78). Run after `bun run build`: the page
// tests read dist/ through the preview server.

const PAGE = '/ai-guides/examples/';
const HUB = '/ai-guides/';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(`${DIST}ai-guides/examples/index.html`, 'utf8');
const text = html
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .replace(/ ([,.:])/g, '$1');

// Voice: the GuideCta at the bottom is the page's one call to action, and the
// site speaks as "I". Nothing above the CTA mentions the training, a course, a
// cohort or a track, or says "we"/"our"/"us". The five prompt parts on each card
// are in character (what that person would type), so they may say "we".
const COURSE_WORDS = /\b(?:tracks?|training|courses?|cohorts?)\b/i;
const WE_WORDS = /\b(?:we|our|ours|ourselves|us)\b/i;
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

const CARD_FIELDS = ['teacher', 'bookkeeper', 'office-admin', 'volunteer-coordinator', 'job-seeker'];
const card = (page: Page, id: string) => page.locator(`[data-ex-card="${id}"]`);
const pbField = (page: Page, f: string) => page.locator(`#examples-builder [data-pb-field="${f}"]`);

test.describe('example cards: data', () => {
  test('five cards, one for each of the five shared fields, all in FIELDS', () => {
    expect(EXAMPLE_CARDS.map((c) => c.field)).toEqual(CARD_FIELDS);
    const known = new Set<string>(FIELDS.map((f) => f.value));
    for (const c of EXAMPLE_CARDS) expect(known.has(c.field), c.field).toBe(true);
    expect(new Set(EXAMPLE_CARDS.map((c) => c.id)).size).toBe(5);
  });

  test('every card has all five prompt parts, its own check, before and after, and no participant', () => {
    for (const c of EXAMPLE_CARDS) {
      for (const f of PROMPT_FIELDS) expect(c[f].trim(), `${c.id}.${f}`).not.toBe('');
      for (const k of ['summary', 'youCheck', 'before', 'after'] as const) expect(c[k].trim(), `${c.id}.${k}`).not.toBe('');
      expect(c.before, c.id).not.toBe(c.after);
      expect('participant' in c, `${c.id}.participant`).toBe(false);
    }
  });

  test('the time-saved pattern catches figures and lets ordinary numbers through', () => {
    for (const bad of ['saves 2 hours', '3hrs a week', '1 hour', '15 minutes saved', '40%', '2-3 hours', '50 percent']) {
      expect(TIME_SAVED_FIGURE.test(bad), bad).toBe(true);
    }
    for (const ok of ['Under 150 words', '9 to 5', '3 Nov', '84.20', 'an hour of work']) {
      expect(TIME_SAVED_FIGURE.test(ok), ok).toBe(false);
    }
  });

  test('no card text has a time-saved figure (digit then hour, hrs, minutes saved or %)', () => {
    for (const c of EXAMPLE_CARDS) for (const t of cardText(c)) expect(t, c.id).not.toMatch(TIME_SAVED_FIGURE);
  });

  test('the built page has no time-saved figure anywhere', () => {
    expect(text).not.toMatch(TIME_SAVED_FIGURE);
  });

  test('no card string mentions the training, and only in-character prompt parts say "we"', () => {
    for (const c of EXAMPLE_CARDS) {
      for (const t of cardText(c)) expect(t.match(COURSE_WORDS)?.[0], `course word in ${c.id}`).toBeUndefined();
      for (const k of ['label', 'summary', 'youCheck', 'before', 'after'] as const) {
        expect(c[k].match(WE_WORDS)?.[0], `"we" in ${c.id}.${k}`).toBeUndefined();
      }
    }
  });

  test('presets carry each card\'s five parts under its id', () => {
    const presets = toPresets(EXAMPLE_CARDS);
    expect(presets.map((p) => p.id)).toEqual(EXAMPLE_CARDS.map((c) => c.id));
    presets.forEach((p, i) => {
      for (const f of PROMPT_FIELDS) expect(p[f]).toBe(EXAMPLE_CARDS[i][f]);
    });
  });

  test('a chosen field shows only its card; no choice or a field without a card shows all', () => {
    const all = EXAMPLE_CARDS.map((c) => c.id);
    for (const c of EXAMPLE_CARDS) expect(visibleCardIds(EXAMPLE_CARDS, c.field)).toEqual([c.id]);
    expect(visibleCardIds(EXAMPLE_CARDS, null)).toEqual(all);
    expect(visibleCardIds(EXAMPLE_CARDS, 'other')).toEqual(all);
  });
});

test.describe('example cards: built page', () => {
  test('the illustrations note is there, and the page holds no build how-to', () => {
    expect(text).toContain('These are illustrations I built from practice cases. They are not results from real participants.');
    for (const banned of ['Homework', 'Connect:', 'Build:', 'step by step', 'step-by-step', 'every week automatically']) {
      expect(text, banned).not.toContain(banned);
    }
  });

  test('no quiz link above the GuideCta; the missing-field line links the prompt guide', () => {
    const ctaAt = html.indexOf('data-guide-cta');
    expect(ctaAt).toBeGreaterThan(0);
    expect(html.slice(0, ctaAt)).not.toContain('/ai-quiz');
    expect(text).toContain("Your job isn't here? The same five parts work for any weekly task: the five-part prompt shows how.");
    expect(html).toMatch(/<a href="\/ai-guides\/prompt\/" data-ex-missing>the five-part prompt<\/a> shows how/);
  });

  test('the call-to-action line makes no promise about working without me', () => {
    expect(text).toContain('In the hands-on training I work through one task from your own week with you.');
    expect(text).not.toContain('until you can do it without me');
  });

  test('there is one builder with the cards as presets', () => {
    expect(html.match(/data-prompt-builder/g)).toHaveLength(1);
    expect(html).toContain('id="examples-builder"');
    expect(html).toContain('data-storage-key="examples"');
    for (const c of EXAMPLE_CARDS) {
      expect(html).toContain(`data-pb-chip="${c.id}"`);
      expect(html).toContain(`data-prompt-fill="${c.id}" data-prompt-target="examples-builder"`);
    }
  });
});

test.describe('example cards: in the browser', () => {
  test('the prose above the call to action has no course plug and no "we", outside in-character prompts', async ({ page }) => {
    await page.goto(PAGE);
    const raw = await page.evaluate(() =>
      [document.querySelector('[data-guide] > header'), document.querySelector('[data-guide] > article')]
        .map((el) => {
          if (!el) return '';
          const copy = el.cloneNode(true) as HTMLElement;
          copy.querySelectorAll('style, script, [data-guide-cta]').forEach((n) => n.remove());
          return copy.textContent ?? '';
        })
        .join('\n'),
    );
    let prose = squash(raw);
    for (const c of EXAMPLE_CARDS) for (const f of PROMPT_FIELDS) prose = prose.split(squash(c[f])).join(' ');
    expect(prose.length).toBeGreaterThan(1500);
    expect(prose.match(COURSE_WORDS)?.[0], 'course word above the CTA').toBeUndefined();
    expect(prose.match(WE_WORDS)?.[0], '"we" above the CTA').toBeUndefined();
    await expect(page.locator('[data-guide] > header a[href*="/ai-training"], [data-guide] > article a[href*="/ai-training"]')).toHaveCount(0);
    await expect(page.locator('[data-guide-cta] a[href="/ai-training/"]')).toHaveCount(1);
  });

  test('choosing a field shows only that card and survives a reload', async ({ page }) => {
    await page.goto(PAGE);
    for (const c of EXAMPLE_CARDS) await expect(card(page, c.id)).toBeVisible();
    const pick = EXAMPLE_CARDS[2];
    await page.locator(`[data-ex-field="${pick.field}"]`).click();
    await expect(page.locator(`[data-ex-field="${pick.field}"]`)).toHaveAttribute('aria-pressed', 'true');
    for (const c of EXAMPLE_CARDS) {
      if (c.id === pick.id) await expect(card(page, c.id)).toBeVisible();
      else await expect(card(page, c.id)).toBeHidden();
    }
    await page.reload();
    await expect(page.locator(`[data-ex-field="${pick.field}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, pick.id)).toBeVisible();
    await expect(card(page, EXAMPLE_CARDS[0].id)).toBeHidden();

    // Stored only through guideStore's one key, as its field.
    const stored = await page.evaluate((k) => ({ keys: Object.keys(localStorage), raw: localStorage.getItem(k) }), GUIDE_STORE_KEY);
    expect(stored.keys).toEqual([GUIDE_STORE_KEY]);
    expect(JSON.parse(stored.raw!).field).toBe(pick.field);

    await page.locator('[data-ex-all]').click();
    for (const c of EXAMPLE_CARDS) await expect(card(page, c.id)).toBeVisible();
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).field, GUIDE_STORE_KEY)).toBeNull();
  });

  test('a field saved on the hub that has no card here shows every card and is kept', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, drafts: {}, visited: [], field: 'other' })), GUIDE_STORE_KEY);
    await page.reload();
    for (const c of EXAMPLE_CARDS) await expect(card(page, c.id)).toBeVisible();
    await expect(page.locator('[data-ex-all]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).field, GUIDE_STORE_KEY)).toBe('other');
  });

  for (const c of EXAMPLE_CARDS) {
    test(`choosing ${c.field} here shows it pressed in the hub's Start Here`, async ({ page }) => {
      await page.goto(PAGE);
      await page.locator(`[data-ex-field="${c.field}"]`).click();
      await page.goto(HUB);
      await expect(page.locator(`[data-start-here] [data-field="${c.field}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-start-here] [aria-pressed="true"][data-field]')).toHaveCount(1);
    });
  }

  test('the toggle switches between before and after', async ({ page }) => {
    await page.goto(PAGE);
    for (const c of EXAMPLE_CARDS) {
      const el = card(page, c.id);
      await expect(el.locator('[data-ex-view="before"]')).toBeVisible();
      await expect(el.locator('[data-ex-view="after"]')).toBeHidden();
      await el.locator('[data-ex-show="after"]').click();
      await expect(el.locator('[data-ex-view="after"]')).toBeVisible();
      await expect(el.locator('[data-ex-view="after"]')).toContainText(c.after);
      await expect(el.locator('[data-ex-view="before"]')).toBeHidden();
      await expect(el.locator('[data-ex-show="after"]')).toHaveAttribute('aria-pressed', 'true');
      await el.locator('[data-ex-show="before"]').click();
      await expect(el.locator('[data-ex-view="before"]')).toContainText(c.before);
      await expect(el.locator('[data-ex-view="after"]')).toBeHidden();
    }
  });

  test('"Try this prompt" fills the builder\'s five fields with that card\'s parts and scrolls to it', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE);
    for (const c of EXAMPLE_CARDS) {
      await card(page, c.id).scrollIntoViewIfNeeded();
      await expect(page.locator('#examples-builder [data-pb-field="check"]')).not.toBeInViewport();
      await card(page, c.id).locator('[data-ex-try]').click();
      for (const f of PROMPT_FIELDS) await expect(pbField(page, f), `${c.id}.${f}`).toHaveValue(c[f]);
      await expect(pbField(page, 'situation')).toBeFocused();
      await expect(pbField(page, 'situation')).toBeInViewport();
    }
    // Saved under this builder's own key, not the prompt guide's.
    const drafts = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).drafts, GUIDE_STORE_KEY);
    expect(Object.keys(drafts)).toEqual(['examples']);
    expect(drafts.examples.task).toBe(EXAMPLE_CARDS.at(-1)!.task);
  });

  test('zero network requests and nothing in the URL while using the page', async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.locator('[data-ex-field="bookkeeper"]').click();
    await card(page, 'bookkeeper-unmatched').locator('[data-ex-show="after"]').click();
    await card(page, 'bookkeeper-unmatched').locator('[data-ex-try]').click();
    await pbField(page, 'input').fill('Something private-ish typed here');
    await page.locator('[data-ex-all]').click();
    await page.locator('[data-ex-field="teacher"]').click();
    await page.locator('#examples-builder [data-pb-clear]').click();
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    expect(page.url()).toBe(new URL(PAGE, page.url()).href);
  });

  test('no horizontal scroll at 375 px and 320 px, with a card open on After', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(PAGE);
      await card(page, EXAMPLE_CARDS[3].id).locator('[data-ex-show="after"]').click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('example cards: without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every card shows with both before and after, and the controls stay hidden', async ({ page }) => {
    await page.goto(PAGE);
    for (const c of EXAMPLE_CARDS) {
      await expect(card(page, c.id)).toBeVisible();
      await expect(card(page, c.id).locator('[data-ex-view="before"]')).toBeVisible();
      await expect(card(page, c.id).locator('[data-ex-view="after"]')).toBeVisible();
      await expect(card(page, c.id).locator('[data-ex-try]')).toBeHidden();
    }
    await expect(page.locator('[data-ex-filter]')).toBeHidden();
    await expect(page.locator('[data-ex-note]')).toBeVisible();
    await expect(page.locator('a[data-ex-missing][href="/ai-guides/prompt/"]')).toBeVisible();
  });
});
