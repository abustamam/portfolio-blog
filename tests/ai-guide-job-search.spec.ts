import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { PROMPT_FIELDS, assemblePrompt } from '../src/utils/promptBuilder';
import {
  JOB_SEARCH_CHECK_LINES, JOB_SEARCH_PRESETS, TRACKER_COLUMNS,
} from '../src/consts/guides/jobSearchPresets';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-guides/job-search/';
const PROMPT_PAGE = '/ai-guides/prompt/';
const CSV_PATH = '/downloads/job-application-tracker.csv';
const B = '#job-search-builder';

const dist = (p: string) => readFileSync(`${DIST}${p.slice(1)}index.html`, 'utf8');
const article = (h: string) => h.slice(h.indexOf('<article'), h.indexOf('</article>'));
const text = (h: string) =>
  h
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

const field = (page: Page, f: string, root = B) => page.locator(`${root} [data-pb-field="${f}"]`);
const out = (page: Page) => page.locator(`${B} [data-pb-output]`);

test.describe('job-search presets', () => {
  test('three presets, each with all five parts and a Check line', () => {
    expect(JOB_SEARCH_PRESETS.map((p) => p.id)).toEqual(['tailor-resume', 'cover-letter', 'interview-practice']);
    for (const p of JOB_SEARCH_PRESETS) {
      for (const f of PROMPT_FIELDS) expect(p[f].trim(), `${p.id}.${f}`).not.toBe('');
    }
    // The résumé check asks for anything that is not in the original.
    expect(JOB_SEARCH_PRESETS[0].check).toMatch(/not in my original/);
  });
});

test.describe('job-search guide page', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('the builder shows the three presets and each fills the five fields', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator(`${B} [data-pb-chip]`)).toHaveCount(3);
    for (const p of JOB_SEARCH_PRESETS) {
      await page.locator(`${B} [data-pb-chip="${p.id}"]`).click();
      for (const f of PROMPT_FIELDS) await expect(field(page, f), `${p.id}.${f}`).toHaveValue(p[f]);
      await expect(out(page)).toContainText(`Check: ${p.check}`);
    }
    const checks = await page.locator(`${B} [data-pb-check]`).evaluateAll((bs) => bs.map((b) => b.getAttribute('data-pb-check')));
    expect(checks).toEqual(JOB_SEARCH_CHECK_LINES);
  });

  test('each section prompt is the preset, and its button loads it into the builder', async ({ page }) => {
    const pres = [...article(dist(PAGE)).matchAll(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) =>
      m[1].replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    );
    expect(pres).toEqual(JOB_SEARCH_PRESETS.map((p) => assemblePrompt(p)));

    await page.goto(PAGE);
    for (const p of [...JOB_SEARCH_PRESETS].reverse()) {
      await page.locator(`[data-prompt-fill="${p.id}"]`).click();
      await expect(field(page, 'task')).toHaveValue(p.task);
      await expect(field(page, 'situation')).toBeFocused();
    }
  });

  test("this page's draft and the prompt guide's draft stay apart", async ({ page }) => {
    await page.goto(PAGE);
    await field(page, 'task').fill('Job-search draft only.');
    await page.goto(PROMPT_PAGE);
    for (const f of PROMPT_FIELDS) await expect(field(page, f, '#prompt-builder')).toHaveValue('');
    await field(page, 'task', '#prompt-builder').fill('Prompt-guide draft only.');

    await page.goto(PAGE);
    await expect(field(page, 'task')).toHaveValue('Job-search draft only.');
    await page.goto(PROMPT_PAGE);
    await expect(field(page, 'task', '#prompt-builder')).toHaveValue('Prompt-guide draft only.');

    const drafts = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).drafts, GUIDE_STORE_KEY);
    expect(drafts['job-search'].task).toBe('Job-search draft only.');
    expect(drafts.prompt.task).toBe('Prompt-guide draft only.');
  });

  test('the CSV downloads and its header row is the columns listed on the page', async ({ page }) => {
    await page.goto(PAGE);
    const listed = await page.locator('[data-tracker-columns] tbody tr td:first-child').allInnerTexts();
    expect(listed).toEqual(TRACKER_COLUMNS.map((c) => c.name));

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator(`a[href="${CSV_PATH}"]`).click(),
    ]);
    expect(download.suggestedFilename()).toBe('job-application-tracker.csv');
    const csv = readFileSync((await download.path())!, 'utf8');
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    // Header only: no example rows, so no personal data.
    expect(lines).toHaveLength(1);
    expect(lines[0].split(',')).toEqual(listed);
  });

  test('the before-you-send list can be ticked', async ({ page }) => {
    await page.goto(PAGE);
    const boxes = page.locator('[data-before-send] input[type="checkbox"]');
    await expect(boxes).toHaveCount(4);
    for (const b of await boxes.all()) {
      await expect(b).toBeEnabled();
      await b.check();
      await expect(b).toBeChecked();
    }
    await expect(page.locator('[data-before-send]')).toContainText('No reference names or contact details');
  });

  test('zero network requests while using the page, nothing in the URL, storage only through guideStore', async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.locator(`${B} [data-pb-chip="tailor-resume"]`).click();
    await field(page, 'input').fill('My résumé: private-ish text, 2019 to now.');
    await page.locator(`${B} [data-pb-check="${JOB_SEARCH_CHECK_LINES[1]}"]`).click();
    await page.locator('[data-prompt-fill="cover-letter"]').click();
    await field(page, 'situation').pressSequentially('typed key by key');
    await page.locator(`${B} [data-pb-copy]`).click();
    await page.locator('[data-before-send] input[type="checkbox"]').first().check();
    await page.locator(`${B} [data-pb-clear]`).click();
    await field(page, 'task').fill('One more line.');
    expect(requests).toEqual([]);
    expect(page.url()).toBe(new URL(PAGE, page.url()).href);
    const keys = await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]);
    expect(keys).toEqual([[GUIDE_STORE_KEY], [], '']);
  });
});

test.describe('job-search copy and the free/paid line', () => {
  test('no reusable set-up on the page: no Gems, custom GPTs or saved assistants', () => {
    const t = text(dist(PAGE));
    for (const banned of [/\bGems?\b/i, /custom GPTs?/i, /saved assistants?/i, /master r[ée]sum[ée]/i]) {
      expect(t, String(banned)).not.toMatch(banned);
    }
  });

  test('examples are labelled as an illustration and name nobody', () => {
    const t = text(article(dist(PAGE)));
    expect(t).toContain('Illustration');
    expect(t).toContain('one invented person and one invented job');
    expect(t).toContain('PERSON-1');
  });

  test('the article links only to guides already published, and the never-paste guide', () => {
    const hrefs = [...article(dist(PAGE)).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toContain('/ai-guides/never-paste/');
    expect(hrefs).toContain(PROMPT_PAGE);
    for (const h of hrefs) expect(['/ai-guides/never-paste/', PROMPT_PAGE, CSV_PATH], h).toContain(h);
  });
});
