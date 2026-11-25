import { test, expect } from '@playwright/test';
import {
  ACTIONS,
  ALLOWANCE,
  NO_SWITCHES,
  costOf,
  runJob,
  scenarioTotals,
  spend,
} from '../src/utils/allowance';
import { AI_TOOLS } from '../src/consts/guides/aiTools';
import {
  LIMIT_ORDER,
  UNCONFIRMED,
  USAGE_LIMITS,
  allUsageFacts,
  oldestChecked,
  paidFact,
} from '../src/consts/guides/usageLimits';

// /ai-guides/usage-limits/: the allowance arithmetic, the vendor facts, and the
// page built from them. Run after `bun run build`.

const PAGE = '/ai-guides/usage-limits/';

// Words that would plug the course. Allowed only inside the GuideCta block.
const COURSE_WORDS = /\b(tracks?|training|courses?|cohorts?)\b/i;
const WE_WORDS = /\b(we|we['’](d|re|ll|ve)|our|ours)\b/i;

const onDomain = (url: string, domains: string[]) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' && domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
};

test.describe('usage-limits: arithmetic', () => {
  test('the unit costs are the ones the page promises', () => {
    expect(ACTIONS.map((a) => [a.id, a.units])).toEqual([
      ['short', 1],
      ['backAndForth', 8],
      ['pdf', 15],
      ['pdfQuestion', 6],
    ]);
    expect(costOf(6, { large: true, thinking: false, longChat: false })).toBe(18);
    expect(costOf(6, { large: false, thinking: true, longChat: false })).toBe(12);
    expect(costOf(6, { large: true, thinking: true, longChat: false })).toBe(36);
    expect(costOf(6, { large: false, thinking: false, longChat: true })).toBe(9);
  });

  test('the same job totals 45, 63 and 135, and the large model is cut off after three further questions', () => {
    const [everyday, long, large] = scenarioTotals().map((s) => s.result);
    expect(everyday.total).toBe(45);
    expect(long.total).toBe(63);
    expect(large.total).toBe(135);

    expect(everyday.cutOffAtMessage).toBeNull();
    expect(long.cutOffAtMessage).toBeNull();

    // 45 + 3 x 18 = 99 fits; the fourth further question would pass 100.
    expect(large.usedBeforeCutOff).toBe(99);
    expect(large.followUpsDone).toBe(3);
    expect(large.cutOffAtMessage).toBe(5);
    expect(large.spent).toBe(ALLOWANCE);
  });

  test('spend never goes below 0, and an action that does not fit takes the rest and hits the limit', () => {
    expect(spend(100, 15)).toMatchObject({ remaining: 85, charged: 15, hitLimit: false });
    expect(spend(15, 15)).toMatchObject({ remaining: 0, charged: 15, hitLimit: false });
    expect(spend(1, 6, { ...NO_SWITCHES, large: true })).toMatchObject({ remaining: 0, charged: 1, cost: 18, hitLimit: true });
    expect(spend(0, 1)).toMatchObject({ remaining: 0, charged: 0, hitLimit: true });
  });
});

test.describe('usage-limits: data', () => {
  test('four apps, every fact has an https source on that vendor, a checked date, and an unconfirmed fact says so', () => {
    expect(USAGE_LIMITS.map((a) => a.id)).toEqual(['chatgpt', 'gemini', 'copilot', 'claude']);
    for (const app of USAGE_LIMITS) {
      const tool = AI_TOOLS.find((t) => t.id === app.id)!;
      expect(Object.keys(app.facts).sort()).toEqual([...LIMIT_ORDER].sort());
      for (const key of LIMIT_ORDER) {
        const f = app.facts[key];
        const where = `${app.id}.${key}`;
        expect(onDomain(f.source, tool.domains), `${where} ${f.source}`).toBe(true);
        expect(f.checked, where).toBe('2026-11-25');
        expect(f.text.trim().length, where).toBeGreaterThan(0);
      }
    }
    // ChatGPT's usage page, and Copilot's refill and usage page, are not stated by the vendor.
    expect(allUsageFacts().filter((f) => !f.confirmed).length).toBe(3);
  });

  test('the paid price is imported from aiTools.ts, not copied', () => {
    for (const app of USAGE_LIMITS) {
      expect(paidFact(app.id)).toBe(AI_TOOLS.find((t) => t.id === app.id)!.facts.paid);
    }
    // The oldest checked date covers the imported facts too.
    expect(oldestChecked()).toBe(allUsageFacts().map((f) => f.checked).sort()[0]);
    expect(oldestChecked() <= '2026-11-25').toBe(true);
  });
});

test.describe('usage-limits: page, with JavaScript', () => {
  test('is listed on the hub in the "start from zero" group, in step order', async ({ page }) => {
    await page.goto('/ai-guides/');
    const list = page.locator('[data-hub-list="start"]');
    await expect(list).toBeVisible();
    await expect(page.locator('[data-hub-group-heading="start"]')).toHaveText('Never used AI? Start from zero');
    const steps = await list.locator('[data-guide-id]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-guide-id'), Number(e.getAttribute('data-step'))] as const));
    expect(steps.map((s) => s[0])).toContain('usage-limits');
    expect(steps.find((s) => s[0] === 'usage-limits')![1]).toBe(0.3);
    const nums = steps.map((s) => s[1]);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    // Not in the main list.
    await expect(page.locator('[data-hub-list="guides"] [data-guide-id="usage-limits"]')).toHaveCount(0);
  });

  test('the date at the top is the oldest checked date; the table has one row per app and links every source', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-last-checked]')).toHaveAttribute('data-last-checked', oldestChecked());
    const rows = page.locator('[data-limits-table] tbody tr');
    await expect(rows).toHaveCount(USAGE_LIMITS.length);
    for (const app of USAGE_LIMITS) {
      const row = page.locator(`[data-limits-table] tr[data-app="${app.id}"]`);
      for (const key of LIMIT_ORDER) {
        const f = app.facts[key];
        const cell = row.locator(`td[data-fact="${key}"]`);
        await expect(cell.locator('a[data-source]')).toHaveAttribute('href', f.source);
        if (f.confirmed) await expect(cell).toContainText(f.text);
        else {
          await expect(cell).toContainText(UNCONFIRMED);
          await expect(cell).not.toContainText('(not stated)');
        }
      }
      const paid = paidFact(app.id);
      await expect(row.locator('td[data-fact="paid"]')).toContainText(paid.text);
      await expect(row.locator('td[data-fact="paid"] a[data-source]')).toHaveAttribute('href', paid.source);
    }
  });

  test('links the three sister guides, the glossary token entry and says what the page cannot tell you', async ({ page }) => {
    await page.goto(PAGE);
    for (const href of ['/ai-guides/which-model/', '/ai-guides/does-it-remember/', '/ai-guides/glossary/#token']) {
      await expect(page.locator(`article a[href="${href}"]`).first(), href).toHaveCount(1);
    }
    await expect(page.locator('article a[href^="/ai-guides/which-tool/"]').first()).toBeVisible();
    await expect(page.locator('article a[href="/ai-guides/glossary/"], article a[href^="/ai-guides/glossary/"]').first()).toBeVisible();
    await expect(page.locator('article h2', { hasText: 'What this page cannot tell you' })).toHaveCount(1);
  });

  test('the static bars show 45, 63 and 135 with the cut-off', async ({ page }) => {
    await page.goto(PAGE);
    const expected = { new: 45, long: 63, large: 135 } as const;
    for (const [id, total] of Object.entries(expected)) {
      const row = page.locator(`[data-scenario="${id}"]`);
      await expect(row.locator('[data-al-total]')).toHaveText(String(total));
    }
    await expect(page.locator('[data-scenario="large"]')).toContainText('cut off at 100');
    await expect(page.locator('[data-scenario="large"]')).toContainText('only 3 of 5');
  });

  test('the meter drains by the same numbers, multiplies with the switches and refills after the wait', async ({ page }) => {
    await page.goto(PAGE);
    const meter = page.locator('[data-allowance]');
    await expect(meter).toBeVisible();
    const left = meter.locator('[data-al-left]');
    const bar = meter.locator('[data-al-bar]');
    await expect(left).toHaveText('100');

    // Everyday model, new chat: 15 + 5 x 6 = 45 -> 55 left.
    await meter.locator('[data-al-action="pdf"]').click();
    for (let i = 0; i < 5; i++) await meter.locator('[data-al-action="pdfQuestion"]').click();
    await expect(left).toHaveText('55');
    await expect(bar).toHaveAttribute('aria-valuenow', '55');
    await expect(meter.locator('[data-al-log] li')).toHaveCount(6);
    await meter.locator('[data-al-reset]').click();
    await expect(left).toHaveText('100');

    // Late in a long chat: 63 -> 37 left. The costs on the buttons change first.
    await meter.locator('[data-al-switch="longChat"]').check();
    await expect(meter.locator('[data-al-action="pdfQuestion"] [data-al-cost]')).toHaveText('9');
    await meter.locator('[data-al-action="pdf"]').click();
    for (let i = 0; i < 5; i++) await meter.locator('[data-al-action="pdfQuestion"]').click();
    await expect(left).toHaveText('37');
    await meter.locator('[data-al-reset]').click();
    await meter.locator('[data-al-switch="longChat"]').uncheck();

    // Large model: three further questions leave 1; the fourth hits the limit.
    await meter.locator('[data-al-switch="large"]').check();
    await meter.locator('[data-al-action="pdf"]').click();
    for (let i = 0; i < 3; i++) await meter.locator('[data-al-action="pdfQuestion"]').click();
    await expect(left).toHaveText('1');
    await expect(meter.locator('[data-al-limit]')).toBeHidden();
    await meter.locator('[data-al-action="pdfQuestion"]').click();
    await expect(left).toHaveText('0');
    await expect(meter.locator('[data-al-limit]')).toBeVisible();
    await expect(meter.locator('[data-al-limit]')).toContainText("You've reached your limit. Try again at 4:00 pm.");
    await expect(meter.locator('[data-al-action="pdf"]')).toBeDisabled();

    // Thinking multiplies too (x3 x2 = x6): checked on the button, then refill.
    await meter.locator('[data-al-wait]').click();
    await expect(left).toHaveText('100');
    await expect(meter.locator('[data-al-limit]')).toBeHidden();
    await meter.locator('[data-al-switch="thinking"]').check();
    await expect(meter.locator('[data-al-action="short"] [data-al-cost]')).toHaveText('6');
  });

  test('the meter works from the keyboard and announces changes politely', async ({ page }) => {
    await page.goto(PAGE);
    const meter = page.locator('[data-allowance]');
    await expect(meter.locator('[data-al-live]')).toHaveAttribute('aria-live', 'polite');
    const btn = meter.locator('[data-al-action="backAndForth"]');
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(meter.locator('[data-al-left]')).toHaveText('92');
    await expect(meter.locator('[data-al-live]')).toContainText('Spent 8. 92 of 100 left.');
    await page.keyboard.press('Space');
    await expect(meter.locator('[data-al-left]')).toHaveText('84');
    // A switch is a checkbox: Space toggles it.
    const large = meter.locator('[data-al-switch="large"]');
    await large.focus();
    await page.keyboard.press('Space');
    await expect(large).toBeChecked();
  });

  test('labels the numbers as made up', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.allowance__made-up')).toContainText('made up');
  });

  test('the page never mentions the training above the call to action and never says "we"', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.evaluate(() =>
      [...document.querySelectorAll('[data-guide] > header, [data-guide] > article')].map((el) => el.textContent ?? '').join('\n'),
    );
    expect(text.length).toBeGreaterThan(2000);
    expect(text.match(COURSE_WORDS)?.[0], 'course word above the CTA').toBeUndefined();
    expect(text.match(WE_WORDS)?.[0], '"we" in the prose').toBeUndefined();
    await expect(page.locator('[data-guide-cta]')).toHaveCount(1);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`${scheme} mode renders the bars and the meter`, async ({ page }) => {
      await page.addInitScript((s) => localStorage.setItem('theme', s), scheme);
      await page.goto(PAGE);
      await expect(page.locator('[data-allowance]')).toBeVisible();
    });
  }
});

test.describe('usage-limits: 375px', () => {
  test('no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
    // Also at the limit, where the timeline shows.
    const meter = page.locator('[data-allowance]');
    await meter.locator('[data-al-switch="large"]').check();
    await meter.locator('[data-al-switch="thinking"]').check();
    await meter.locator('[data-al-action="pdf"]').click();
    await meter.locator('[data-al-action="pdf"]').click();
    await expect(meter.locator('[data-al-limit]')).toBeVisible();
    const after = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(after).toBeLessThanOrEqual(0);
  });
});

test.describe('usage-limits: JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('the three bars still make the point and the meter stays hidden', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-allowance]')).toBeHidden();
    const totals = await page.locator('[data-scenario] [data-al-total]').allTextContents();
    expect(totals).toEqual(['45', '63', '135']);
    await expect(page.locator('[data-scenario="large"]')).toContainText('cut off at 100');
    await expect(page.locator('.allowance__made-up')).toBeVisible();
    await expect(page.locator('[data-limits-table]')).toBeVisible();
  });
});
