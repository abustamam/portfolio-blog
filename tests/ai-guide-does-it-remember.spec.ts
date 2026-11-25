import { test, expect } from '@playwright/test';
import {
  FRAME_SIZE,
  LAST,
  MESSAGES,
  RESET_MESSAGES,
  CAPTION,
  COMPACTION_FACTS,
  MEMORY_CHECKED,
  MEMORY_FACTS,
  COMPACTION_CHECKED,
  windowFor,
  isVisible,
  showCaption,
} from '../src/consts/guides/contextWindow';

// /ai-guides/does-it-remember/: the window figure, its arithmetic and the page.
// Run after `bun run build`.

const PAGE = '/ai-guides/does-it-remember/';

test.describe('does-it-remember: the arithmetic', () => {
  test('the script is the twelve messages the issue describes, and the frame holds eight', () => {
    expect(FRAME_SIZE).toBe(8);
    expect(MESSAGES.map((m) => m.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(MESSAGES.map((m) => m.who)).toEqual(['You', 'AI', 'You', 'AI', 'You', 'AI', 'You', 'AI', 'You', 'AI', 'You', 'AI']);
    expect(MESSAGES[0].text).toContain('allergic to nuts');
    expect(MESSAGES[11].text.toLowerCase()).toContain('peanut');
  });

  test('the frame covers the last eight, and covers 5 to 12 at message 12', () => {
    expect(windowFor(4)).toEqual({ from: 1, to: 4, outside: 0 });
    expect(windowFor(8)).toEqual({ from: 1, to: 8, outside: 0 });
    expect(windowFor(9)).toEqual({ from: 2, to: 9, outside: 1 });
    expect(windowFor(12)).toEqual({ from: 5, to: 12, outside: 4 });
    expect(isVisible(1, 8)).toBe(true);
    expect(isVisible(1, 9)).toBe(false);
    expect(isVisible(1, 12)).toBe(false);
    expect(isVisible(5, 12)).toBe(true);
  });

  test('the caption shows at message 12 and at no other count', () => {
    for (let c = 1; c <= LAST; c++) expect(showCaption(c), `count ${c}`).toBe(c === 12);
  });

  test('the summary state is two messages and nut-free', () => {
    expect(RESET_MESSAGES).toHaveLength(2);
    expect(RESET_MESSAGES[0].text).toContain('allergic to nuts');
    expect(RESET_MESSAGES[1].text).toMatch(/nut-free/i);
    expect(RESET_MESSAGES[1].text).not.toMatch(/peanut|trail mix/i);
  });
});

test.describe('does-it-remember: with JavaScript', () => {
  test('Next message adds one at a time; frame, greying and caption follow the arithmetic', async ({ page }) => {
    await page.goto(PAGE);
    const live = page.locator('[data-cw-live]');
    await expect(live).toBeVisible();
    await expect(page.locator('[data-cw-static]')).toBeHidden();
    const next = live.locator('[data-cw-next]');
    const caption = live.locator('[data-cw-caption]');
    const status = live.locator('[data-cw-status]');
    await expect(live.locator('[data-n]')).toHaveCount(1);

    for (let c = 2; c <= LAST; c++) {
      await next.click();
      const w = windowFor(c);
      await expect(live.locator('[data-n]'), `count ${c}`).toHaveCount(c);
      await expect(live.locator('[data-cw-in] [data-n]'), `in view at ${c}`).toHaveCount(w.to - w.from + 1);
      await expect(live.locator('[data-cw-out] [data-n]'), `out at ${c}`).toHaveCount(w.outside);
      if (w.outside > 0) {
        await expect(live.locator('[data-cw-out] [data-n]').first()).toContainText('it can no longer see this');
        await expect(live.locator('[data-cw-out] [data-n]').first()).toHaveAttribute('data-state', 'out');
      }
      await expect(status).toContainText(`Message ${c} added`);
      if (c === 11) await expect(caption).toBeHidden();
    }
    // Message 12: frame covers 5-12, message 1 is outside, the answer has nuts, the caption is up.
    await expect(live.locator('[data-cw-in] [data-n]').first()).toHaveAttribute('data-n', '5');
    await expect(live.locator('[data-cw-out] [data-n="1"]')).toHaveCount(1);
    await expect(live.locator('[data-cw-in] [data-n="12"]')).toContainText(/peanut/i);
    await expect(caption).toBeVisible();
    await expect(caption).toHaveText(CAPTION);
    await expect(next).toBeDisabled();
  });

  test('the summary button resets to two messages with a nut-free answer; start again goes back', async ({ page }) => {
    await page.goto(PAGE);
    const live = page.locator('[data-cw-live]');
    for (let i = 1; i < LAST; i++) await live.locator('[data-cw-next]').click();
    await expect(live.locator('[data-cw-caption]')).toBeVisible();
    await live.getByRole('button', { name: 'Start a new chat with a summary' }).click();
    await expect(live.locator('[data-n]')).toHaveCount(2);
    await expect(live.locator('[data-cw-out] [data-n]')).toHaveCount(0);
    await expect(live.locator('[data-cw-in] [data-n="1"]')).toContainText('allergic to nuts');
    await expect(live.locator('[data-cw-in] [data-n="2"]')).toContainText(/nut-free/i);
    await expect(live.locator('[data-cw-caption]')).toBeHidden();
    await expect(live.locator('[data-cw-status]')).toContainText('nut-free');
    await live.getByRole('button', { name: 'Start the chat again' }).click();
    await expect(live.locator('[data-n]')).toHaveCount(1);
    await expect(live.getByRole('button', { name: 'Next message' })).toBeEnabled();
  });

  test('it works from the keyboard alone, and the status is a polite live region', async ({ page }) => {
    await page.goto(PAGE);
    const live = page.locator('[data-cw-live]');
    await expect(live.locator('[data-cw-status]')).toHaveAttribute('aria-live', 'polite');
    await expect(live.locator('[data-cw-status]')).toHaveAttribute('role', 'status');
    expect(await live.locator('[data-cw-next]').evaluate((el) => el.tagName)).toBe('BUTTON');
    expect(await live.locator('[data-cw-summary]').evaluate((el) => el.tagName)).toBe('BUTTON');
    await live.locator('[data-cw-next]').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(live.locator('[data-n]')).toHaveCount(3);
    for (let i = 0; i < 9; i++) await page.keyboard.press('Enter');
    await expect(live.locator('[data-n]')).toHaveCount(LAST);
    // At the end focus moves to the summary button, so Enter starts the new chat.
    await expect(live.locator('[data-cw-summary]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(live.locator('[data-n]')).toHaveCount(2);
    await expect(live.locator('[data-cw-restart]')).toBeFocused();
  });

  test('the fade runs with motion allowed and is off under reduced motion', async ({ browser }) => {
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await ctx.newPage();
      await page.goto(PAGE);
      const live = page.locator('[data-cw-live]');
      for (let i = 1; i < 9; i++) await live.locator('[data-cw-next]').click();
      const out = live.locator('[data-cw-out] [data-n="1"]');
      await expect(out).toHaveCount(1);
      const name = await out.evaluate((el) => getComputedStyle(el).animationName);
      expect(name, `reducedMotion=${reduced}`).toBe(reduced ? 'none' : 'cw-dim');
      await ctx.close();
    }
  });
});

test.describe('does-it-remember: without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the column at message 4 and at message 12, and the caption only on the second', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-cw-static]')).toBeVisible();
    await expect(page.locator('[data-cw-live]')).toBeHidden();
    const four = page.locator('[data-cw-fig="4"]');
    const twelve = page.locator('[data-cw-fig="12"]');
    await expect(four.locator('[data-n]')).toHaveCount(4);
    await expect(four.locator('[data-state="out"]')).toHaveCount(0);
    await expect(twelve.locator('[data-n]')).toHaveCount(12);
    await expect(twelve.locator('[data-state="out"]')).toHaveCount(4);
    await expect(twelve.locator('[data-cw-in] [data-n]').first()).toHaveAttribute('data-n', '5');
    await expect(twelve.locator('[data-state="out"]').first()).toContainText('it can no longer see this');
    await expect(twelve.locator('[data-n="12"]')).toContainText(/peanut/i);
    await expect(twelve.locator('[data-cw-static-caption]')).toHaveText(CAPTION);
    await expect(four.locator('[data-cw-static-caption]')).toHaveCount(0);
  });

  test('side by side on a wide screen, stacked at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PAGE);
    const a = await page.locator('[data-cw-fig="4"]').boundingBox();
    const b = await page.locator('[data-cw-fig="12"]').boundingBox();
    expect(a && b && Math.abs(a.y - b.y) < 2 && b.x > a.x + a.width - 1, 'side by side at 1280').toBe(true);
    await page.setViewportSize({ width: 375, height: 800 });
    const a2 = await page.locator('[data-cw-fig="4"]').boundingBox();
    const b2 = await page.locator('[data-cw-fig="12"]').boundingBox();
    expect(a2 && b2 && b2.y > a2.y + a2.height - 1 && Math.abs(a2.x - b2.x) < 2, 'stacked at 375').toBe(true);
  });
});

