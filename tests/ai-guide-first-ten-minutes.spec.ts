import { test, expect, type Page } from '@playwright/test';
import { UNCONFIRMED } from '../src/consts/guides/aiTools';
import { APPS, APP_FACT_ORDER, SCREEN_PARTS, formatChecked, oldestChecked } from '../src/consts/guides/chatScreen';

// /ai-guides/first-ten-minutes/: the schematic chat screen, the "where this is
// in your app" table and the page around them. Run after `bun run build`.

const PAGE = '/ai-guides/first-ten-minutes/';
const SCREEN = '[data-chat-screen]';

test.describe('first-ten-minutes: data', () => {
  test('the six parts are numbered 1 to 6 and each has a one-line explanation', () => {
    expect(SCREEN_PARTS.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const p of SCREEN_PARTS) {
      expect(p.name.trim().length, `${p.id}`).toBeGreaterThan(0);
      expect(p.line.trim().length, `${p.id}`).toBeGreaterThan(0);
      expect(p.line.split('\n').length).toBe(1);
    }
  });

  test('every fact has an https source and a checked date; an unconfirmed one carries no guessed text', () => {
    expect(APPS.map((a) => a.name)).toEqual(['ChatGPT', 'Gemini', 'Copilot', 'Claude']);
    for (const app of APPS) {
      for (const key of APP_FACT_ORDER) {
        const f = app.facts[key];
        expect(new URL(f.source).protocol, `${app.name} ${key}`).toBe('https:');
        expect(f.checked, `${app.name} ${key}`).toBe('2026-11-25');
        if (!f.confirmed) expect(f.text, `${app.name} ${key}`).toBe(UNCONFIRMED);
      }
    }
  });

  test('oldestChecked picks the oldest date, and formatChecked writes it in words', () => {
    const older = structuredClone(APPS);
    older[2].facts.account.checked = '2026-08-03';
    expect(oldestChecked(older)).toBe('2026-08-03');
    expect(oldestChecked(APPS)).toBe('2026-11-25');
    expect(formatChecked('2026-08-03')).toBe('August 3, 2026');
  });
});

test.describe('first-ten-minutes: page', () => {
  test('is listed on the hub in the "start from zero" group, in step order', async ({ page }) => {
    await page.goto('/ai-guides/');
    const section = page.locator('[data-hub-list="start"]');
    await expect(page.getByRole('heading', { name: 'Never used AI? Start from zero' })).toBeVisible();
    await expect(section.locator('li[data-guide-id="first-ten-minutes"]')).toHaveCount(1);
    const ids = await section.locator('> li').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.guideId));
    const steps = ids.indexOf('first-ten-minutes');
    expect(steps).toBeGreaterThanOrEqual(0);
    // Step 0.2 comes after what-is-ai (0.1) when that is published, and before everything else in the group.
    if (ids.includes('what-is-ai')) expect(ids.indexOf('what-is-ai')).toBeLessThan(steps);
    expect(ids.slice(0, steps).every((id) => id === 'what-is-ai')).toBe(true);
  });

  test('links to the guides the brief lists, and the term popovers are on', async ({ page }) => {
    await page.goto(PAGE);
    for (const href of [
      '/ai-guides/which-tool/', '/ai-guides/never-paste/', '/ai-guides/prompt/', '/ai-guides/usage-limits/',
      '/ai-guides/glossary/', '/ai-guides/does-it-remember/', '/ai-guides/photos-files-voice/',
    ]) {
      await expect(page.locator(`article a[href="${href}"]`).first(), href).toBeAttached();
    }
    // The one glossary entry for the words this post defines itself (chat, conversation) is not wrapped,
    // and the terms it does wrap are marked.
    await expect(page.locator('article [data-term="conversation"]')).toHaveCount(0);
    for (const id of ['chat-app', 'plan', 'chat-history', 'model', 'prompt', 'usage-limit']) {
      await expect(page.locator(`article [data-term="${id}"]`), id).toHaveCount(1);
    }
  });

  test('the three first questions and the follow-up are on the page, spelled American', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator('article').innerText();
    for (const q of [
      'Plan five weeknight dinners for four people. Nothing that takes more than 30 minutes.',
      'Explain what an escrow account is, as if I have never had a mortgage.',
      'Write a short, polite note to my neighbor about their dog barking early in the morning.',
      'Make two of those vegetarian.',
    ]) expect(text).toContain(q);
    expect(text).not.toMatch(/agonis|neighbour/i);
  });

  test('the table shows each fact with its source; unconfirmed cells say "Check the vendor\'s page" and link out', async ({ page }) => {
    await page.goto(PAGE);
    const oldest = oldestChecked(APPS);
    const stamp = page.locator('[data-last-checked]');
    await expect(stamp).toHaveAttribute('data-last-checked', oldest);
    await expect(stamp).toContainText(formatChecked(oldest));

    await expect(page.locator('[data-app-table] [data-app]')).toHaveCount(APPS.length);
    for (const app of APPS) {
      const row = page.locator(`[data-app="${app.id}"]`);
      await expect(row).toContainText(app.name);
      for (const key of APP_FACT_ORDER) {
        const f = app.facts[key];
        const cell = row.locator(`[data-fact="${key}"]`);
        await expect(cell.locator('a[data-source]')).toHaveAttribute('href', f.source);
        if (f.confirmed) await expect(cell).toContainText(f.text);
        else {
          await expect(cell).toHaveText(UNCONFIRMED);
          await expect(cell).toHaveAttribute('data-confirmed', 'false');
        }
      }
    }
    // The free-account answer comes straight from the account facts.
    await expect(page.locator('[data-app="claude"] [data-fact="account"]')).toContainText('mobile phone number');
  });
});

