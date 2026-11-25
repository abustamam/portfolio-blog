import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scrub, restore } from '../src/utils/scrub';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';

// Page tests read the built site: run `bun run build` first.
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGE = '/ai-guides/never-paste/';
// The invented sample the Scrubber's box starts with (src/components/guides/Scrubber.astro).
const SAMPLE =
  'Made-up example: Hi, this is Dana Lee. Email me at dana.lee@example.com or call 555-123-4567. My card number is 4111 1111 1111 1111.';

// The one sessionStorage flag the site itself writes on every page's first load
// (src/components/BrandLogo.astro, the wordmark draw-in). It holds no user data, so the
// storage checks below ignore exactly this key with exactly this value and nothing else.
const WORDMARK_FLAG: readonly [string, string] = ['wordmark-drawn', '1'];
const isWordmarkFlag = (k: string, v: string) => k === WORDMARK_FLAG[0] && v === WORDMARK_FLAG[1];

// Everything in local and session storage as one string, minus the site's own wordmark flag.
async function storedText(page: Page): Promise<string> {
  const [local, session] = await page.evaluate(() => [{ ...localStorage }, { ...sessionStorage }]);
  const [flagKey, flagValue] = WORDMARK_FLAG;
  if (session[flagKey] === flagValue) delete session[flagKey];
  return JSON.stringify(local) + JSON.stringify(session);
}

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

  test('a full name is one person: the phrase and each part share one PERSON-n', () => {
    const r = scrub('Dana Lee paid. Ms Lee called. Dana said hi.', ['Dana Lee']);
    expect(r.text).toBe('PERSON-1 paid. Ms PERSON-1 called. PERSON-1 said hi.');
  });

  test('the full phrase is matched before its parts (never PERSON-1 PERSON-1)', () => {
    const r = scrub('Dana Lee and DANA   LEE', ['Dana Lee']);
    expect(r.text).toBe('PERSON-1 and PERSON-1');
    expect(r.text).not.toContain('PERSON-1 PERSON-1');
  });

  test('a part shared by two entries goes to the entry added first; full phrases keep their own', () => {
    const r = scrub('Dana Lee, Sam Lee, Lee, Sam, Dana', ['Dana Lee', 'Sam Lee']);
    expect(r.text).toBe('PERSON-1, PERSON-2, PERSON-1, PERSON-2, PERSON-1');
    const flipped = scrub('Lee', ['Sam Lee', 'Dana Lee']);
    expect(flipped.text).toBe('PERSON-1');
  });

  test('parts and phrase match when capitalised, whole words only', () => {
    const r = scrub('DANA LEE, Dana, LEE, Leeds, Danae', ['Dana Lee']);
    expect(r.text).toBe('PERSON-1, PERSON-1, PERSON-1, Leeds, Danae');
  });

  test('a part of a full name in lower case is left alone', () => {
    expect(scrub('dana and lee and dana lee', ['Dana Lee']).text).toBe('dana and lee and dana lee');
    expect(scrub('Dana lee', ['Dana Lee']).text).toBe('PERSON-1 lee');
  });

  test('a name made of ordinary words replaces only the capitalised words (Rose May)', () => {
    expect(scrub('Rose May said we may need a rose for May.', ['Rose May']).text).toBe(
      'PERSON-1 said we may need a rose for PERSON-1.',
    );
  });

  test('a lower-case run of a name\'s words is left alone (Will Grant)', () => {
    expect(scrub('Will Grant will grant it.', ['Will Grant']).text).toBe('PERSON-1 will grant it.');
  });

  test('a single-word entry still matches only that word', () => {
    const r = scrub('Dana Lee and Dana', ['Dana']);
    expect(r.text).toBe('PERSON-1 Lee and PERSON-1');
  });

  test('the key shows the full entry as typed, and an email with the name stays an email', () => {
    const r = scrub('Lee wrote from dana.lee@x.com', ['Dana Lee']);
    expect(r.text).toBe('PERSON-1 wrote from EMAIL-1');
    expect(r.key).toEqual([
      { placeholder: 'EMAIL-1', original: 'dana.lee@x.com' },
      { placeholder: 'PERSON-1', original: 'Dana Lee' },
    ]);
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
    await expect(page.locator('[data-scrub-status]')).toContainText('Text copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('PERSON-1: EMAIL-1 or PHONE-1.');

    await page.locator('[data-copy-key]').click();
    await expect(page.locator('[data-scrub-status]')).toContainText('Key copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('EMAIL-1 = dana@x.com\nPHONE-1 = 555-123-4567\nPERSON-1 = Dana');
  });

  test('adding a full name in the page replaces the phrase and each part', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('[data-scrub-name]').fill('Dana Lee');
    await page.locator('[data-scrub-add]').click();
    await page.locator('[data-scrub-in]').fill('Dana Lee paid. Ms Lee called. Dana said hi.');
    await expect(page.locator('[data-scrub-out]')).toHaveValue('PERSON-1 paid. Ms PERSON-1 called. PERSON-1 said hi.');
    await expect(page.locator('[data-scrub-key] tbody tr')).toHaveText('PERSON-1Dana Lee');
  });

  test('zero network requests while typing and copying; nothing in the URL or storage', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.locator('[data-scrub-in]').fill('');
    await page.locator('[data-scrub-in]').pressSequentially('secret@x.com 4242 4242 4242 4242', { delay: 5 });
    await page.locator('[data-scrub-name]').fill('Dana');
    await page.locator('[data-scrub-add]').click();
    await page.locator('[data-copy-safe]').click();
    await page.locator('[data-copy-key]').click();
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    expect(page.url()).toContain(PAGE);
    expect(page.url()).not.toMatch(/secret|\?|#/);
    const stored = await storedText(page);
    expect(stored).not.toContain('secret');
    expect(stored).not.toContain('4242');
  });

  test('the box starts with the sample and its safe version, with no typing', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-scrub-in]')).toHaveValue(SAMPLE);
    await expect(page.locator('[data-scrub-out]')).toHaveValue(
      'Made-up example: Hi, this is Dana Lee. Email me at EMAIL-1 or call PHONE-1. My card number is ACCOUNT-1.',
    );
    await expect(page.locator('[data-scrub-key] tbody tr')).toHaveCount(3);
    await expect(page.locator('[data-scrubber]')).toContainText('made-up example');
  });

  test('loading the page with the sample writes nothing but guideStore, and never the sample', async ({ page }) => {
    await page.addInitScript(() => {
      const writes: string[][] = [];
      (window as unknown as { __writes: string[][] }).__writes = writes;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        writes.push([k, v]);
        return orig.call(this, k, v);
      };
    });
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-scrub-out]')).toHaveValue(/EMAIL-1/);
    const writes = await page.evaluate(() => (window as unknown as { __writes: string[][] }).__writes);
    // The layout marks the guide visited through guideStore, so the recorder is seen working.
    expect(writes.length).toBeGreaterThan(0);
    for (const [k, v] of writes) {
      if (isWordmarkFlag(k, v)) continue;
      expect(k).toBe(GUIDE_STORE_KEY);
      expect(v).not.toMatch(/dana|4111|555-123|Made-up/i);
    }
    const stored = await storedText(page);
    expect(stored).not.toMatch(/dana|4111|555-123|Made-up/i);
  });

  test('after a reload the typed text is gone and the sample is back', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('[data-scrub-in]').fill('x@y.com');
    await expect(page.locator('[data-scrub-out]')).toHaveValue('EMAIL-1');
    await page.reload();
    await expect(page.locator('[data-scrub-in]')).toHaveValue(SAMPLE);
    await expect(page.locator('[data-scrub-out]')).not.toHaveValue(/x@y\.com|^EMAIL-1$/);
  });

  test('the demo is headed "See it in action", labelled for unapproved accounts, and says the tool is optional', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-scrubber] h2')).toHaveText('See it in action');
    await expect(page.locator('[data-scrub-account]')).toHaveText(
      "This is for a personal account, or one your employer hasn't approved. On an approved work account, follow your employer's rules instead.",
    );
    await expect(page.locator('[data-scrub-habit]')).toHaveText(
      "You don't need this tool. Find-and-replace in your own document does the same job, and that's the habit to keep.",
    );
  });

  test('the page has the account-first title, lead and description, and opens with the account question', async ({ page }) => {
    await page.goto(PAGE);
    // The title is typed with a straight apostrophe; the page curls it.
    await expect(page.locator('h1')).toHaveText('What’s safe to paste into AI');
    await expect(page.locator('.ai-lead')).toHaveText(
      'Whatever you paste into an AI chat leaves your computer. What you may paste depends on which account you use, so start there.',
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      "Check which account you're using first, then what to keep out of an AI chat and how to make a file safe in three steps.",
    );
    const firstH2 = await page.locator('article h2').first().getAttribute('id');
    expect(firstH2).toBe('first-which-account');
    const order = await page.evaluate(() => {
      const pos = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + scrollY;
      return [pos('#first-which-account'), pos('[data-scrubber]'), pos('#check-before-you-press-enter')];
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
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
