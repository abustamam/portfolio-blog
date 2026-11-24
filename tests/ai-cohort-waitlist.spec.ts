import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const PATH = '/ai-cohort/waitlist';
const ENDPOINT = '**/api/ai-quiz/waitlist';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

test.describe('cohort waitlist', () => {
  test('the built page is noindex', () => {
    const html = readFileSync(`${DIST}ai-cohort/waitlist/index.html`, 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  test('says the cohort is full and shows no email address or phone number', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('h1')).toHaveText('This cohort is full');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
    expect(text).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
  });

  test('blocks submit until name and contact are filled', async ({ page }) => {
    let posts = 0;
    await page.route(ENDPOINT, (route) => {
      posts += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto(PATH);
    await page.locator('#waitlist-submit').click();
    await expect(page.locator('#waitlist-error')).toHaveText('Please add your name and how to reach you.');
    await page.locator('input[name="name"]').fill('Test Person');
    await page.locator('#waitlist-submit').click();
    await expect(page.locator('#waitlist-error')).toHaveText('Please add how to reach you.');
    expect(posts).toBe(0);
  });

  test('a complete form is POSTed and replaced by the thank-you', async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route(ENDPOINT, async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto(PATH);
    await expect(page.locator('#cohort-waitlist')).toHaveAttribute('data-endpoint', '/api/ai-quiz/waitlist');
    await page.locator('input[name="name"]').fill('Test Person');
    await page.locator('input[name="contact"]').fill('+1 916 555 0100');
    await page.locator('textarea[name="note"]').fill('Weeknights');
    await page.locator('#waitlist-submit').click();

    await expect(page.locator('#waitlist-thanks')).toBeVisible();
    await expect(page.locator('#cohort-waitlist')).toBeHidden();
    expect(body).toEqual({ name: 'Test Person', contact: '+1 916 555 0100', note: 'Weeknights', website: '' });
  });

  test('a failed send keeps the form and offers to try again', async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.fulfill({ status: 500, body: 'nope' }));
    await page.goto(PATH);
    await page.locator('input[name="name"]').fill('Test Person');
    await page.locator('input[name="contact"]').fill('test@example.com');
    await page.locator('#waitlist-submit').click();
    await expect(page.locator('#waitlist-status')).toContainText("didn't send");
    await expect(page.locator('#waitlist-submit')).toHaveText('Try again');
    await expect(page.locator('#waitlist-thanks')).toBeHidden();
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
});
