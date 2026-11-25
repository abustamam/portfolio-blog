import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scrub, restore } from '../src/utils/scrub';

// Page tests read the built site: run `bun run build` first.
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-guides/never-paste/';

test.describe('scrub() rules', () => {
  test('emails, numbered by first appearance, same value same placeholder', () => {
    const r = scrub('a@x.com, b@y.org, A@X.com');
    expect(r.text).toBe('EMAIL-1, EMAIL-2, EMAIL-1');
    expect(r.key).toEqual([
      { placeholder: 'EMAIL-1', original: 'a@x.com' },
      { placeholder: 'EMAIL-2', original: 'b@y.org' },
    ]);
  });

  test('phone numbers in common formats', () => {
    const r = scrub('(555) 123-4567, 555-123-4567, 5551234567, +44 20 7946 0958');
    expect(r.text).toBe('PHONE-1, PHONE-1, PHONE-1, PHONE-2');
  });

  test('card-like and long digit runs become ACCOUNT-n', () => {
    const r = scrub('card 4111 1111 1111 1111, acct 1234-5678-9012, ref 123456789, again 123456789');
    expect(r.text).toBe('card ACCOUNT-1, acct ACCOUNT-2, ref ACCOUNT-3, again ACCOUNT-3');
  });

  test('a year, a price and short numbers are left alone', () => {
    const text = 'In 2024 it cost $1,299.00 for 12 items, order 12345678, 3 pm.';
    expect(scrub(text).text).toBe(text);
  });

  test('custom names: every case variant, whole word only', () => {
    const r = scrub('Dana met DANA and dana. Danae is different.', ['Dana']);
    expect(r.text).toBe('PERSON-1 met PERSON-1 and PERSON-1. Danae is different.');
    expect(r.key).toEqual([{ placeholder: 'PERSON-1', original: 'Dana' }]);
  });

  test('names with regex characters are matched literally; an email wins over a name inside it', () => {
    expect(scrub('Ask J. (Jo) now', ['J. (Jo)']).text).toBe('Ask PERSON-1 now');
    expect(scrub('dana@x.com', ['dana']).text).toBe('EMAIL-1');
  });

  test('the key maps every placeholder back and the round trip is exact', () => {
    const input = 'Dana (dana@x.com, 555-123-4567) paid with 4111 1111 1111 1111. Sam <sam@y.org> saw Dana. Dana again.';
    const r = scrub(input, ['Dana', 'Sam']);
    for (const p of r.text.match(/(?:EMAIL|PHONE|ACCOUNT|PERSON)-\d+/g)!) {
      expect(r.key.some((k) => k.placeholder === p)).toBe(true);
    }
    expect(restore(r.text, r.key)).toBe(input);
  });
});

test.describe('Scrubber on the page', () => {
  test('typing fills the output and key; both copy buttons copy the right text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    await page.locator('[data-scrub-in]').fill('Mail dana@x.com or call 555-123-4567.');
    await page.locator('[data-scrub-name]').fill('Dana');
    await page.locator('[data-scrub-add]').click();
    await page.locator('[data-scrub-in]').fill('Dana: dana@x.com or 555-123-4567.');
    await expect(page.locator('[data-scrub-out]')).toHaveValue('PERSON-1: EMAIL-1 or PHONE-1.');
    await expect(page.locator('[data-scrub-key] tbody tr')).toHaveCount(3);

    await page.locator('[data-copy-safe]').click();
    await expect(page.locator('[data-scrub-status]')).toContainText('Safe text copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('PERSON-1: EMAIL-1 or PHONE-1.');

    await page.locator('[data-copy-key]').click();
    await expect(page.locator('[data-scrub-status]')).toContainText('Key copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('EMAIL-1 = dana@x.com\nPHONE-1 = 555-123-4567\nPERSON-1 = Dana');
  });

  test('zero network requests while typing and copying; nothing in the URL or storage', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.locator('[data-scrub-in]').pressSequentially('secret@x.com 4111 1111 1111 1111', { delay: 5 });
    await page.locator('[data-scrub-name]').fill('Dana');
    await page.locator('[data-scrub-add]').click();
    await page.locator('[data-copy-safe]').click();
    await page.locator('[data-copy-key]').click();
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    expect(page.url()).toContain(PAGE);
    expect(page.url()).not.toMatch(/secret|\?|#/);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain('secret');
    expect(stored).not.toContain('4111');
  });

  test('after a reload the textarea is empty', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('[data-scrub-in]').fill('x@y.com');
    await expect(page.locator('[data-scrub-out]')).toHaveValue('EMAIL-1');
    await page.reload();
    await expect(page.locator('[data-scrub-in]')).toHaveValue('');
    await expect(page.locator('[data-scrub-out]')).toHaveValue('');
  });

  test('the Scrubber sits after the three-step section and before the checklist; the checklist is tickable', async ({ page }) => {
    await page.goto(PAGE);
    const order = await page.evaluate(() => {
      const pos = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + scrollY;
      return [pos('#make-a-file-safe-in-three-steps'), pos('[data-scrubber]'), pos('#check-before-you-press-enter')];
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
    const box = page.locator('article .task-list-item input[type="checkbox"]').first();
    await box.check();
    await expect(box).toBeChecked();
  });

  test('shows the privacy line and the check-names-yourself note, and a before/after table pair', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-scrubber]')).toContainText('Nothing you type here leaves this page');
    await expect(page.locator('[data-scrubber]')).toContainText('Check names yourself');
    await expect(page.locator('.ba-grid table')).toHaveCount(2);
  });

  test('the cohort handout has no scrubber and keeps its text', async ({ page }) => {
    const cohort = readFileSync(`${DIST}ai-cohort/never-paste/index.html`, 'utf8');
    expect(cohort).not.toContain('data-scrubber');
    expect(cohort).toContain('id="make-a-file-safe-in-three-steps"');
    await page.goto('/ai-cohort/never-paste/');
    await expect(page.locator('[data-scrubber]')).toHaveCount(0);
  });
});
