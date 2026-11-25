import { test, expect, type Page } from '@playwright/test';
import { TRACKS } from '../src/utils/aiQuiz';

type Path = {
  frequency: string;
  tools: string[];
  wrongAnswer: string;
  prompt: string;
  files: string;
  connected: string;
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
  weeklyTask: 'Pulling listing comps into a market report',
  neverPaste: ['personal-info', 'passwords', 'financial'],
};

const pick = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();
const next = (page: Page) => page.locator('#quiz-next').click();

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
    await expect(page.locator('#quiz-step-label')).toHaveText('question 1 of 9');
    await next(page);
    await expect(page.locator('#quiz-error')).toBeVisible();
    await expect(page.locator('#quiz-step-label')).toHaveText('question 1 of 9');
    await pick(page, 'frequency', 'weekly');
    await next(page);
    await expect(page.locator('#quiz-step-label')).toHaveText('question 2 of 9');
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
    await expect(page.locator('#result-track')).toHaveText('Everyday AI');
    await expect(page.locator('#result-reserve')).toHaveAttribute('href', '/ai-training/#everyday');
    await expect(page.locator('#result-build')).toContainText(beginner.weeklyTask);
    await expect(page.locator('#result-status')).toContainText("aren't being collected yet");
  });

  test('advanced user lands on Connect or Build and the response is POSTed', async ({ page }) => {
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
    await expect(page.locator('#quiz-result')).toHaveAttribute('data-track', 'builder');
    await expect(page.locator('#result-track')).toHaveText('Connect or Build');
    await expect(page.locator('#result-reserve')).toHaveAttribute('href', '/ai-training/#tracks');
    await expect(page.locator('#result-status')).toContainText('answers were sent');
    expect(body).toMatchObject({
      track: 'builder',
      weeklyTask: builder.weeklyTask,
      tools: builder.tools,
      start: 'within-month',
      payer: 'organization',
      followUp: ['team-workshop', 'done-for-you'],
    });
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
    await expect(notify).toContainText('Connect or Build');
    await notify.getByRole('button', { name: 'Tell me' }).click();
    await expect(page.locator('#result-notify-status')).toContainText('Please add');
    expect(notifyBody).toBeNull();

    await page.locator('#result-notify-name').fill('Test Person');
    await page.locator('#result-notify-contact').fill('test@example.com');
    await notify.getByRole('button', { name: 'Tell me' }).click();
    await expect(page.locator('#result-notify-status')).toContainText('Thank you');
    await expect(page.locator('#result-notify-contact')).toBeHidden();
    expect(notifyBody).toEqual({ name: 'Test Person', contact: 'test@example.com', source: 'quiz:builder', website: '' });
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
    for (const [key, t] of Object.entries(TRACKS)) {
      for (const name of t.name.split(' or ')) expect(offered, `${key}: ${name}`).toContain(name);
    }
  });
});
