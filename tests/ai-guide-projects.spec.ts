import { test, expect } from '@playwright/test';
import { AI_TOOLS } from '../src/consts/guides/aiTools';
import {
  GEMS_NOTICE,
  PROJECT_APPS,
  PROJECT_ORDER,
  UNCONFIRMED,
  allProjectFacts,
  oldestChecked,
} from '../src/consts/guides/projects';

// /ai-guides/projects/: the company facts, the page built from them, the
// "Two new chats" visual and the two inbound links. Run after `bun run build`.

const PAGE = '/ai-guides/projects/';

const onDomain = (url: string, domains: string[]) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' && domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
};

test.describe('projects: data', () => {
  test('four apps, every fact has an https source on that company, a checked date, and an unconfirmed fact says so', () => {
    expect(PROJECT_APPS.map((a) => a.id)).toEqual(['chatgpt', 'gemini', 'copilot', 'claude']);
    for (const app of PROJECT_APPS) {
      const tool = AI_TOOLS.find((t) => t.id === app.id)!;
      expect(Object.keys(app.facts).sort()).toEqual([...PROJECT_ORDER].sort());
      for (const key of PROJECT_ORDER) {
        const f = app.facts[key];
        const where = `${app.id}.${key}`;
        expect(onDomain(f.source, tool.domains), `${where} ${f.source}`).toBe(true);
        expect(f.checked, where).toBe('2026-11-25');
        expect(f.text.trim().length, where).toBeGreaterThan(0);
        expect(f.text, where).not.toMatch(/vendor/i);
      }
    }
    expect(onDomain(GEMS_NOTICE.source, AI_TOOLS.find((t) => t.id === 'gemini')!.domains)).toBe(true);
    expect(allProjectFacts().filter((f) => !f.confirmed).length).toBe(4);
    expect(oldestChecked()).toBe('2026-11-25');
  });
});

test.describe('projects: page', () => {
  test('is listed on the hub in the "start from zero" group, at step 0.6 after photos-files-voice', async ({ page }) => {
    await page.goto('/ai-guides/');
    const list = page.locator('[data-hub-list="start"]');
    await expect(list).toBeVisible();
    const steps = await list.locator('[data-guide-id]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-guide-id'), Number(e.getAttribute('data-step'))] as const));
    const ids = steps.map((s) => s[0]);
    expect(ids).toContain('projects');
    expect(steps.find((s) => s[0] === 'projects')![1]).toBe(0.6);
    expect(ids.indexOf('projects')).toBe(ids.indexOf('photos-files-voice') + 1);
    await expect(page.locator('[data-hub-list="guides"] [data-guide-id="projects"]')).toHaveCount(0);
  });

  test('the date at the top is the oldest checked date; the table has one row per app and links every source', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('[data-last-checked]')).toHaveAttribute('data-last-checked', oldestChecked());
    const rows = page.locator('[data-projects-table] tbody tr');
    await expect(rows).toHaveCount(PROJECT_APPS.length);
    for (const app of PROJECT_APPS) {
      const row = page.locator(`[data-projects-table] tr[data-app="${app.id}"]`);
      for (const key of PROJECT_ORDER) {
        const f = app.facts[key];
        const cell = row.locator(`td[data-fact="${key}"]`);
        await expect(cell.locator('a[data-source]')).toHaveAttribute('href', f.source);
        if (f.confirmed) await expect(cell).toContainText(f.text);
        else {
          await expect(cell).toContainText(UNCONFIRMED);
          await expect(cell).not.toContainText('(not stated)');
        }
      }
    }
    await expect(page.locator('[data-gems-notice] a[data-source]')).toHaveAttribute('href', GEMS_NOTICE.source);
  });

  test('links the three sister guides, links the glossary, and never says "vendor"', async ({ page }) => {
    await page.goto(PAGE);
    for (const href of ['/ai-guides/does-it-remember/', '/ai-guides/never-paste/', '/ai-guides/usage-limits/']) {
      await expect(page.locator(`article a[href="${href}"]`).first(), href).toBeVisible();
    }
    expect(await page.locator('a[href^="/ai-guides/glossary/"]').count()).toBeGreaterThan(0);
    expect(await page.locator('article').innerText()).not.toMatch(/vendor/i);
  });

  test('the two inbound links exist', async ({ page }) => {
    await page.goto('/ai-guides/does-it-remember/');
    await expect(page.locator('article a[href="/ai-guides/projects/"]').first()).toBeVisible();
    await page.goto('/ai-guides/photos-files-voice/');
    await expect(page.locator('article a[href="/ai-guides/projects/"]', { hasText: 'keep a project' })).toHaveCount(1);
  });

  test('every image has non-empty alt text', async ({ page }) => {
    await page.goto(PAGE);
    const alts = await page.locator('article img').evaluateAll((els) => els.map((e) => e.getAttribute('alt')));
    for (const alt of alts) expect((alt ?? '').trim().length).toBeGreaterThan(0);
  });

  test('"Two new chats": two panels, the same answer in both, the project one has the instructions above the question', async ({ page }) => {
    await page.goto(PAGE);
    const visual = page.locator('[data-two-chats]');
    await expect(visual).toBeVisible();
    const plain = visual.locator('[data-chat="plain"]');
    const proj = visual.locator('[data-chat="project"]');
    await expect(plain).toBeVisible();
    await expect(proj).toBeVisible();
    await expect(plain.locator('[data-background-line]')).toHaveCount(4);
    await expect(proj.locator('[data-background-line]')).toHaveCount(0);
    await expect(proj.locator('[data-project-instructions]')).toBeVisible();
    const a = await plain.locator('[data-answer]').innerText();
    const b = await proj.locator('[data-answer]').innerText();
    expect(a.trim().length).toBeGreaterThan(0);
    expect(a).toBe(b);
  });
});

for (const [name, size] of [['phone', { width: 375, height: 812 }], ['desktop', { width: 1280, height: 900 }]] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${name}, ${scheme}: no horizontal scroll and the visual fits the viewport`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(PAGE);
      // The site's dark mode is the .dark class on <html>, not the OS setting.
      await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), scheme === 'dark');
      const m = await page.evaluate(() => {
        const v = document.querySelector('[data-two-chats]')!.getBoundingClientRect();
        return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, left: v.left, right: v.right };
      });
      expect(m.sw).toBeLessThanOrEqual(m.cw);
      expect(m.left).toBeGreaterThanOrEqual(0);
      expect(m.right).toBeLessThanOrEqual(m.cw);
      await ctx.close();
    });
  }
}
