import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import {
  OFFER_NAMES,
  resultCopy,
  scoreQuiz,
  skillScores,
  suggestGuides,
  SUGGESTABLE_GUIDES,
  MAX_SUGGESTED_GUIDES,
  type Offer,
  type Track,
} from '../src/utils/aiQuiz';

type Path = {
  frequency: string;
  tools: string[];
  wrongAnswer: string;
  prompt: string;
  files: string;
  connected: string;
  goal: string;
  weeklyTask: string;
  neverPaste: string[];
};

const beginner: Path = {
  frequency: 'never',
  tools: ['none'],
  wrongAnswer: 'didnt-notice',
  prompt: 'short',
  files: 'never',
  connected: 'no',
  goal: 'weekly-task',
  weeklyTask: 'Writing the weekly volunteer reminder messages',
  neverPaste: ['unsure'],
};

const builder: Path = {
  frequency: 'daily',
  tools: ['claude', 'local'],
  wrongAnswer: 'reprompted-and-verified',
  prompt: 'rich',
  files: 'checked-output',
  connected: 'agents',
  goal: 'build',
  weeklyTask: 'Pulling listing comps into a market report',
  neverPaste: ['personal-info', 'passwords', 'financial'],
};

const pick = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();
const next = (page: Page) => page.locator('#quiz-next').click();

const skillRows = (page: Page) =>
  page.locator('#result-skills li').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.points));

async function complete(page: Page, p: Path) {
  await pick(page, 'frequency', p.frequency);
  await next(page);
  for (const t of p.tools) await pick(page, 'tools', t);
  await next(page);
  await pick(page, 'wrongAnswer', p.wrongAnswer);
  await next(page);
  await pick(page, 'prompt', p.prompt);
  await next(page);
  await pick(page, 'files', p.files);
  await next(page);
  await pick(page, 'connected', p.connected);
  await next(page);
  await pick(page, 'goal', p.goal);
  await next(page);
  await page.locator('textarea[name="weeklyTask"]').fill(p.weeklyTask);
  await next(page);
  for (const v of p.neverPaste) await pick(page, 'neverPaste', v);
  await next(page);
  await pick(page, 'start', 'within-month');
  await pick(page, 'payer', 'organization');
  await pick(page, 'followUp', 'team-workshop');
  await pick(page, 'followUp', 'done-for-you');
  await page.locator('#quiz-submit').click();
}

