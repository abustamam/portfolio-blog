import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

// Every <form> on the site is submitted by a script. When that script has not
// run (JavaScript off or blocked, or a click before it loads), the browser
// submits the form itself. Without method="post" that is a GET, and whatever
// was typed (name, email, WhatsApp number) lands in the URL and so in the
// server's access logs. Run after `bun run build`: the first test reads dist/.

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

test('every form in the built site declares method="post"', () => {
  const pages = (readdirSync(DIST, { recursive: true }) as string[]).filter((f) => f.endsWith('.html'));
  expect(pages.length).toBeGreaterThan(20);
  const missing: string[] = [];
  let forms = 0;
  for (const page of pages) {
    for (const [tag] of readFileSync(DIST + page, 'utf8').matchAll(/<form\b[^>]*>/gi)) {
      forms += 1;
      if (!/\smethod="post"/i.test(tag)) missing.push(`${page}: ${tag.slice(0, 80)}`);
    }
  }
  expect(forms).toBeGreaterThan(0);
  expect(missing).toEqual([]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const { path, form } of [
    { path: '/ai-cohort/waitlist/', form: '#cohort-waitlist' },
    { path: '/ai-cohort/intake/', form: '#cohort-intake' },
    { path: '/ai-guides/', form: '[data-notify-form]' },
  ]) {
    test(`${path}: the browser's own submit keeps the contact out of the URL`, async ({ page }) => {
      await page.goto(path);
      await page.locator(`${form} input[name="contact"]`).fill('reader@example.com');
      const [request] = await Promise.all([
        page.waitForRequest((r) => r.isNavigationRequest()),
        page.locator(`${form} button[type="submit"]`).click(),
      ]);
      expect(request.method()).toBe('POST');
      expect(request.url()).not.toContain('reader');
      expect(new URL(request.url()).search).toBe('');
    });
  }
});
