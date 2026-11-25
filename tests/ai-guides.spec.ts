import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { GUIDE_STORE_KEY, createGuideStore, parseGuideStore, type StorageLike } from '../src/utils/guideStore';

// Covers every guide found in dist/ai-guides/, so a new guide is tested with
// no edit here. Run after `bun run build`.

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SRC = fileURLToPath(new URL('../src/content/guides/', import.meta.url));
const HUB = '/ai-guides/';

/** Built guide pages, as paths like /ai-guides/never-paste/. */
const GUIDES = existsSync(`${DIST}ai-guides`)
  ? readdirSync(`${DIST}ai-guides`, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(`${DIST}ai-guides/${d.name}/index.html`))
      .map((d) => `/ai-guides/${d.name}/`)
  : [];

/** Published guides from the MDX frontmatter, in hub (step) order. */
function publishedFromSource() {
  return readdirSync(SRC)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const fm = readFileSync(SRC + f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      return {
        path: `/ai-guides/${f.replace(/\.mdx$/, '')}/`,
        step: Number(fm.match(/^step:\s*([\d.]+)/m)?.[1]),
        draft: /^draft:\s*true\s*$/m.test(fm),
      };
    })
    .filter((g) => !g.draft)
    .sort((a, b) => a.step - b.step || a.path.localeCompare(b.path))
    .map((g) => g.path);
}

const html = (path: string) => readFileSync(`${DIST}${path.slice(1)}index.html`, 'utf8');
const meta = (doc: string, prop: string) => doc.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`))?.[1];
const sitemap = () =>
  readdirSync(DIST)
    .filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .map((f) => readFileSync(DIST + f, 'utf8'))
    .join('');

function pngSize(buf: Buffer) {
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test.describe('free AI guides: build output', () => {
  test('dist has the published guides and nothing else', () => {
    const expected = publishedFromSource();
    expect(expected.length).toBeGreaterThan(0);
    expect([...GUIDES].sort()).toEqual([...expected].sort());
  });

  for (const path of [HUB, ...GUIDES]) {
    test(`${path} is indexed, in the sitemap and has its own 1200x630 card`, () => {
      const doc = html(path);
      expect(doc).not.toMatch(/<meta name="robots"[^>]*noindex/);
      expect(doc.match(/<title>([^<]*)<\/title>/)?.[1]).not.toContain('Hands-on AI cohort');
      expect(sitemap()).toContain(`<loc>https://bustamam.tech${path}</loc>`);

      const card = path === HUB ? 'guides' : `guides/${path.split('/')[2]}`;
      const image = `https://bustamam.tech/og/ai/${card}.png`;
      expect(meta(doc, 'og:image')).toBe(image);
      expect(meta(doc, 'twitter:image')).toBe(image);
      const png = readFileSync(`${DIST}og/ai/${card}.png`);
      expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
      expect(png.length).toBeLessThan(100_000);
    });
  }
});

test.describe('free AI guides: pages', () => {
  for (const path of GUIDES) {
    test(`${path} has one call to action and links the other guides`, async ({ page }) => {
      await page.goto(path);
      const cta = page.locator('[data-guide-cta]');
      await expect(cta).toHaveCount(1);
      await expect(cta.locator('a').first()).toHaveAttribute('href', '/ai-quiz/');
      await expect(cta.locator('a[href="/ai-training/"]')).toHaveCount(1);

      const more = page.locator('[data-more-guides]');
      await expect(more).toHaveCount(1);
      await expect(more).toContainText(/more free guides/i);
      await expect(more.locator(`a[href="${HUB}"]`)).toHaveCount(1);
      const others = publishedFromSource().filter((p) => p !== path);
      const links = await more.locator('ol a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(links).toEqual(others);
    });
  }

  test('the hub lists every published guide in step order, then the quiz and the training page', async ({ page }) => {
    await page.goto(HUB);
    const cards = await page.locator('[data-guide-card]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(cards).toEqual(publishedFromSource());
    await expect(page.locator('main a[href="/ai-quiz/"], .ai-shell a[href="/ai-quiz/"]').first()).toBeVisible();
    await expect(page.locator('.ai-shell a[href="/ai-training/"]').first()).toBeVisible();
  });

  for (const width of [375, 320]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of [HUB, ...GUIDES]) {
        await page.goto(path);
        const { scroll, client } = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(scroll, `${path} at ${width}px`).toBeLessThanOrEqual(client);
      }
    });
  }
});

