import { test, expect, type Page } from '@playwright/test';

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

  test('beginner lands on Foundations and sees the no-endpoint notice', async ({ page }) => {
    await page.goto('/ai-quiz');
    await complete(page, beginner);
    const result = page.locator('#quiz-result');
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('data-track', 'foundations');
    await expect(page.locator('#result-track')).toHaveText('Foundations');
    await expect(page.locator('#result-build')).toContainText(beginner.weeklyTask);
    await expect(page.locator('#result-status')).toContainText("aren't being collected yet");
  });

  test('advanced user lands on Builder and the response is POSTed', async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route('https://quiz.example.test/exec', async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto('/ai-quiz');
    await page.evaluate(() => {
      document.getElementById('ai-quiz')!.dataset.endpoint = 'https://quiz.example.test/exec';
    });
    await complete(page, builder);
    await expect(page.locator('#quiz-result')).toHaveAttribute('data-track', 'builder');
    await expect(page.locator('#result-status')).toContainText('answers were sent');
    expect(body).toMatchObject({
      track: 'builder',
      weeklyTask: builder.weeklyTask,
      tools: builder.tools,
      format: 'either',
    });
  });

  test('a failed send shows an error and a retry button', async ({ page }) => {
    await page.route('https://quiz.example.test/exec', (route) =>
      route.fulfill({ status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'nope' }),
    );
    await page.goto('/ai-quiz');
    await page.evaluate(() => {
      document.getElementById('ai-quiz')!.dataset.endpoint = 'https://quiz.example.test/exec';
    });
    await complete(page, beginner);
    await expect(page.locator('#result-status')).toContainText("didn't send");
    await expect(page.locator('#result-retry')).toBeVisible();
  });

  // Measures the page body only. The shared TerminalChrome bar overflows ~12px at
  // 375px on every page (pre-existing, tracked separately), so the whole document
  // can't be the yardstick here yet.
  test('content fits a phone screen without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ['/ai-quiz', '/writing/hands-on-ai-cohort']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const root = document.querySelector('#terminal-inert-siblings')!;
        const right = Math.max(...[...root.querySelectorAll('*')].map((e) => e.getBoundingClientRect().right));
        return Math.round(right - w);
      });
      expect(overflow, `${path} content overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test('launch post links to the quiz', async ({ page }) => {
    await page.goto('/writing/hands-on-ai-cohort');
    await expect(page.locator('a[href="/ai-quiz"]').first()).toBeVisible();
  });
});
