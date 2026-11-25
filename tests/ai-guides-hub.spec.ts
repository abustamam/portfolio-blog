import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';
import { FIELDS, EXPERIENCE, orderGuides, recommend, shareText, canonicalShareUrl, byStep } from '../src/utils/startHere';

// The hub as the front door (#79). Run after `bun run build`: the page tests
// read dist/ through the preview server.

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SRC = fileURLToPath(new URL('../src/content/guides/', import.meta.url));

/** Published guides from the MDX frontmatter (same rule as the collection). */
const REAL = readdirSync(SRC)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const fm = readFileSync(SRC + f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    return {
      id: f.replace(/\.mdx$/, ''),
      step: Number(fm.match(/^step:\s*([\d.]+)/m)?.[1]),
      draft: /^draft:\s*true\s*$/m.test(fm),
    };
  })
  .filter((g) => !g.draft);

const ALL_IDS = ['never-paste', 'prompt', 'when-ai-is-wrong', 'which-tool', 'job-search', 'examples'];
const FULL = ALL_IDS.map((id, i) => ({ id, step: i + 1 }));
const ONLY_FIRST = [{ id: 'never-paste', step: 1 }];
const NO_FIRST = FULL.slice(1); // a hub where the safety guide is missing
const SHUFFLED = [FULL[3], FULL[0], FULL[5], FULL[1], FULL[4], FULL[2]];

const pairs = [null, ...FIELDS.map((f) => f.value)].flatMap((field) => [null, ...EXPERIENCE.map((e) => e.value)].map((experience) => ({ field, experience })));

test.describe('start here: pure ordering', () => {
  for (const [name, list] of [['the real list', REAL], ['all six guides', FULL], ['only never-paste', ONLY_FIRST], ['without never-paste', NO_FIRST], ['out of order', SHUFFLED]] as const) {
    test(`every answer pair returns a published guide (${name})`, () => {
      const ids = new Set(list.map((g) => g.id));
      expect(list.length).toBeGreaterThan(0);
      for (const a of pairs) {
        const ordered = orderGuides(a, list);
        expect(ordered.map((g) => g.id).sort()).toEqual([...ids].sort()); // nothing lost, nothing invented
        if (a.field || a.experience) expect(ids.has(recommend(a, list)!.id)).toBe(true);
        expect(ordered[0].id).toBe(a.field || a.experience ? recommend(a, list)!.id : byStep(list)[0].id);
      }
    });

    test(`no answers returns step order (${name})`, () => {
      expect(orderGuides({}, list).map((g) => g.id)).toEqual(byStep(list).map((g) => g.id));
      expect(orderGuides({ field: null, experience: null }, list)).toEqual(byStep(list));
      expect(recommend({}, list)).toBeNull();
    });
  }

  test('it recommends sensibly when the guide exists, and falls back when it does not', () => {
    expect(recommend({ experience: 'never' }, FULL)!.id).toBe('never-paste');
    expect(recommend({ field: 'job-search', experience: 'some' }, FULL)!.id).toBe('job-search');
    expect(recommend({ field: 'job-search', experience: 'never' }, FULL)!.id).toBe('never-paste'); // safety first
    expect(recommend({ experience: 'often' }, FULL)!.id).toBe('when-ai-is-wrong');
    // job-search is not published yet: fall back to the next preference, then to step order
    expect(recommend({ field: 'job-search', experience: 'some' }, ONLY_FIRST)!.id).toBe('never-paste');
    expect(recommend({ experience: 'never' }, NO_FIRST)!.id).toBe('prompt');
  });

  test('unknown answers are ignored rather than trusted', () => {
    expect(recommend({ field: 'astronaut', experience: 'wizard' }, FULL)).toBeNull();
    expect(orderGuides({ field: '__proto__' }, FULL)).toEqual(byStep(FULL));
  });

  test('share text is "title — line — canonical url" with no query or fragment', () => {
    const text = shareText('Never paste these', 'What to keep out of a chat.', 'https://bustamam.tech/ai-guides/never-paste/?utm_source=x&q=secret#top');
    expect(text).toBe('Never paste these — What to keep out of a chat. — https://bustamam.tech/ai-guides/never-paste/');
    expect(canonicalShareUrl('https://bustamam.tech/ai-guides/prompt/?a=1')).not.toContain('?');
  });
});

test.describe('links in', () => {
  test('the desktop header and the mobile drawer link /ai-guides/', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('nav[aria-label="Primary"] a[href="/ai-guides/"]')).toBeVisible();
    await page.setViewportSize({ width: 375, height: 800 });
    await page.locator('#site-nav-open').click();
    await expect(page.locator('nav[aria-label="Mobile primary"] a[href="/ai-guides/"]')).toBeVisible();
  });

  test('the homepage and /ai-training/ link the hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section a[href="/ai-guides/"]').first()).toBeVisible();
    await page.goto('/ai-training/');
    await expect(page.locator('.training-actions a[href="/ai-guides/"]')).toBeVisible();
    await expect(page.locator('.training-actions a[href="/ai-quiz/"]').first()).toBeVisible();
  });

  test('the quiz result screen links the hub, after the reserve link', async ({ page }) => {
    await page.goto('/ai-quiz/');
    const guides = page.locator('#result-guides');
    await expect(guides).toHaveAttribute('href', '/ai-guides/');
    const after = await page.evaluate(() => {
      const a = document.getElementById('result-reserve')!;
      const b = document.getElementById('result-guides')!;
      return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) && a.closest('section, div') === b.closest('section, div');
    });
    expect(after).toBe(true);
  });
});

