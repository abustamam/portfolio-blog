import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import {
  PROMPT_FIELDS, addCheckLine, assemblePrompt, assembleSentence, parseDraft, parseSentence,
} from '../src/utils/promptBuilder';
import { CHECK_LINES, PROMPT_EXAMPLES } from '../src/consts/guides/promptExamples';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PARTIAL = readFileSync(fileURLToPath(new URL('../src/content/ai-partials/prompt.md', import.meta.url)), 'utf8');
const GUIDE = '/ai-guides/prompt/';
const COHORT = '/ai-cohort/prompt/';
const dist = (p: string) => readFileSync(`${DIST}${p.slice(1)}index.html`, 'utf8');

const parts = { situation: 'S', task: 'T', input: 'I', format: 'F', check: 'C' };

test.describe('prompt builder: pure functions', () => {
  test('assembles all five parts in order', () => {
    expect(assemblePrompt(parts)).toBe('Situation: S\n\nTask: T\n\nInput: I\n\nFormat: F\n\nCheck: C');
  });

  test('leaves empty and blank parts out', () => {
    expect(assemblePrompt({ ...parts, input: '', format: '   ' })).toBe('Situation: S\n\nTask: T\n\nCheck: C');
    expect(assemblePrompt({})).toBe('');
  });

  test('adding a Check line twice does not duplicate it', () => {
    const once = addCheckLine('', CHECK_LINES[0]);
    expect(once).toBe(CHECK_LINES[0]);
    expect(addCheckLine(once, CHECK_LINES[0])).toBe(once);
    expect(addCheckLine(once + '\n', `  ${CHECK_LINES[0]} `)).toBe(once + '\n');
    expect(addCheckLine(once, CHECK_LINES[1])).toBe(`${CHECK_LINES[0]}\n${CHECK_LINES[1]}`);
  });

  test('drafts and the task sentence parse defensively', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({ x: 1 })).toBeNull();
    expect(parseDraft({ task: 'T', input: 5 })).toEqual({ ...Object.fromEntries(PROMPT_FIELDS.map((f) => [f, ''])), task: 'T' });
    expect(parseSentence('x')).toBeNull();
    expect(assembleSentence({ what: 'the rota' })).toBe('Every week I do the rota using ________, it takes ________, and done means ________.');
  });

  test('the example chips fill all five parts and use placeholders for people', () => {
    expect(PROMPT_EXAMPLES.map((p) => p.id)).toEqual(['weekly-report', 'difficult-email', 'meeting-summary']);
    for (const p of PROMPT_EXAMPLES) {
      for (const f of PROMPT_FIELDS) expect(p[f].trim(), `${p.id}.${f}`).not.toBe('');
      expect(p.input, p.id).toMatch(/PERSON-1/);
    }
  });

  test('the tap-to-add Check lines are the ones in the shared handout source', () => {
    const listed = PARTIAL.split('Good "Check" lines to borrow')[1].split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
    expect(listed).toEqual(CHECK_LINES);
  });
});

