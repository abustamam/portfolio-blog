import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';
import { FIELDS, EXPERIENCE, recommend, shareText, canonicalShareUrl, byStep, groupGuides, startPath, nextUnread } from '../src/utils/startHere';

// The hub as the front door (#79). Run after `bun run build`: the page tests
// read dist/ through the preview server.

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SRC = fileURLToPath(new URL('../src/content/guides/', import.meta.url));

type Group = 'start' | 'guides' | 'reference';
const GROUP_KEYS: Group[] = ['start', 'guides', 'reference'];
const HEADINGS: Record<Group, string> = { start: 'Never used AI? Start from zero', guides: 'Get better answers', reference: 'Look something up' };
const SECTION_IDS: Record<Group, string> = { start: 'start-from-zero', guides: 'guides', reference: 'look-something-up' };

/** Published guides from the MDX frontmatter (same rule as the collection), with their hub group. */
const REAL = readdirSync(SRC)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const fm = readFileSync(SRC + f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    return {
      id: f.replace(/\.mdx$/, ''),
      step: Number(fm.match(/^step:\s*([\d.]+)/m)?.[1]),
      group: (fm.match(/^group:\s*['"]?(\w+)/m)?.[1] ?? 'guides') as Group,
      draft: /^draft:\s*true\s*$/m.test(fm),
    };
  })
  .filter((g) => !g.draft);

/** The published guides per hub list. */
const LISTS: Record<Group, typeof REAL> = {
  start: REAL.filter((g) => g.group === 'start'),
  guides: REAL.filter((g) => g.group === 'guides'),
  reference: REAL.filter((g) => g.group === 'reference'),
};
/** The groups that have at least one published guide, in hub order. */
const PRESENT = GROUP_KEYS.filter((k) => LISTS[k].length > 0);

const ALL_IDS = ['never-paste', 'prompt', 'when-ai-is-wrong', 'which-tool', 'job-search', 'examples'];
const FULL = ALL_IDS.map((id, i) => ({ id, step: i + 1 }));
const ONLY_FIRST = [{ id: 'never-paste', step: 1 }];
const NO_FIRST = FULL.slice(1); // a hub where the safety guide is missing
const SHUFFLED = [FULL[3], FULL[0], FULL[5], FULL[1], FULL[4], FULL[2]];

const pairs = [null, ...FIELDS.map((f) => f.value)].flatMap((field) => [null, ...EXPERIENCE.map((e) => e.value)].map((experience) => ({ field, experience })));

test.describe('start here: the path', () => {
  const hub = [
    { id: 'what-is-ai', step: 0.1, group: 'start' as const },
    { id: 'first-ten-minutes', step: 0.2, group: 'start' as const },
    ...FULL.map((g) => ({ ...g, group: 'guides' as const })),
    { id: 'glossary', step: 90, group: 'reference' as const },
  ];
  const ids = (a: Parameters<typeof startPath>[0]) => startPath(a, hub).map((g) => g.id);

  test('"never" starts from zero: the basics first, then safety', () => {
    expect(ids({ experience: 'never' })).toEqual(['what-is-ai', 'first-ten-minutes', 'never-paste']);
  });
  test('a field with its own guide leads, then the experience preference', () => {
    expect(ids({ field: 'volunteer-coordinator', experience: 'some' })).toEqual(['examples', 'prompt', 'when-ai-is-wrong']);
    expect(ids({ field: 'job-seeker', experience: 'often' })).toEqual(['job-search', 'examples', 'when-ai-is-wrong']);
  });
  test('someone who already uses AI is not sent back to the start set, and reference guides never fill a path', () => {
    for (const experience of ['some', 'often'] as const) {
      for (const f of FIELDS) {
        const path = startPath({ field: f.value, experience }, hub);
        expect(path.some((g) => g.group === 'start')).toBe(false);
        expect(path.some((g) => g.group === 'reference')).toBe(false);
      }
    }
  });
  test('every answer pair gives up to three distinct published guides, led by the recommendation', () => {
    for (const list of [hub, REAL, FULL, ONLY_FIRST, NO_FIRST, SHUFFLED]) {
      const published = new Set(list.map((g) => g.id));
      for (const a of pairs) {
        const path = startPath(a, list).map((g) => g.id);
        if (!a.field && !a.experience) {
          expect(path).toEqual([]);
          continue;
        }
        expect(path.length).toBe(Math.min(3, list.length));
        expect(new Set(path).size).toBe(path.length);
        for (const id of path) expect(published.has(id)).toBe(true);
        expect(path[0]).toBe(recommend(a, list)!.id);
      }
    }
  });
  test('the next guide is the first unread one on the path', () => {
    expect(nextUnread(['a', 'b', 'c'], [])).toBe('a');
    expect(nextUnread(['a', 'b', 'c'], ['a', 'x'])).toBe('b');
    expect(nextUnread(['a', 'b', 'c'], ['b'])).toBe('a');
    expect(nextUnread(['a', 'b', 'c'], ['c', 'a', 'b'])).toBeNull();
    expect(nextUnread([], [])).toBeNull();
  });
  test('the "see all the guides" links go to the All guides heading', async ({ page }) => {
    await page.goto('/ai-guides/');
    await expect(page.locator('[data-start-here] .start-here__hint a')).toHaveAttribute('href', '#all-guides');
    await expect(page.locator('h2#all-guides')).toHaveText('All guides');
    // the heading comes before every list
    const before = await page.evaluate(() => {
      const h = document.getElementById('all-guides')!;
      return Array.from(document.querySelectorAll('[data-hub-list]')).every((ol) => !!(h.compareDocumentPosition(ol) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(before).toBe(true);
  });
});

test.describe('start here: pure ordering', () => {
  for (const [name, list] of [['the real list', REAL], ['all six guides', FULL], ['only never-paste', ONLY_FIRST], ['without never-paste', NO_FIRST], ['out of order', SHUFFLED]] as const) {
    test(`every answer pair returns a published guide (${name})`, () => {
      const ids = new Set(list.map((g) => g.id));
      expect(list.length).toBeGreaterThan(0);
      for (const a of pairs) {
        if (a.field || a.experience) expect(ids.has(recommend(a, list)!.id)).toBe(true);
        else expect(recommend(a, list)).toBeNull();
      }
    });

    test(`no answers recommends nothing (${name})`, () => {
      expect(startPath({}, list)).toEqual([]);
      expect(startPath({ field: null, experience: null }, list)).toEqual([]);
      expect(recommend({}, list)).toBeNull();
    });
  }

  test('it recommends sensibly when the guide exists, and falls back when it does not', () => {
    expect(recommend({ experience: 'never' }, FULL)!.id).toBe('never-paste');
    expect(recommend({ field: 'job-seeker', experience: 'some' }, FULL)!.id).toBe('job-search');
    expect(recommend({ field: 'job-seeker', experience: 'never' }, FULL)!.id).toBe('never-paste'); // safety first
    expect(recommend({ experience: 'often' }, FULL)!.id).toBe('when-ai-is-wrong');
    // the job-search guide is not published yet: fall back to the next preference, then to step order
    expect(recommend({ field: 'job-seeker', experience: 'some' }, ONLY_FIRST)!.id).toBe('never-paste');
    expect(recommend({ experience: 'never' }, NO_FIRST)!.id).toBe('prompt');
  });

  test('never resolves to what-is-ai when it is published, and to never-paste when it is not', () => {
    const withStart = [{ id: 'what-is-ai', step: 0.1 }, ...FULL];
    expect(recommend({ experience: 'never' }, withStart)!.id).toBe('what-is-ai');
    expect(recommend({ field: 'job-seeker', experience: 'never' }, withStart)!.id).toBe('what-is-ai');
    expect(recommend({ experience: 'never' }, FULL)!.id).toBe('never-paste');
    expect(recommend({ experience: 'some' }, withStart)!.id).toBe('prompt'); // only "never" is sent to the start set
  });

  test('the hub groups guides: start, guides, reference, each in step order', () => {
    const list = [
      { id: 'r2', step: 8, group: 'reference' as const },
      { id: 'g2', step: 2, group: 'guides' as const },
      { id: 's2', step: 0.5, group: 'start' as const },
      { id: 'g1', step: 1, group: 'guides' as const },
      { id: 's1', step: 0.1, group: 'start' as const },
      { id: 'r1', step: 3, group: 'reference' as const },
    ];
    const g = groupGuides(list);
    expect(g.start.map((x) => x.id)).toEqual(['s1', 's2']);
    expect(g.guides.map((x) => x.id)).toEqual(['g1', 'g2']);
    expect(g.reference.map((x) => x.id)).toEqual(['r1', 'r2']);
    expect(groupGuides([{ id: 'a', step: 1, group: 'guides' as const }]).start).toEqual([]);
  });

  test('the field values are the vocabulary the examples page (#78) saves', () => {
    expect(FIELDS.map((f) => f.value)).toEqual(['teacher', 'bookkeeper', 'office-admin', 'volunteer-coordinator', 'job-seeker', 'other']);
    expect(recommend({ field: 'teacher' }, FULL)!.id).toBe('examples');
    expect(recommend({ field: 'volunteer-coordinator' }, FULL)!.id).toBe('examples');
    expect(recommend({ field: 'other' }, FULL)!.id).toBe('never-paste'); // no field guide: step order
  });

  test('unknown answers are ignored rather than trusted', () => {
    expect(recommend({ field: 'astronaut', experience: 'wizard' }, FULL)).toBeNull();
    expect(startPath({ field: '__proto__' }, FULL)).toEqual([]);
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
  test('the hub renders exactly the lists whose group has published guides, in order start, guides, reference', async ({ page }) => {
    await page.goto('/ai-guides/');
    const rendered = await page.locator('[data-hub-list]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.hubList));
    expect(rendered).toEqual(PRESENT);
    for (const key of GROUP_KEYS) {
      const list = page.locator(`ol.hub-list#${SECTION_IDS[key]}[data-hub-list="${key}"]`);
      const heading = page.locator(`[data-hub-group-heading="${key}"]`);
      if (!LISTS[key].length) {
        await expect(list).toHaveCount(0);
        await expect(heading).toHaveCount(0);
        continue;
      }
      await expect(list).toHaveCount(1);
      await expect(heading).toHaveText(HEADINGS[key]);
      // the heading sits directly before its list
      expect(await heading.evaluate((h) => (h.nextElementSibling as HTMLElement | null)?.dataset.hubList)).toBe(key);
    }
    // only the guides list is the one the Start here questions are documented against
    await expect(page.locator('[data-guide-list]')).toHaveCount(LISTS.guides.length ? 1 : 0);
    await expect(page.locator('[data-guide-list]')).toHaveAttribute('data-hub-list', 'guides');
    if (!LISTS.start.length) await expect(page.getByRole('heading', { name: 'Never used AI? Start from zero' })).toHaveCount(0);
    if (!LISTS.reference.length) await expect(page.getByRole('heading', { name: 'Look something up' })).toHaveCount(0);
  });

  /** Guide ids per list as the page shows them now; an absent list is []. */
  const shownOrder = (page: Page) =>
    page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, Array.from(document.querySelectorAll<HTMLElement>(`[data-hub-list="${k}"] > li`)).map((li) => li.dataset.guideId)])), GROUP_KEYS);
  const stepOrderPerList = () => Object.fromEntries(GROUP_KEYS.map((k) => [k, byStep(LISTS[k]).map((g) => g.id)]));

  const box = (page: Page) => page.locator('[data-start-here]');
  const pathIds = (page: Page) => page.locator('[data-start-path] > li').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.pathId));

  test('answers show the path inside the Start here box, the lists below never move, and the box folds once both are in', async ({ page }) => {
    await page.goto('/ai-guides/');
    const stepOrder = await shownOrder(page);
    expect(stepOrder).toEqual(stepOrderPerList());
    await expect(box(page).locator('[data-start-path-wrap]')).toBeHidden();
    await expect(page.locator('[data-on-path]')).toHaveCount(0);

    await box(page).locator('[data-experience="never"]').click();
    expect(await pathIds(page)).toEqual(startPath({ experience: 'never' }, REAL).map((g) => g.id));
    await expect(box(page).locator('[data-start-ask]')).toBeVisible(); // one answer: the questions stay open
    expect(await shownOrder(page)).toEqual(stepOrder);

    await box(page).locator('[data-field="volunteer-coordinator"]').click();
    const want = startPath({ field: 'volunteer-coordinator', experience: 'never' }, REAL).map((g) => g.id);
    expect(await pathIds(page)).toEqual(want);
    await expect(box(page).locator('[data-start-ask]')).toBeHidden();
    await expect(box(page).locator('[data-start-summary]')).toContainText('Running volunteers or a nonprofit');
    await expect(box(page).locator('[data-start-path-title]')).toBeFocused();
    await expect(box(page).locator('[data-start-path-title]')).toHaveText('Your first three');
    await expect(box(page).locator('[data-start-path] > li[data-next]')).toHaveAttribute('data-path-id', want[0]);
    await expect(page.locator('[data-on-path]')).toHaveCount(want.length);
    for (const id of want) await expect(page.locator(`[data-hub-list] [data-guide-id="${id}"] [data-start-badge]`)).toBeVisible();
    expect(await shownOrder(page)).toEqual(stepOrder); // never reordered
    await expect(page.locator('[data-hub-list] > li')).toHaveCount(REAL.length);

    // the answers and the fold survive a reload
    await page.reload();
    await expect(box(page).locator('[data-start-ask]')).toBeHidden();
    expect(await pathIds(page)).toEqual(want);

    // Change opens the questions again; a new answer folds them with a new path
    await box(page).locator('[data-start-change]').click();
    await expect(box(page).locator('[data-start-ask]')).toBeVisible();
    await expect(box(page).locator('[data-field="volunteer-coordinator"]')).toBeFocused();
    await box(page).locator('[data-experience="often"]').click();
    await expect(box(page).locator('[data-start-ask]')).toBeHidden();
    expect(await pathIds(page)).toEqual(startPath({ field: 'volunteer-coordinator', experience: 'often' }, REAL).map((g) => g.id));

    // clearing both answers removes the path and every tag
    await box(page).locator('[data-start-change]').click();
    await box(page).locator('[data-field="volunteer-coordinator"]').click();
    await box(page).locator('[data-experience="often"]').click();
    await expect(box(page).locator('[data-start-path-wrap]')).toBeHidden();
    await expect(page.locator('[data-on-path]')).toHaveCount(0);
    expect(await shownOrder(page)).toEqual(stepOrder);
  });

  test('a return visit leads with the next unread guide on the path', async ({ page }) => {
    const want = startPath({ field: 'office-admin', experience: 'some' }, REAL).map((g) => g.id);
    await page.addInitScript(([key, first]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, drafts: { 'start-here': { experience: 'some' } }, visited: [first], field: 'office-admin' }));
    }, [GUIDE_STORE_KEY, want[0]] as const);
    await page.goto('/ai-guides/');
    await expect(box(page).locator('[data-start-ask]')).toBeHidden();
    await expect(box(page).locator('[data-start-path-title]')).toHaveText('Pick up where you left off');
    await expect(box(page).locator('[data-start-status]')).toContainText('1 of 3 read');
    await expect(box(page).locator(`[data-path-id="${want[0]}"]`)).toHaveAttribute('data-read', '');
    await expect(box(page).locator('[data-start-path] > li[data-next]')).toHaveAttribute('data-path-id', want[1]);
    // the path card links the guide
    await expect(box(page).locator(`[data-path-id="${want[1]}"] a`)).toHaveAttribute('href', `/ai-guides/${want[1]}/`);

    // reset clears the read marks on the path too
    await page.locator('[data-reset-progress]').click();
    await expect(box(page).locator('[data-start-path-title]')).toHaveText('Your first three');
    await expect(box(page).locator('[data-start-path] > li[data-next]')).toHaveAttribute('data-path-id', want[0]);
  });

  test('reading the whole path says so', async ({ page }) => {
    const want = startPath({ field: 'teacher', experience: 'often' }, REAL).map((g) => g.id);
    await page.addInitScript(([key, read]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, drafts: { 'start-here': { experience: 'often' } }, visited: read, field: 'teacher' }));
    }, [GUIDE_STORE_KEY, want] as const);
    await page.goto('/ai-guides/');
    await expect(box(page).locator('[data-start-path-title]')).toHaveText("You've read all three");
    await expect(box(page).locator('[data-start-path] > li[data-next]')).toHaveCount(0);
  });

  test('at 375px the answered box fits and the first path card is on the first screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript((key) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, drafts: { 'start-here': { experience: 'some' } }, visited: [], field: 'volunteer-coordinator' }));
    }, GUIDE_STORE_KEY);
    await page.goto('/ai-guides/');
    const first = box(page).locator('[data-start-path] > li').first();
    await expect(first).toBeVisible();
    const top = await first.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(812);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });

  test('a saved field from guideStore is used when there is one', async ({ page }) => {
    await page.addInitScript((key) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ v: 1, drafts: {}, visited: [], field: 'job-seeker' }));
    }, GUIDE_STORE_KEY);
    await page.goto('/ai-guides/');
    await expect(page.locator('[data-start-here] [data-field="job-seeker"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-on-path]')).toHaveCount(3);
    await expect(page.locator('[data-start-here] [data-start-ask]')).toBeVisible(); // experience not answered yet
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

  test('the hub still lists and links every published guide with JavaScript off', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await ctx.newPage();
    await page.goto('/ai-guides/');
    for (const key of GROUP_KEYS) {
      const hrefs = await page.locator(`[data-hub-list="${key}"] a[data-guide-card]`).evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(byStep(LISTS[key]).map((g) => `/ai-guides/${g.id}/`)); // empty when the group has no guides
    }
    const cardLinks = page.locator('[data-hub-list] a[data-guide-card]');
    expect(await cardLinks.count()).toBe(REAL.length); // every published guide, across all three lists
    for (const link of await cardLinks.all()) await expect(link).toBeVisible(); // listed and actually shown, not just in the markup
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
    await page.locator('[data-start-here] [data-field="office-admin"]').click();
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
    const copiedLink = copied[0].slice(copied[0].lastIndexOf(' — ') + 3);
    expect(copiedLink).toBe(canonical);
    expect(new URL(copiedLink).search).toBe('');
    expect(copiedLink).not.toContain('?');
    expect(copied[0]).not.toContain('utm_source');
    expect(copied[0]).not.toContain('who=me');
    expect(copied[0].endsWith(`/ai-guides/${id}/`)).toBe(true);
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