test.describe('hub in the page', () => {
  test('answering the two questions moves the recommended guide to the top, and the answer survives a reload', async ({ page }) => {
    await page.goto('/ai-guides/');
    const cards = page.locator('[data-guide-list] > li');
    const stepOrder = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.guideId));
    expect(stepOrder).toEqual(byStep(REAL).map((g) => g.id)); // untouched until the reader answers
    await expect(page.locator('[data-recommended]')).toHaveCount(0);

    await page.locator('[data-start-here] [data-experience="never"]').click();
    const first = await cards.first().evaluate((e) => (e as HTMLElement).dataset.guideId);
    expect(first).toBe(recommend({ experience: 'never' }, REAL)!.id);
    await expect(page.locator('[data-recommended]')).toHaveCount(1);
    await expect(cards.first().locator('[data-start-badge]')).toBeVisible();
    await expect(cards).toHaveCount(REAL.length); // reorder, never drop

    await page.locator('[data-start-here] [data-field="job-search"]').click();
    await page.reload();
    await expect(page.locator('[data-start-here] [data-field="job-search"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-start-here] [data-experience="never"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await cards.first().evaluate((e) => (e as HTMLElement).dataset.guideId)).toBe(recommend({ field: 'job-search', experience: 'never' }, REAL)!.id);

    // tapping an answer again clears it, and with none the hub is back in step order
    await page.locator('[data-start-here] [data-field="job-search"]').click();
    await page.locator('[data-start-here] [data-experience="never"]').click();
    expect(await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.guideId))).toEqual(stepOrder);
  });

  test('a saved field from guideStore is used when there is one', async ({ page }) => {
    await page.addInitScript((key) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, drafts: {}, visited: [], field: 'job-search' }));
    }, GUIDE_STORE_KEY);
    await page.goto('/ai-guides/');
    await expect(page.locator('[data-start-here] [data-field="job-search"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-recommended]')).toHaveCount(1);
  });

  test('opening a guide ticks it on the hub, the tick survives a reload, and reset clears it', async ({ page }) => {
    const id = REAL[0].id;
    await page.goto('/ai-guides/');
    await expect(page.locator('[data-visited-tick]:visible')).toHaveCount(0);
    await expect(page.locator('[data-hub-reset]')).toBeHidden();

    await page.goto(`/ai-guides/${id}/`);
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), GUIDE_STORE_KEY)).toContain(id);
    await page.goto('/ai-guides/');
    const card = page.locator(`[data-guide-id="${id}"]`);
    await expect(card.locator('[data-visited-tick]')).toBeVisible();
    await page.reload();
    await expect(card.locator('[data-visited-tick]')).toBeVisible();

    await page.locator('[data-reset-progress]').click();
    await expect(page.locator('[data-visited-tick]:visible')).toHaveCount(0);
    await expect(page.locator('[data-hub-reset]')).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-visited-tick]:visible')).toHaveCount(0);
    // reset must not throw the whole store away
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).v, GUIDE_STORE_KEY)).toBe(1);
  });

  test('the hub still lists and links every published guide with JavaScript off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4321/ai-guides/');
    const hrefs = await page.locator('[data-guide-list] a[data-guide-card]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(byStep(REAL).map((g) => `/ai-guides/${g.id}/`));
    await expect(page.locator('[data-start-here]')).toBeHidden(); // needs JS, so it stays out of the way
    await expect(page.locator('[data-visited-tick]:visible')).toHaveCount(0);
    await expect(page.locator('a[href="/ai-quiz/"]')).toBeVisible();
    await ctx.close();
  });

  test('using the hub makes no network request, and nothing lands in the URL', async ({ page }) => {
    await page.addInitScript((key) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, drafts: {}, visited: ['never-paste'], field: null }));
    }, GUIDE_STORE_KEY);
    await page.goto('/ai-guides/');
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.locator('[data-start-here] [data-field="office"]').click();
    await page.locator('[data-start-here] [data-experience="some"]').click();
    await page.locator('[data-reset-progress]').click();
    await expect(page.locator('[data-visited-tick]:visible')).toHaveCount(0);
    expect(requests).toEqual([]);
    expect(new URL(page.url()).search).toBe('');
    expect(page.url()).not.toContain('#');
  });
});

test.describe('share', () => {
  test('without a share sheet it copies "title — one line — canonical link", no query string, and sends nothing', async ({ page }) => {
    const id = REAL[0].id;
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      (window as unknown as { __copied: string[] }).__copied = [];
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (t: string) => void (window as unknown as { __copied: string[] }).__copied.push(t) },
        configurable: true,
      });
    });
    await page.goto(`/ai-guides/${id}/?utm_source=whatsapp&who=me`);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await page.locator('[data-share-button]').click();
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    const title = await page.locator('[data-share-button]').getAttribute('data-share-title');
    const line = await page.locator('[data-share-button]').getAttribute('data-share-line');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(`/ai-guides/${id}/`);
    expect(copied[0]).toBe(`${title} — ${line} — ${canonical}`);
    expect(copied[0]).not.toContain('?');
    expect(copied[0]).not.toContain('utm_source');
    await expect(page.locator('[data-share-status]')).toContainText('Copied');
    expect(requests).toEqual([]);
  });

  test('with a share sheet it hands over the canonical link only', async ({ page }) => {
    const id = REAL[0].id;
    await page.addInitScript(() => {
      (window as unknown as { __shared: unknown[] }).__shared = [];
      Object.defineProperty(navigator, 'share', {
        value: async (d: unknown) => void (window as unknown as { __shared: unknown[] }).__shared.push(d),
        configurable: true,
      });
    });
    await page.goto(`/ai-guides/${id}/?x=1`);
    await page.locator('[data-share-button]').click();
    const shared = (await page.evaluate(() => (window as unknown as { __shared: { url: string }[] }).__shared))[0];
    expect(shared.url).toMatch(new RegExp(`/ai-guides/${id}/$`));
  });
});