test.describe('does-it-remember: the boxes figure and the page', () => {
  test('three boxes, a new-chat box, and the three lines in words', async ({ page }) => {
    await page.goto(PAGE);
    const fig = page.locator('[data-cw-boxes]');
    for (const t of ['This chat', 'Past chats', 'Saved memory', 'A new chat']) await expect(fig).toContainText(t);
    await expect(fig.locator('[data-cwb="saved"]')).toContainText('Can read');
    await expect(fig.locator('[data-cwb="this"]')).toContainText('Cannot read');
    await expect(fig.locator('[data-cwb="past"]')).toContainText('Only in apps that offer it');
  });

  test('links the three pages the issue names', async ({ page }) => {
    await page.goto(PAGE);
    for (const href of ['/ai-guides/never-paste/', '/ai-guides/usage-limits/', '/ai-guides/glossary/']) {
      await expect(page.locator(`article a[href="${href}"]:not(.term)`), href).toHaveCount(1);
    }
  });

  test('the hub lists it in the start group, and that group is in step order', async ({ page }) => {
    await page.goto('/ai-guides/');
    const group = page.locator('[data-hub-list="start"]');
    await expect(page.locator('[data-hub-group-heading="start"]')).toHaveText('Never used AI? Start from zero');
    await expect(group.locator('[data-guide-id="does-it-remember"]')).toHaveCount(1);
    await expect(group.locator('[data-guide-id="does-it-remember"]')).toHaveAttribute('data-step', '0.4');
    const steps = (await group.locator('[data-guide-id]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-step')))));
    expect(steps).toEqual([...steps].sort((x, y) => x - y));
    // It is not in the main list.
    await expect(page.locator('[data-hub-list="guides"] [data-guide-id="does-it-remember"]')).toHaveCount(0);
  });

  test('no exclamation marks, American spelling, no vendor names', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator('[data-guide] > header, [data-guide] > article').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText).join('\n'));
    expect(text).not.toContain('!');
    expect(text).not.toMatch(/personalis|summaris|colour|behaviour|neighbour/i);
    // Vendor names appear only in the two sourced sections.
    const rest = await page.locator('[data-guide] > header, [data-guide] > article').evaluateAll((els) =>
      els.map((e) => {
        const c = e.cloneNode(true) as HTMLElement;
        c.querySelectorAll('[data-shortened], [data-memory-apps]').forEach((n) => n.remove());
        return c.textContent ?? '';
      }).join('\n'),
    );
    expect(rest).not.toMatch(/ChatGPT|Gemini|Copilot|Claude|OpenAI|Anthropic/);
  });

  test('the shortened-chat section names both apps with their sources and shows the checked date', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('heading', { level: 2, name: 'Apps that shorten a long chat for you' })).toHaveCount(1);
    const sec = page.locator('[data-shortened]');
    await expect(sec).toContainText('summarize');
    await expect(sec).toContainText('a summary is shorter than what it replaces');
    for (const f of COMPACTION_FACTS) {
      const row = sec.locator(`[data-shortened-app="${f.app}"]`);
      await expect(row).toContainText(f.text);
      await expect(row.locator(`a[href="${f.source}"]`)).toHaveCount(1);
      expect(f.confirmed).toBe(true);
      expect(f.checked).toBe('2026-11-25');
    }
    await expect(sec.locator('a[href="https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work"]')).toHaveCount(1);
    await expect(sec.locator('a[href="https://help.openai.com/en/articles/20001639-why-does-chatgpt-say-context-window-full-or-chat-memory-full"]')).toHaveCount(1);
    const checked = sec.locator('[data-shortened-checked] time');
    await expect(checked).toHaveAttribute('datetime', COMPACTION_CHECKED);
    await expect(checked).toHaveText('November 25, 2026');
    // The word is explained where it is used, and is not a glossary term.
    await expect(sec.locator('.term, [data-term]')).toHaveCount(0);
  });

  test('the saved-memory section names all four apps with their sources and shows the checked date', async ({ page }) => {
    await page.goto(PAGE);
    const sec = page.locator('[data-memory-apps]');
    await expect(sec).toHaveCount(1);
    expect(MEMORY_FACTS.map((f) => f.app)).toEqual(['ChatGPT', 'Gemini', 'Copilot', 'Claude']);
    const own: Record<string, string[]> = {
      ChatGPT: ['openai.com'],
      Gemini: ['google.com'],
      Copilot: ['microsoft.com'],
      Claude: ['claude.com', 'anthropic.com'],
    };
    for (const f of MEMORY_FACTS) {
      const row = sec.locator(`[data-memory-app="${f.app}"]`);
      await expect(row).toContainText(f.text);
      for (const url of [f.source, ...(f.more ?? [])]) {
        await expect(row.locator(`a[href="${url}"]`)).toHaveCount(1);
        const host = new URL(url).hostname;
        expect(new URL(url).protocol).toBe('https:');
        expect(own[f.app].some((d) => host === d || host.endsWith(`.${d}`)), `${f.app}: ${host}`).toBe(true);
      }
      expect(f.confirmed).toBe(true);
      expect(f.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const checked = sec.locator('[data-memory-checked] time');
    await expect(checked).toHaveAttribute('datetime', MEMORY_CHECKED);
    // The page no longer tells readers memory is off unless they turn it on.
    const article = page.locator('[data-guide] > article');
    await expect(article).toContainText(/Don.t assume it.s off\./);
    await expect(article).not.toContainText('leave it off');
  });

  test('the status line is visually hidden but still in the page, and the disabled button looks disabled', async ({ page }) => {
    await page.goto(PAGE);
    const live = page.locator('[data-cw-live]');
    const status = live.locator('[data-cw-status]');
    for (let i = 1; i < LAST; i++) await live.locator('[data-cw-next]').click();
    await expect(status).toContainText('Message 12 added');
    const box = await status.boundingBox();
    expect(box && box.width <= 1 && box.height <= 1, JSON.stringify(box)).toBe(true);
    const btn = live.locator('[data-cw-next]');
    await expect(btn).toBeDisabled();
    const css = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, cursor: s.cursor, accent: getComputedStyle(document.documentElement).getPropertyValue('--color-accent') };
    });
    expect(css.cursor).toBe('default');
    expect(css.bg).toBe('rgba(0, 0, 0, 0)');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`375px has no horizontal scroll (${scheme}, JS on and after 12 messages)`, async ({ page }) => {
      await page.addInitScript((s) => localStorage.setItem('theme', s), scheme);
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(PAGE);
      const live = page.locator('[data-cw-live]');
      for (let i = 1; i < LAST; i++) await live.locator('[data-cw-next]').click();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  }

  test('375px has no horizontal scroll with JS off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(PAGE);
    // No script to measure the page with, so measure every part of both figures from outside.
    const boxes = [
      ...(await page.locator('[data-cw-static] .cw__fig, [data-cw-static] .cw__msg, [data-cw-boxes] .cwb__box, [data-cw-boxes] .cwb__new').all()),
    ];
    expect(boxes.length).toBeGreaterThan(10);
    for (const b of boxes) {
      const r = await b.boundingBox();
      expect(r && r.x >= 0 && r.x + r.width <= 375 + 0.5, JSON.stringify(r)).toBe(true);
    }
    await ctx.close();
  });
});