test.describe('first-ten-minutes: the labelled screen with JavaScript', () => {
  const open = async (page: Page) => {
    await page.goto(PAGE);
    await expect(page.locator(SCREEN)).toHaveAttribute('data-enhanced', '');
  };
  const badge = (page: Page, n: number) => page.locator(`${SCREEN} .cs-frame [data-badge="${n}"]`);

  test('clicking a number highlights that part and shows its line; clicking it again clears it', async ({ page }) => {
    await open(page);
    const readout = page.locator('[data-cs-readout]');
    await expect(readout).toBeVisible();
    await expect(page.locator(`${SCREEN} .cs-frame [data-active]`)).toHaveCount(0);
    for (const p of SCREEN_PARTS) {
      await badge(page, p.id).click();
      await expect(readout).toContainText(p.line);
      await expect(readout).toContainText(p.name);
      const lit = page.locator(`${SCREEN} .cs-frame [data-part][data-active]`);
      await expect(lit).toHaveCount(1);
      await expect(lit).toHaveAttribute('data-part', String(p.id));
      await expect(badge(page, p.id)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`${SCREEN} [data-legend][data-active]`)).toHaveAttribute('data-legend', String(p.id));
    }
    await badge(page, 6).click();
    await expect(page.locator(`${SCREEN} [data-active]`)).toHaveCount(0);
    await expect(readout).not.toContainText(SCREEN_PARTS[5].line);
  });

  test('works from the keyboard: Tab to a number, Enter or Space picks it', async ({ page }) => {
    await open(page);
    const readout = page.locator('[data-cs-readout]');
    await badge(page, 3).focus();
    await expect(badge(page, 3)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(readout).toContainText(SCREEN_PARTS[2].line);
    await badge(page, 2).focus();
    await page.keyboard.press('Space');
    await expect(readout).toContainText(SCREEN_PARTS[1].line);
    await expect(page.locator(`${SCREEN} .cs-frame [data-part][data-active]`)).toHaveAttribute('data-part', '2');
    // Tab reaches the numbers in turn without a mouse.
    await badge(page, 6).focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-badge', '4');
  });

  test('the list under the drawing works too', async ({ page }) => {
    await open(page);
    await page.locator(`${SCREEN} [data-legend-btn="5"]`).click();
    await expect(page.locator('[data-cs-readout]')).toContainText(SCREEN_PARTS[4].line);
    await expect(page.locator(`${SCREEN} .cs-frame [data-part="5"]`)).toHaveAttribute('data-active', '');
  });

  test('the drawing names no vendor and carries no logo or image', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator(`${SCREEN} .cs-frame`).innerText();
    expect(text).not.toMatch(/chatgpt|gemini|copilot|claude|openai|google|microsoft|anthropic/i);
    await expect(page.locator(`${SCREEN} img, ${SCREEN} svg`)).toHaveCount(0);
  });

  test('at 375px the side list is the menu it collapses into, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE);
    await expect(page.locator(`${SCREEN} .cs-menu-title`)).toBeVisible();
    await expect(page.locator(`${SCREEN} .cs-menu-title`)).toHaveText('Menu');
    const side = await page.locator(`${SCREEN} .cs-side`).boundingBox();
    const main = await page.locator(`${SCREEN} .cs-main`).boundingBox();
    expect(side!.y + side!.height).toBeLessThanOrEqual(main!.y + 1); // stacked above the conversation, not beside it
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    for (const p of SCREEN_PARTS) await expect(badge(page, p.id)).toBeVisible();
  });

  test('at 1280px the side list sits beside the conversation and the menu title is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PAGE);
    await expect(page.locator(`${SCREEN} .cs-menu-title`)).toBeHidden();
    const side = await page.locator(`${SCREEN} .cs-side`).boundingBox();
    const main = await page.locator(`${SCREEN} .cs-main`).boundingBox();
    expect(side!.x + side!.width).toBeLessThanOrEqual(main!.x + 1);
  });

  test('the table at 375px does not scroll sideways either', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PAGE);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});

test.describe('first-ten-minutes: with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('the numbered legend shows all six lines and the drawing keeps its numbers', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator(SCREEN)).not.toHaveAttribute('data-enhanced', '');
    const items = page.locator(`${SCREEN} [data-legend]`);
    await expect(items).toHaveCount(6);
    for (let i = 0; i < SCREEN_PARTS.length; i++) {
      await expect(items.nth(i)).toBeVisible();
      await expect(items.nth(i)).toContainText(SCREEN_PARTS[i].name);
      await expect(items.nth(i)).toContainText(SCREEN_PARTS[i].line);
      await expect(page.locator(`${SCREEN} .cs-frame [data-badge="${i + 1}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-cs-readout]')).toBeHidden();
  });

  test('the table is still there with its sources', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-app-table] [data-app]')).toHaveCount(4);
    await expect(page.locator('[data-app-table] a[data-source]')).toHaveCount(12);
  });
});
