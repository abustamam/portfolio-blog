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
  await pick(page, 'format', 'either');
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
      format: 'either',
      start: 'within-month',
      payer: 'organization',
      followUp: ['team-workshop', 'done-for-you'],
    });
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
