import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { PROMPT_FIELDS, assemblePrompt } from '../src/utils/promptBuilder';
import {
  FIND_TITLES, JOB_SEARCH_CHECK_LINES, JOB_SEARCH_PRESETS, MAKE_IT_BETTER, TAILOR_RESUME, TRACKER_COLUMNS,
} from '../src/consts/guides/jobSearchPresets';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-guides/job-search/';
const PROMPT_PAGE = '/ai-guides/prompt/';
const WRONG_PAGE = '/ai-guides/when-ai-is-wrong/';
const CSV_PATH = '/downloads/job-application-tracker.csv';
const B = '#job-search-builder';

const dist = (p: string) => readFileSync(`${DIST}${p.slice(1)}index.html`, 'utf8');
const article = (h: string) => h.slice(h.indexOf('<article'), h.indexOf('</article>'));
// The guide's own words: header, article and share button, up to (not including) the GuideCta.
const prose = (h: string) => h.slice(h.indexOf('<div class="ai-shell"'), h.lastIndexOf('<', h.indexOf('data-guide-cta')));
const metaDescription = (h: string) => h.match(/<meta name="description" content="([^"]*)"/)![1];
const text = (h: string) =>
  h
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

// Prose with curly apostrophes made straight, for matching sentences.
const plain = (h: string) => text(h).replace(/’/g, "'").trim();

const field = (page: Page, f: string, root = B) => page.locator(`${root} [data-pb-field="${f}"]`);
const out = (page: Page) => page.locator(`${B} [data-pb-output]`);

test.describe('job-search presets', () => {
  test('four presets, each with all five parts and a Check line', () => {
    expect(JOB_SEARCH_PRESETS.map((p) => p.id)).toEqual(['find-titles', 'tailor-resume', 'cover-letter', 'interview-practice']);
    for (const p of JOB_SEARCH_PRESETS) {
      for (const f of PROMPT_FIELDS) expect(p[f].trim(), `${p.id}.${f}`).not.toBe('');
    }
    // The résumé check asks for anything that is not in the original.
    expect(TAILOR_RESUME.check).toMatch(/not in my original/);
  });

  test('the search preset asks for titles and keywords from my experience, leaves the searching to me, and checks for stretches', () => {
    expect(FIND_TITLES.label).toBe('Find job titles to search for');
    expect(FIND_TITLES.task).toMatch(/job titles I could search for/);
    expect(FIND_TITLES.task).toMatch(/keywords that postings for that title/);
    expect(FIND_TITLES.task).toMatch(/Do not look up or list open jobs\. I will search the job boards myself\./);
    expect(FIND_TITLES.input).toMatch(/^My experience: /);
    expect(FIND_TITLES.check).toMatch(/which titles are a stretch for me and why/);
  });
});

test.describe('job-search guide page', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('the builder shows the four presets, the search one first, and each fills the five fields', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator(`${B} [data-pb-chip]`)).toHaveCount(4);
    await expect(page.locator(`${B} [data-pb-chip="find-titles"]`)).toHaveText(FIND_TITLES.label);
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
    // The "make it better" starting point comes first, then the four full prompts (the search one first).
    expect(pres).toEqual([MAKE_IT_BETTER, ...JOB_SEARCH_PRESETS.map((p) => assemblePrompt(p))]);

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
    // The site header's wordmark keeps its own sessionStorage flag from page load; the guide must add nothing.
    const sessionBefore = await page.evaluate(() => ({ ...sessionStorage }));
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
    const keys = await page.evaluate(() => [Object.keys(localStorage), { ...sessionStorage }, document.cookie]);
    expect(keys).toEqual([[GUIDE_STORE_KEY], sessionBefore, '']);
  });
});