test.describe('prompt guide page', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });
  const field = (page: Page, f: string) => page.locator(`#prompt-builder [data-pb-field="${f}"]`);
  const out = (page: Page) => page.locator('#prompt-builder [data-pb-output]');

  test('each chip fills the five fields and the prompt shows them', async ({ page }) => {
    await page.goto(GUIDE);
    for (const p of PROMPT_EXAMPLES) {
      await page.locator(`[data-pb-chip="${p.id}"]`).click();
      for (const f of PROMPT_FIELDS) await expect(field(page, f), `${p.id}.${f}`).toHaveValue(p[f]);
      await expect(out(page)).toContainText(`Situation: ${p.situation}`);
    }
  });

  test('empty fields are left out of the live prompt, and Copy puts the prompt on the clipboard', async ({ page }) => {
    await page.goto(GUIDE);
    await expect(page.locator('#prompt-builder [data-pb-copy]')).toBeDisabled();
    await field(page, 'task').fill('Write the thank-you note.');
    await expect(out(page)).toHaveText('Task: Write the thank-you note.');
    await page.locator('#prompt-builder [data-pb-copy]').click();
    await expect(page.locator('#prompt-builder [data-pb-status]')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Task: Write the thank-you note.');
  });

  test('tap-to-add Check lines add once', async ({ page }) => {
    await page.goto(GUIDE);
    const btn = page.locator(`[data-pb-check="${CHECK_LINES[0]}"]`);
    await btn.click();
    await btn.click();
    await expect(field(page, 'check')).toHaveValue(CHECK_LINES[0]);
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('the draft survives a reload and Clear empties it', async ({ page }) => {
    await page.goto(GUIDE);
    await page.locator('[data-pb-chip="meeting-summary"]').click();
    await field(page, 'format').fill('Edited format line.');
    await page.reload();
    await expect(field(page, 'format')).toHaveValue('Edited format line.');
    await expect(field(page, 'task')).toHaveValue(PROMPT_EXAMPLES[2].task);
    // Stored only through guideStore's one key, under this builder's storageKey.
    const stored = await page.evaluate((k) => ({ keys: Object.keys(localStorage), raw: localStorage.getItem(k) }), GUIDE_STORE_KEY);
    expect(stored.keys).toEqual([GUIDE_STORE_KEY]);
    expect(JSON.parse(stored.raw!).drafts.prompt.format).toBe('Edited format line.');

    await page.locator('#prompt-builder [data-pb-clear]').click();
    for (const f of PROMPT_FIELDS) await expect(field(page, f)).toHaveValue('');
    await page.reload();
    for (const f of PROMPT_FIELDS) await expect(field(page, f)).toHaveValue('');
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').drafts?.prompt, GUIDE_STORE_KEY)).toBeUndefined();
  });

  test('the task sentence fills in, survives a reload and clears', async ({ page }) => {
    await page.goto(GUIDE);
    const sentence = page.locator('#prompt-sentence');
    await sentence.locator('[data-pb-s="what"]').fill('the volunteer rota');
    await expect(sentence.locator('[data-pb-output]')).toHaveText('Every week I do the volunteer rota using ________, it takes ________, and done means ________.');
    await page.reload();
    await expect(sentence.locator('[data-pb-s="what"]')).toHaveValue('the volunteer rota');
    await sentence.locator('[data-pb-clear]').click();
    await expect(sentence.locator('[data-pb-s="what"]')).toHaveValue('');
  });

  test('zero network requests while using the builder', async ({ page }) => {
    await page.goto(GUIDE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.locator('[data-pb-chip="weekly-report"]').click();
    await field(page, 'task').fill('Typing something private-ish');
    await page.locator(`[data-pb-check="${CHECK_LINES[2]}"]`).click();
    await page.locator('#prompt-builder [data-pb-copy]').click();
    await page.locator('#prompt-sentence [data-pb-s="what"]').fill('more typing');
    await page.locator('#prompt-builder [data-pb-clear]').click();
    expect(requests).toEqual([]);
    expect(page.url()).toBe(new URL(GUIDE, page.url()).href);
  });

  test('a host can fill the builder from a click or an event, and it scrolls there', async ({ page }) => {
    await page.goto(GUIDE);
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'host-btn';
      b.textContent = 'Try this prompt';
      b.dataset.promptFill = 'difficult-email';
      b.dataset.promptTarget = 'prompt-builder';
      document.body.prepend(b);
    });
    await page.locator('#host-btn').click();
    await expect(field(page, 'situation')).toHaveValue(PROMPT_EXAMPLES[1].situation);
    await expect(field(page, 'situation')).toBeFocused();
    await expect(page.locator('#prompt-builder')).toBeInViewport();

    await page.evaluate(() =>
      document.dispatchEvent(new CustomEvent('prompt-builder:fill', {
        detail: { target: 'prompt-builder', parts: { task: 'From an event.' }, scroll: false },
      })),
    );
    await expect(field(page, 'task')).toHaveValue('From an event.');
    await expect(field(page, 'situation')).toHaveValue('');
  });

  test('the guide holds the template with one copy button and the never-paste reminder', async ({ page }) => {
    await page.goto(GUIDE);
    await expect(page.locator('.copy-wrapper .copy-btn')).toHaveCount(1);
    await expect(page.locator('.copy-wrapper pre')).toContainText('Situation:');
    await expect(page.locator('#prompt-builder a[href="/ai-guides/never-paste/"]')).toHaveCount(1);
    await expect(page.locator('main, body').first()).toContainText('Worked example');
  });

  test('builder and Copy are reachable at 375 px without horizontal scroll', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(GUIDE);
      await page.locator('[data-pb-chip="weekly-report"]').click();
      const copy = page.locator('#prompt-builder [data-pb-copy]');
      await copy.scrollIntoViewIfNeeded();
      const box = (await copy.boundingBox())!;
      expect(box.x, `${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width}px`).toBeLessThanOrEqual(width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('shared source and the free/paid line', () => {
  const norm = (h: string) =>
    h
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x27;|&#39;|&apos;/g, "'")
      .replace(/\u2019/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');

  test('the public guide has no by-track section and no homework', () => {
    const text = norm(dist(GUIDE));
    for (const banned of ['By track', 'Connect:', 'Build:', 'Homework']) expect(text, banned).not.toContain(banned);
  });

  test('both pages render the template, worked example and Check lines from the one partial', () => {
    for (const p of [GUIDE, COHORT]) {
      const text = norm(dist(p));
      expect(text, p).toContain('Situation: I am a');
      expect(text, p).toContain('I run a monthly food drive with 12 volunteers');
      for (const l of CHECK_LINES) expect(text, `${p}: ${l}`).toContain(l);
    }
  });

  test('the cohort page keeps its by-track section, homework, noindex and the guide stays indexed', () => {
    const cohort = norm(dist(COHORT));
    for (const s of ['By track', 'Everyday AI:', 'Connect:', 'Build:', 'Homework']) expect(cohort, s).toContain(s);
    expect(dist(COHORT)).toContain('<meta name="robots" content="noindex">');
    expect(dist(GUIDE)).not.toContain('noindex');
  });
});
