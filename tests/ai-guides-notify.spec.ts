import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

// "Tell me when the next cohort opens" on the guides hub and under every
// guide (#108). Run after `bun run build`: the pages come from dist/.

const ENDPOINT = '**/api/ai-quiz/waitlist';
const SRC = fileURLToPath(new URL('../src/content/guides/', import.meta.url));
const GUIDES = readdirSync(SRC)
  .filter((f) => f.endsWith('.mdx'))
  .filter((f) => !/^draft:\s*true\s*$/m.test(readFileSync(SRC + f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''))
  .map((f) => f.replace(/\.mdx$/, ''));

const PAGES = [
  { path: '/ai-guides/', source: 'guides-hub' },
  ...GUIDES.map((id) => ({ path: `/ai-guides/${id}/`, source: `guide:${id}` })),
];

const form = (page: Page) => page.locator('[data-notify-form]');

test.describe('guides: tell me when the next cohort opens', () => {
  test('there is at least one published guide to check', () => {
    expect(GUIDES.length).toBeGreaterThan(0);
  });

  for (const { path, source } of PAGES) {
    test(`${path} has one form, tagged ${source}, posting to the waitlist`, async ({ page }) => {
      await page.goto(path);
      await expect(form(page)).toHaveCount(1);
      await expect(form(page)).toHaveAttribute('data-source', source);
      await expect(form(page)).toHaveAttribute('data-endpoint', '/api/ai-quiz/waitlist');
      // Reserving is open now, so the form must not read as if nothing is on sale yet.
      await expect(form(page).locator('.notify__title')).toHaveText('Not ready to reserve?');
      await expect(form(page).locator('[data-notify-open]')).toContainText('Reserving is open now');
      await expect(form(page).locator('[data-notify-open] a')).toHaveAttribute('href', '/ai-training/#tracks');
      await expect(form(page)).not.toContainText('next cohort opens');
      await expect(form(page).locator('[data-notify-promise]')).toContainText('one message when the next cohort has dates');
      // One field: no name, no track.
      await expect(form(page).locator('input:not([name="website"]), textarea, select')).toHaveCount(1);
    });
  }

  test('the hub still says "Free · no sign-up", and the guides read the same: the form is after the article', async ({ page }) => {
    await page.goto('/ai-guides/');
    await expect(page.locator('.ai-kicker').first()).toHaveText('Free · no sign-up');
    await page.goto(`/ai-guides/${GUIDES[0]}/`);
    const after = await page.evaluate(() => {
      const article = document.querySelector('article')!;
      const f = document.querySelector('[data-notify-form]')!;
      return Boolean(article.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) && !article.contains(f);
    });
    expect(after).toBe(true);
  });

  test('success: posts contact and source, then thanks the reader', async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route(ENDPOINT, async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/ai-guides/prompt/');
    await form(page).locator('input[name="contact"]').fill('  reader@example.com ');
    await form(page).getByRole('button', { name: 'Tell me' }).click();
    await expect(form(page).locator('[data-notify-status]')).toHaveText(
      "Thank you. I'll message you once when the next cohort has dates.",
    );
    await expect(form(page).locator('input[name="contact"]')).toBeHidden();
    expect(body).toEqual({ contact: 'reader@example.com', source: 'guide:prompt', website: '' });
  });

  test('an empty field sends nothing', async ({ page }) => {
    let posts = 0;
    await page.route(ENDPOINT, (route) => {
      posts += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/ai-guides/');
    await form(page).getByRole('button', { name: 'Tell me' }).click();
    await expect(form(page).locator('[data-notify-status]')).toHaveText('Please add your email or WhatsApp number.');
    expect(posts).toBe(0);
  });

  test('failure: a 500 (for example before the migration) says it did not send', async ({ page }) => {
    await page.route(ENDPOINT, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"could not save"}' }),
    );
    await page.goto('/ai-guides/');
    await form(page).locator('input[name="contact"]').fill('+1 916 555 0100');
    await form(page).getByRole('button', { name: 'Tell me' }).click();
    await expect(form(page).locator('[data-notify-status]')).toContainText("didn't send");
    await expect(form(page).getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(form(page).locator('input[name="contact"]')).toBeVisible();
  });

  test('no backend (dev builds): says nothing was sent and posts nothing', async ({ page }) => {
    let posts = 0;
    await page.route(ENDPOINT, (route) => {
      posts += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/ai-guides/');
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-notify-form]')!.dataset.endpoint = '';
    });
    await form(page).locator('input[name="contact"]').fill('reader@example.com');
    await form(page).getByRole('button', { name: 'Tell me' }).click();
    await expect(form(page).locator('[data-notify-status]')).toContainText("isn't collecting sign-ups here");
    expect(posts).toBe(0);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('says it needs JavaScript and gives the email address', async ({ page }) => {
      await page.goto('/ai-guides/');
      // Playwright's text matchers skip <noscript>, so read the paragraph inside it.
      const note = page.locator('[data-notify-form] noscript p');
      await expect(note).toBeVisible();
      await expect(note).toContainText('This form needs JavaScript');
      await expect(note).toContainText('admin@bustamam.tech');
    });
  });

  for (const path of ['/ai-guides/', `/ai-guides/${GUIDES[0]}/`]) {
    test(`${path} fits a phone screen without horizontal scroll`, async ({ page }) => {
      for (const width of [375, 320]) {
        await page.setViewportSize({ width, height: 812 });
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});