test.describe('job-search copy and the free/paid line', () => {
  test('the page starts where most people start: upload the résumé and ask to "make it better"', () => {
    const a = article(dist(PAGE));
    const t = text(a);
    expect(MAKE_IT_BETTER).toMatch(/make my résumé better/i);
    // It is the first prompt on the page, ahead of the redaction section and the tailored prompt.
    const first = a.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/)!;
    expect(first[0]).toContain('data-make-it-better');
    expect(first[1]).toBe(MAKE_IT_BETTER);
    expect(t.indexOf('upload their résumé file')).toBeGreaterThan(-1);
    expect(t.indexOf(MAKE_IT_BETTER)).toBeLessThan(t.indexOf('What to redact before you upload'));
    expect(t.indexOf('What to redact before you upload')).toBeLessThan(t.indexOf(`Task: ${TAILOR_RESUME.task}`));
    // The tailored prompt builds on the same upload and the same ask.
    expect(TAILOR_RESUME.situation).toMatch(/résumé is attached/);
    expect(TAILOR_RESUME.situation).toMatch(/redacted my contact details and references/);
    expect(TAILOR_RESUME.task).toMatch(/^Make my résumé better for this one posting/);
    // Redaction fits an upload: work on a copy of the file.
    expect(t).toMatch(/save a copy of your résumé, redact the copy and upload that one/);
  });

  test('a search section comes before tailoring: titles from the tool, the searching done by me', () => {
    const t = text(article(dist(PAGE)));
    const search = t.indexOf('What to search for');
    expect(search).toBeGreaterThan(t.indexOf('The example on this page'));
    expect(search).toBeLessThan(t.indexOf('1. Tailor your résumé to one posting'));
    expect(t).toContain('ask for job titles to search for, plus the words postings for those titles tend to use');
    expect(t).toContain('Then I search the job boards myself.');
    expect(t.indexOf(`Task: ${FIND_TITLES.task}`)).toBeGreaterThan(search);
    expect(t.indexOf(`Task: ${FIND_TITLES.task}`)).toBeLessThan(t.indexOf('1. Tailor your résumé to one posting'));
  });

  test('the search section warns that AI can invent or show closed postings, and links When AI gets it wrong', () => {
    const a = article(dist(PAGE));
    const warn = a.match(/<p data-search-warning[^>]*>([\s\S]*?)<\/p>/)!;
    expect(warn, 'warning paragraph').toBeTruthy();
    const w = plain(warn[1]);
    expect(w).toMatch(/ask an AI tool to find or list open jobs/);
    expect(w).toMatch(/invent postings/);
    expect(w).toMatch(/ones that have already closed/);
    expect(w).toMatch(/find the actual posting on the employer's own site or on a job board/);
    expect(warn[1]).toContain(`<a href="${WRONG_PAGE}">When AI gets it wrong</a>`);
    // It sits inside the search section, before tailoring.
    expect(a.indexOf('data-search-warning')).toBeLessThan(a.indexOf('1. Tailor your résumé'));
  });

  test('the tailoring section says to paste the posting text, not only its link', () => {
    const a = article(dist(PAGE));
    const tailor = a.slice(a.indexOf('1. Tailor your résumé'), a.indexOf('2. A cover letter'));
    const p = tailor.match(/<p data-paste-not-link[^>]*>([\s\S]*?)<\/p>/)!;
    expect(p, 'paste-not-link paragraph').toBeTruthy();
    expect(plain(p[1])).toBe(
      "Paste the posting's text, not only its link. Some AI apps can't open links, and some guess what is behind one, so check that the result uses the posting's actual wording.",
    );
  });

  test('nothing above the call to action is about agents, auto-applying or autopilot', () => {
    const t = text(prose(dist(PAGE)));
    expect(t).toContain('What to search for');
    for (const banned of [/agents?\b/i, /agentic/i, /auto-?apply/i, /auto-?applying/i, /autopilot/i]) {
      expect(t, String(banned)).not.toMatch(banned);
    }
  });

  test('the guide speaks as "I" and mentions no course, training, track or cohort outside the call to action', () => {
    const h = dist(PAGE);
    // The search section and its preset are part of the prose checked here.
    expect(text(prose(h))).toContain('What to search for');
    expect(JOB_SEARCH_PRESETS).toContain(FIND_TITLES);
    const strings = [
      text(prose(h)),
      metaDescription(h),
      MAKE_IT_BETTER,
      ...JOB_SEARCH_PRESETS.flatMap((p) => [p.label, ...PROMPT_FIELDS.map((f) => p[f])]),
      ...JOB_SEARCH_CHECK_LINES,
      ...TRACKER_COLUMNS.flatMap((c) => [c.name, c.note]),
    ];
    for (const s of strings) {
      expect(s, s).not.toMatch(/\b(tracks?|training|courses?|cohorts?)\b/i);
      // No illustration on this page is written in character as "we", so the rule has no exception here.
      expect(s, s).not.toMatch(/\b(we|our|ours)\b/i);
    }
    expect(text(prose(h))).toMatch(/\bI\b/);
    // The bullets in the redaction section carry no bold label.
    const a = article(h);
    const redact = a.slice(a.indexOf('What to redact before you upload'), a.indexOf('The example on this page'));
    expect(redact).toContain('<li>');
    expect(redact).not.toMatch(/<li>\s*<strong>/);
  });

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

  test('the article links only to guides already published', () => {
    const hrefs = [...article(dist(PAGE)).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toContain('/ai-guides/never-paste/');
    expect(hrefs).toContain(PROMPT_PAGE);
    expect(hrefs).toContain(WRONG_PAGE);
    expect(article(dist(PAGE))).toMatch(/<a href="\/ai-guides\/never-paste\/">what(&#39;|&#x27;|'|’)s safe to paste into AI<\/a>/);
    for (const h of hrefs) expect(['/ai-guides/never-paste/', PROMPT_PAGE, WRONG_PAGE, CSV_PATH, '/ai-guides/photos-files-voice/', '/ai-guides/what-is-ai/'], h).toContain(h);
  });
});