test.describe('AI quiz', () => {
  test('blocks Next until a required question is answered', async ({ page }) => {
    await page.goto('/ai-quiz');
    await expect(page.locator('#quiz-step-label')).toHaveText('question 1 of 10');
    await next(page);
    await expect(page.locator('#quiz-error')).toBeVisible();
    await expect(page.locator('#quiz-step-label')).toHaveText('question 1 of 10');
    await pick(page, 'frequency', 'weekly');
    await next(page);
    await expect(page.locator('#quiz-step-label')).toHaveText('question 2 of 10');
  });

  test('the echoed task drops its own closing punctuation, so the quote does not end with two marks', async ({ page }) => {
    await page.goto('/ai-quiz');
    await page.evaluate(() => {
      document.getElementById('ai-quiz')!.dataset.endpoint = '';
    });
    await complete(page, { ...beginner, weeklyTask: `${beginner.weeklyTask}.  ` });
    const build = page.locator('#result-build');
    await expect(build).toContainText(`"${beginner.weeklyTask}". In the cohort`);
    await expect(build).not.toContainText('."');
  });

  test('beginner lands on Everyday AI and sees the no-endpoint notice', async ({ page }) => {
    await page.goto('/ai-quiz');
    await page.evaluate(() => {
      document.getElementById('ai-quiz')!.dataset.endpoint = '';
    });
    await complete(page, beginner);
    const result = page.locator('#quiz-result');
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('data-track', 'foundations');
    await expect(result).toHaveAttribute('data-offer', 'everyday');
    await expect(page.locator('#result-track')).toHaveText('Everyday AI');
    await expect(page.locator('#result-reserve')).toHaveAttribute('href', '/ai-training/#everyday');
    await expect(page.locator('#result-build')).toContainText(beginner.weeklyTask);
    await expect(page.locator('#result-status')).toContainText("aren't being collected yet");
    await expect(page.locator('.track-glyph[data-glyph="everyday"]')).toBeVisible();
    await expect(page.locator('.track-glyph[data-glyph="build"], .track-glyph[data-glyph="connect"]')).toHaveCount(2);
    await expect(page.locator('.track-glyph[data-glyph="connect"]')).toBeHidden();
    await expect(page.locator('.track-glyph[data-glyph="build"]')).toBeHidden();
    expect(await skillRows(page)).toEqual(['0', '0', '0', '0', '0']);
  });

  test('advanced user who wants to build lands on Build alone, and the response is POSTed', async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route('**/api/ai-quiz', async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto('/ai-quiz');
    await expect(page.locator('#ai-quiz')).toHaveAttribute('data-endpoint', '/api/ai-quiz');
    await complete(page, builder);
    // The stored track is still the skill level; the result names one track to reserve.
    await expect(page.locator('#quiz-result')).toHaveAttribute('data-track', 'builder');
    await expect(page.locator('#quiz-result')).toHaveAttribute('data-offer', 'build');
    await expect(page.locator('#result-track')).toHaveText('Build');
    await expect(page.locator('#result-reserve')).toHaveAttribute('href', '/ai-training/#build');
    await expect(page.locator('#result-status')).toContainText('answers were sent');
    // One track, one mark.
    await expect(page.locator('.track-glyph[data-glyph="build"]')).toBeVisible();
    await expect(page.locator('.track-glyph[data-glyph="connect"]')).toBeHidden();
    await expect(page.locator('.track-glyph[data-glyph="everyday"]')).toBeHidden();
    expect(await skillRows(page)).toEqual(['3', '3', '3', '3', '3']);
    await expect(page.locator('#result-skills li').first().locator('.skill-pip[data-on]')).toHaveCount(3);
    expect(body).toMatchObject({
      track: 'builder',
      recommend: 'build',
      goal: 'build',
      weeklyTask: builder.weeklyTask,
      tools: builder.tools,
      start: 'within-month',
      payer: 'organization',
      followUp: ['team-workshop', 'done-for-you'],
    });
    expect(body).not.toHaveProperty('price');
  });

  test('a beginner who wants help with email lands on Connect, with its price and the first slot', async ({ page }) => {
    // What /ai-training/ says about Connect is what the result must repeat.
    await page.goto('/ai-training/');
    const price = (await page.locator('#connect .track-price').innerText()).trim();
    const slot = (await page.locator('.training-slots li strong').first().innerText()).trim();
    expect(price).toMatch(/^\$\d+$/);
    expect(slot.length).toBeGreaterThan(5);

    await page.goto('/ai-quiz');
    await page.evaluate(() => {
      document.getElementById('ai-quiz')!.dataset.endpoint = '';
    });
    await complete(page, { ...beginner, goal: 'inbox' });
    const result = page.locator('#quiz-result');
    await expect(result).toHaveAttribute('data-track', 'foundations');
    await expect(result).toHaveAttribute('data-offer', 'connect');
    await expect(page.locator('#result-track')).toHaveText('Connect');
    await expect(page.locator('#result-reserve')).toHaveAttribute('href', '/ai-training/#connect');
    await expect(page.locator('#result-reserve')).toContainText('Connect');
    await expect(page.locator('.track-glyph[data-glyph="connect"]')).toBeVisible();
    await expect(page.locator('.track-glyph[data-glyph="everyday"]')).toBeHidden();
    await expect(page.locator('.track-glyph[data-glyph="build"]')).toBeHidden();
    // Price, deposit and dates for this track only.
    const offer = page.locator('[data-result-offer]:visible');
    await expect(offer).toHaveCount(1);
    await expect(offer).toHaveAttribute('data-result-offer', 'connect');
    await expect(offer).toContainText(price);
    await expect(offer).toContainText('$25');
    await expect(offer).toContainText(slot);
  });

  test('routes on what the person wants, and falls back on what they already do', () => {
    const offer = (patch: Record<string, unknown>, base: Path = beginner) => scoreQuiz({ ...base, ...patch }).recommend;
    // The goal decides, whatever the skill score.
    expect(offer({ goal: 'weekly-task' })).toBe('everyday');
    expect(offer({ goal: 'inbox' })).toBe('connect');
    expect(offer({ goal: 'build' })).toBe('build');
    expect(offer({ goal: 'weekly-task' }, builder)).toBe('everyday');
    expect(offer({ goal: 'inbox' }, builder)).toBe('connect');
    // Not sure (or an older page that never asked): beginners and regular users start with Everyday AI.
    expect(offer({ goal: 'unsure' })).toBe('everyday');
    expect(offer({ goal: undefined })).toBe('everyday');
    // Not sure and advanced: Build for people already using an API, a local model or agents, else Connect.
    expect(offer({ goal: 'unsure' }, builder)).toBe('build');
    expect(offer({ goal: undefined }, builder)).toBe('build');
    expect(offer({ goal: 'unsure', tools: ['chatgpt'], connected: 'automation' }, builder)).toBe('connect');
    // The stored track stays the skill level, so old and new rows compare.
    expect(scoreQuiz({ ...beginner, goal: 'build' }).track).toBe('foundations');
    expect(scoreQuiz({ ...builder, goal: 'weekly-task' }).track).toBe('builder');
  });

  test('has no price question: the prices are fixed on /ai-training/', async ({ page }) => {
    await page.goto('/ai-quiz');
    await expect(page.locator('input[name="price"]')).toHaveCount(0);
    await expect(page.locator('#ai-quiz')).not.toContainText('fair price');
    await expect(page.locator('#ai-quiz input[name="goal"]')).toHaveCount(4);
  });

  test('the seal beside the progress bar draws further with each question', async ({ page }) => {
    await page.goto('/ai-quiz');
    const drawn = () =>
      page.locator('#quiz-seal').evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--p')));
    expect(await drawn()).toBeCloseTo(1 / 10, 5);
    await pick(page, 'frequency', 'daily');
    await next(page);
    expect(await drawn()).toBeCloseTo(2 / 10, 5);
    await page.locator('#quiz-back').click();
    expect(await drawn()).toBeCloseTo(1 / 10, 5);
    // The first stroke is partly drawn and the last one not at all. Chromium
    // reports the computed offset as "calc(0.333333px)".
    const offsets = await page
      .locator('#quiz-seal .ai-rosette[data-progress] > *')
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).strokeDashoffset.match(/[\d.]+/)?.[0])));
    expect(offsets).toHaveLength(6);
    expect(offsets[0]).toBeCloseTo(1 - 6 / 10, 2);
    expect(offsets[5]).toBe(1);
  });

  test('the per-skill points add up to the score', () => {
    const mixed = { frequency: 'weekly', wrongAnswer: 'checked-source', prompt: 'medium', files: 'never', connected: 'agents' };
    expect(skillScores(mixed).map((s) => s.points)).toEqual([2, 2, 1, 0, 3]);
    expect(scoreQuiz(mixed).score).toBe(8);
  });

  test('asks for contact on the result screen, not in the quiz, and tags it with the track', async ({ page }) => {
    let quizBody: Record<string, unknown> | null = null;
    let notifyBody: Record<string, unknown> | null = null;
    const ok = { status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) };
    await page.route('**/api/ai-quiz', async (route) => {
      quizBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill(ok);
    });
    await page.route('**/api/ai-quiz/waitlist', async (route) => {
      notifyBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill(ok);
    });
    await page.goto('/ai-quiz');
    await expect(page.locator('#ai-quiz input[name="contact"], #ai-quiz input[name="name"]')).toHaveCount(0);
    await complete(page, builder);
    await expect(page.locator('#result-status')).toContainText('answers were sent');
    expect(quizBody).not.toHaveProperty('contact');

    const notify = page.locator('#result-notify');
    await expect(notify).toBeVisible();
    await expect(notify).toContainText('Build');
    await expect(notify).not.toContainText('opens');
    await expect(page.locator('#result-whatsapp')).toHaveAttribute('href', '/api/ai-quiz/whatsapp');
    await expect(page.locator('#result-whatsapp')).toHaveAttribute('target', '_blank');
    await notify.getByRole('button', { name: 'Tell me' }).click();
    await expect(page.locator('#result-notify-status')).toContainText('Please add');
    expect(notifyBody).toBeNull();

    await page.locator('#result-notify-name').fill('Test Person');
    await page.locator('#result-notify-contact').fill('test@example.com');
    await notify.getByRole('button', { name: 'Tell me' }).click();
    await expect(page.locator('#result-notify-status')).toContainText('Thank you');
    await expect(page.locator('#result-notify-contact')).toBeHidden();
    expect(notifyBody).toEqual({ name: 'Test Person', contact: 'test@example.com', source: 'quiz:build', website: '' });
  });

  test('no WhatsApp number in any built file', () => {
    // The number lives in the intake service's env and is reached through
    // /api/ai-quiz/whatsapp, a redirect. No wa.me/<number> link and no long
    // digit run that looks like a phone number may ship in the site's files.
    // Share links like wa.me/?text= carry no number and are fine.
    const dist = join(process.cwd(), 'dist');
    const files = (readdirSync(dist, { recursive: true }) as string[]).filter((f) => /\.(html|js|json|xml|txt|md)$/.test(f));
    expect(files.length).toBeGreaterThan(10);
    const hits = files.filter((f) => /wa\.me\/\+?\d|api\.whatsapp\.com\/send\?phone=/.test(readFileSync(join(dist, f), 'utf8')));
    expect(hits).toEqual([]);
  });

  test('is online only: no Roseville or in-person option, no format question', async ({ page }) => {
    await page.goto('/ai-quiz');
    await expect(page.locator('input[name="format"]')).toHaveCount(0);
    // Scoped to the quiz and its description: the page also embeds the
    // /writing/hands-on-ai-cohort post text, which is not this file's to fix.
    const text = await page.locator('#ai-quiz').innerText();
    expect(text).not.toMatch(/roseville|in-person|in person|onsite/i);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /roseville|in.person/i);
  });

  test('a failed send shows an error and a retry button', async ({ page }) => {
    await page.route('**/api/ai-quiz', (route) => route.fulfill({ status: 500, body: 'nope' }));
    await page.goto('/ai-quiz');
    await complete(page, beginner);
    await expect(page.locator('#result-status')).toContainText("didn't send");
    await expect(page.locator('#result-retry')).toBeVisible();
  });

  test('pages fit a phone screen without horizontal scroll', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      for (const path of ['/ai-quiz', '/writing/hands-on-ai-cohort']) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    }
  });

  test('launch post links to the quiz', async ({ page }) => {
    await page.goto('/writing/hands-on-ai-cohort');
    await expect(page.locator('a[href="/ai-quiz"]').first()).toBeVisible();
  });

  test('every result names tracks that exist on /ai-training/', async ({ page }) => {
    await page.goto('/ai-training/');
    const offered = await page.locator('.training-track .track-name').allInnerTexts();
    expect(offered.length).toBeGreaterThan(0);
    // One track per result: no "Connect or Build".
    for (const o of Object.keys(OFFER_NAMES) as Offer[]) {
      expect(offered, o).toContain(OFFER_NAMES[o]);
      for (const track of ['foundations', 'applied', 'builder'] as Track[]) {
        const copy = resultCopy({ recommend: o, track });
        expect(copy.name).toBe(OFFER_NAMES[o]);
        expect(copy.summary.length, `${o}/${track} summary`).toBeGreaterThan(40);
        expect(copy.covers.length, `${o}/${track} covers`).toBe(3);
      }
    }
  });

  test('suggests free guides for the gaps the answers show', () => {
    expect(suggestGuides(beginner)).toEqual(['what-is-ai', 'first-ten-minutes', 'never-paste']);
    // No gaps: the fallbacks fill in.
    expect(suggestGuides(builder)).toEqual(['which-model', 'examples']);
    // A regular user who misses wrong answers and writes short prompts.
    expect(
      suggestGuides({ ...builder, wrongAnswer: 'asked-again', prompt: 'short', neverPaste: ['nothing'] }),
    ).toEqual(['never-paste', 'when-ai-is-wrong', 'prompt']);
    expect(suggestGuides({ ...builder, files: 'went-badly' })).toEqual(['photos-files-voice', 'which-model', 'examples']);
    for (const p of [beginner, builder]) expect(suggestGuides(p).length).toBeLessThanOrEqual(MAX_SUGGESTED_GUIDES);
  });

  test('result screen shows the suggested guides, in order, linking to real guide pages', async ({ page }) => {
    await page.goto('/ai-quiz');
    await expect(page.locator('[data-quiz-guide]')).toHaveCount(SUGGESTABLE_GUIDES.length);
    await complete(page, beginner);
    const shown = page.locator('#result-guide-list [data-quiz-guide]:visible');
    await expect(shown).toHaveCount(3);
    expect(await shown.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.quizGuide))).toEqual(
      suggestGuides(beginner),
    );
    const href = await shown.first().locator('a').getAttribute('href');
    expect(href).toBe('/ai-guides/what-is-ai/');
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    await expect(page.locator('#result-guides')).toHaveAttribute('href', '/ai-guides/');
  });
});