test.describe('never-paste: one source for the guide and the cohort handout', () => {
  const steps = (page: Page) =>
    page.locator('article h2#make-a-file-safe-in-three-steps + ol').innerText();

  test('both pages show the same table and three steps; the handout stays unlisted', async ({ page }) => {
    await page.goto('/ai-cohort/never-paste/');
    const cohortTable = await page.locator('article table').innerHTML();
    const cohortSteps = await steps(page);
    await page.goto('/ai-guides/never-paste/');
    const guideTable = await page.locator('article table').innerHTML();
    const guideSteps = await steps(page);

    expect(cohortTable).toContain('Never paste');
    expect(cohortSteps).toContain('Keep the key yourself');
    expect(guideTable).toBe(cohortTable);
    expect(guideSteps).toBe(cohortSteps);

    const cohort = html('/ai-cohort/never-paste/');
    expect(cohort).toMatch(/<meta name="robots" content="noindex"/);
    expect(sitemap()).not.toContain('/ai-cohort/');
  });
});

/** In-memory Storage. Sharing one between two stores stands in for a reload. */
function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

test.describe('guideStore', () => {
  test('drafts, visited guides and the field survive a new store on the same storage', () => {
    const mem = memoryStorage();
    const a = createGuideStore(() => mem);
    expect(a.setDraft('prompt', { task: 'Weekly report' })).toBe(true);
    a.markVisited('never-paste');
    a.markVisited('prompt');
    a.markVisited('never-paste');
    a.setField('teacher');

    const b = createGuideStore(() => mem);
    expect(b.getDraft('prompt')).toEqual({ task: 'Weekly report' });
    expect(b.getVisited()).toEqual(['never-paste', 'prompt']);
    expect(b.hasVisited('prompt')).toBe(true);
    expect(b.getField()).toBe('teacher');
    expect([...mem.map.keys()]).toEqual([GUIDE_STORE_KEY]);

    b.clearDraft('prompt');
    b.clearVisited();
    b.setField(null);
    expect(a.getDraft('prompt')).toBeNull();
    expect(a.getVisited()).toEqual([]);
    expect(a.getField()).toBeNull();
    b.clearAll();
    expect(mem.map.size).toBe(0);
  });

  test('never throws when storage is missing or throws', () => {
    const boom = () => {
      throw new Error('SecurityError');
    };
    const throwing: StorageLike = { getItem: boom, setItem: boom, removeItem: boom };
    for (const s of [createGuideStore(() => null), createGuideStore(() => throwing), createGuideStore(boom)]) {
      expect(s.getDraft('prompt')).toBeNull();
      expect(s.setDraft('prompt', 'x')).toBe(false);
      expect(s.clearDraft('prompt')).toBe(false);
      expect(s.markVisited('never-paste')).toBe(false);
      expect(s.getVisited()).toEqual([]);
      expect(s.hasVisited('never-paste')).toBe(false);
      expect(s.clearVisited()).toBe(false);
      expect(s.setField('teacher')).toBe(false);
      expect(s.getField()).toBeNull();
      expect(s.clearAll()).toBe(false);
    }
  });

  test('unreadable or older data starts fresh', () => {
    const fresh = { v: 1, drafts: {}, visited: [], field: null };
    expect(parseGuideStore(null)).toEqual(fresh);
    expect(parseGuideStore('{not json')).toEqual(fresh);
    expect(parseGuideStore(JSON.stringify({ v: 0, visited: ['x'] }))).toEqual(fresh);
    expect(parseGuideStore(JSON.stringify({ v: 1, visited: ['a', 3], field: 7, drafts: [] }))).toEqual({ ...fresh, visited: ['a'] });
  });

  test('in the browser: the visit is remembered across a reload, with no cookies and no requests elsewhere', async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const offsite: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).origin !== origin) offsite.push(r.url());
    });
    await page.goto('/ai-guides/never-paste/');
    await page.reload();
    const stored = await page.evaluate((k) => localStorage.getItem(k), GUIDE_STORE_KEY);
    expect(parseGuideStore(stored).visited).toEqual(['never-paste']);
    expect(await context.cookies()).toEqual([]);
    expect(offsite).toEqual([]);
  });

  test('in the browser: the page works when localStorage throws', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { storageCalls: number };
      w.storageCalls = 0;
      const boom = () => {
        w.storageCalls++;
        throw new DOMException('blocked', 'SecurityError');
      };
      Storage.prototype.getItem = boom;
      Storage.prototype.setItem = boom;
      Storage.prototype.removeItem = boom;
    });
    let errors = 0;
    page.on('pageerror', () => errors++);
    const visit = async (path: string) => {
      errors = 0;
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      return { errors, calls: await page.evaluate(() => (window as unknown as { storageCalls: number }).storageCalls) };
    };
    // Control: the cohort handout has the same site chrome but no guideStore.
    // The site's theme and terminal scripts throw here today (outside this
    // feature); a guide page must not add any error of its own.
    const control = await visit('/ai-cohort/never-paste/');
    const guide = await visit('/ai-guides/never-paste/');
    await expect(page.locator('[data-guide-cta]')).toBeVisible();
    expect(guide.errors).toBe(control.errors);
    // The guide page did try storage (the visit), so the comparison means something.
    expect(guide.calls).toBeGreaterThan(control.calls);
  });
});
