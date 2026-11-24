import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const PATH = '/ai-cohort/intake';
const ENDPOINT = '**/api/ai-quiz/intake';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const answers = {
  name: 'Test Person',
  contact: '+1 916 555 0100',
  weeklyTask: 'Every week I turn the sign-up sheet into a schedule using Sheets, it takes an hour, and done means reminders went out.',
};

const pick = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();

async function fill(page: Page) {
  await page.locator('input[name="name"]').fill(answers.name);
  await page.locator('input[name="contact"]').fill(answers.contact);
  await page.locator('textarea[name="weeklyTask"]').fill(answers.weeklyTask);
  await pick(page, 'timeTaken', '1-2h');
  await pick(page, 'inputs', 'spreadsheet');
  await pick(page, 'inputs', 'email');
  await pick(page, 'tools', 'gemini-free');
  await pick(page, 'tools', 'chatgpt-paid');
  await pick(page, 'workRestricts', 'not-sure');
  await pick(page, 'track', 'applied');
  await page.locator('input[name="recordingConsent"]').check();
}

test.describe('cohort intake', () => {
  test('the built page is unlisted: noindex and absent from the sitemap', () => {
    const html = readFileSync(`${DIST}ai-cohort/intake/index.html`, 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex">');

    const sitemaps = readdirSync(DIST).filter((f) => /^sitemap-.*\.xml$/.test(f));
    expect(sitemaps.length).toBeGreaterThan(1); // the index plus at least one page list
    const all = sitemaps.map((f) => readFileSync(`${DIST}${f}`, 'utf8')).join('\n');
    expect(all).toContain('<loc>https://bustamam.tech/ai-quiz/</loc>'); // the check reads real sitemaps
    expect(all).not.toContain('/ai-cohort/');
  });

  test('other pages stay indexable', () => {
    for (const page of ['ai-quiz/index.html', 'index.html']) {
      expect(readFileSync(`${DIST}${page}`, 'utf8')).not.toContain('name="robots"');
    }
  });

  test('shows the schedule and no email address or phone number', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('#intake-schedule')).toContainText('Jan 11, Jan 18, Jan 25, Feb 1, 2027');
    await expect(page.locator('#intake-schedule')).toContainText('6:30–8:00pm Pacific');
    await expect(page.locator('#intake-intro')).toContainText('January 4, 2027');
    const text = await page.locator('main, body').first().innerText();
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
    expect(text).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
    await expect(page.locator(`a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me"]`)).toHaveCount(0);
  });

  test('blocks submit until the required fields and consent are filled', async ({ page }) => {
    let posts = 0;
    await page.route(ENDPOINT, (route) => {
      posts += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto(PATH);
    await page.locator('#intake-submit').click();
    const error = page.locator('#intake-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('your name');
    await expect(error).toContainText('the recording consent');

    await fill(page);
    await page.locator('input[name="recordingConsent"]').uncheck();
    await page.locator('#intake-submit').click();
    await expect(error).toHaveText('Please add the recording consent.');
    expect(posts).toBe(0);
  });

  test('a complete form is POSTed and the thank-you asks for a sample file', async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route(ENDPOINT, async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto(PATH);
    await expect(page.locator('#cohort-intake')).toHaveAttribute('data-endpoint', '/api/ai-quiz/intake');
    await fill(page);
    await page.locator('#intake-submit').click();

    const thanks = page.locator('#intake-thanks');
    await expect(thanks).toBeVisible();
    await expect(thanks).toContainText('sample file');
    await expect(thanks).toContainText('WhatsApp');
    await expect(page.locator('#cohort-intake')).toBeHidden();
    expect(body).toEqual({
      ...answers,
      timeTaken: '1-2h',
      inputs: ['spreadsheet', 'email'],
      tools: ['gemini-free', 'chatgpt-paid'],
      workRestricts: 'not-sure',
      track: 'applied',
      privateConcerns: '',
      recordingConsent: true,
      website: '',
    });
  });

  test('"None yet" clears the other tools', async ({ page }) => {
    await page.goto(PATH);
    await pick(page, 'tools', 'claude');
    await pick(page, 'tools', 'none');
    await expect(page.locator('input[name="tools"][value="claude"]')).not.toBeChecked();
  });

  test('a failed send keeps the form and offers to send again', async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.fulfill({ status: 500, body: 'nope' }));
    await page.goto(PATH);
    await fill(page);
    await page.locator('#intake-submit').click();
    await expect(page.locator('#intake-status')).toContainText("didn't send");
    await expect(page.locator('#intake-submit')).toHaveText('Send again');
    await expect(page.locator('#intake-thanks')).toBeHidden();
  });

  test('fits a phone screen without horizontal scroll', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(PATH);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${PATH} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test('is not linked from the home page or the quiz', async ({ page }) => {
    for (const path of ['/', '/ai-quiz']) {
      await page.goto(path);
      await expect(page.locator('a[href*="/ai-cohort/"]')).toHaveCount(0);
    }
  });
});
