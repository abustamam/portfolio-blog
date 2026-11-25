import { test, expect } from '@playwright/test';
import { AI_MODELS, VENDORS, VENDOR_DOMAINS } from '../src/consts/guides/aiModels';
import { GUIDE_STORE_KEY } from '../src/utils/guideStore';
import { ACCOUNTS, EMPLOYER_LINE, TASKS, formatChecked, oldestChecked, recommend } from '../src/utils/modelMenu';

// /ai-guides/which-model/: the model data, the "Read my menu" rule and the
// page built from them. Run after `bun run build`.

const PAGE = '/ai-guides/which-model/';

test.describe('which-model: data', () => {
  test('every entry has an https source on its vendor’s own domain and a checked date', () => {
    expect(AI_MODELS.length).toBeGreaterThan(0);
    for (const m of AI_MODELS) {
      const url = new URL(m.source);
      expect(url.protocol, `${m.vendor} ${m.name}`).toBe('https:');
      const own = VENDOR_DOMAINS[m.vendor].some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`));
      expect(own, `${m.vendor} ${m.name}: ${url.hostname}`).toBe(true);
      expect(m.checked, `${m.vendor} ${m.name}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(m.checked))).toBe(false);
      expect(m.pickWhen.trim().length).toBeGreaterThan(0);
    }
  });

  test('each vendor has at least one everyday option, and names are unique per vendor', () => {
    for (const v of VENDORS) {
      const menu = AI_MODELS.filter((m) => m.vendor === v);
      expect(menu.some((m) => m.size === 'everyday'), v).toBe(true);
      const names = menu.map((m) => m.name);
      expect(new Set(names).size, v).toBe(names.length);
    }
  });
});

test.describe('which-model: the rule', () => {
  test('every app, account and task returns one of that app’s options', () => {
    for (const v of VENDORS) {
      for (const a of ACCOUNTS) {
        for (const t of TASKS) {
          const rec = recommend(AI_MODELS, v, a.id, t.id);
          expect(rec.pick.vendor, `${v}/${a.id}/${t.id}`).toBe(v);
          expect(AI_MODELS).toContain(rec.pick);
          if (rec.fallback) expect(rec.fallback.vendor).toBe(v);
          expect(rec.lines.length).toBeGreaterThan(0);
          // A free account is never sent to an option its free plan does not include.
          if (a.id === 'free') expect(['yes', 'limited'], `${v}/${t.id}: ${rec.pick.name}`).toContain(rec.pick.freePlan);
        }
      }
    }
  });

  test('a work account always gets the employer line first, and only work accounts get it', () => {
    for (const v of VENDORS) {
      for (const t of TASKS) {
        expect(recommend(AI_MODELS, v, 'work', t.id).lines[0]).toBe(EMPLOYER_LINE);
        expect(recommend(AI_MODELS, v, 'free', t.id).lines).not.toContain(EMPLOYER_LINE);
        expect(recommend(AI_MODELS, v, 'paid', t.id).lines).not.toContain(EMPLOYER_LINE);
      }
    }
  });
});

test.describe('which-model: page', () => {
  test('"last checked" equals the oldest checked date; one table row per entry with a linked source', async ({ page }) => {
    await page.goto(PAGE);
    const oldest = oldestChecked(AI_MODELS);
    const stamp = page.locator('[data-last-checked]');
    await expect(stamp).toHaveAttribute('data-last-checked', oldest);
    await expect(stamp).toContainText(formatChecked(oldest));

    const rows = page.locator('[data-model-table] [data-model-row]');
    await expect(rows).toHaveCount(AI_MODELS.length);
    for (let i = 0; i < AI_MODELS.length; i++) {
      const row = rows.nth(i);
      await expect(row).toContainText(AI_MODELS[i].name);
      await expect(row.locator('a[data-model-source]')).toHaveAttribute('href', AI_MODELS[i].source);
    }
  });

  test('choosing an app shows only that app’s options; a task highlights one; no network requests', async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    const urlBefore = page.url();
    const storage = () => page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie }));
    const storageBefore = await storage();

    const tool = page.locator('[data-model-menu]');
    for (const v of VENDORS) {
      await tool.locator(`input[name="vendor"][value="${v}"]`).check();
      const shown = tool.locator('[data-mm-vendor]:visible [data-mm-option]');
      const expected = AI_MODELS.filter((m) => m.vendor === v).map((m) => m.name);
      await expect(shown).toHaveCount(expected.length);
      expect(await shown.evaluateAll((els) => els.map((e) => e.getAttribute('data-mm-option')))).toEqual(expected);

      for (const a of ACCOUNTS) {
        await tool.locator(`input[name="account"][value="${a.id}"]`).check();
        for (const t of TASKS) {
          await tool.locator(`input[name="task"][value="${t.id}"]`).check();
          const rec = recommend(AI_MODELS, v, a.id, t.id);
          const picked = tool.locator('[data-mm-option][data-picked]');
          await expect(picked).toHaveCount(1);
          await expect(picked).toHaveAttribute('data-mm-option', rec.pick.name);
          await expect(picked).toBeVisible();
          const result = tool.locator('[data-mm-result]');
          await expect(result).toBeVisible();
          await expect(result.locator('p').first()).toHaveText(rec.lines[0]);
        }
      }
    }

    await tool.locator('[data-mm-reset]').click();
    await expect(tool.locator('[data-mm-result]')).toBeHidden();
    await expect(tool.locator('[data-mm-vendor]:visible')).toHaveCount(0);

    expect(requests).toEqual([]);
    expect(page.url()).toBe(urlBefore);
    // The only storage is the layout's visited-guides entry, written on load; using the tool adds nothing.
    expect(Object.keys(storageBefore.local).every((k) => k === GUIDE_STORE_KEY)).toBe(true);
    expect(await storage()).toEqual(storageBefore);
  });

  test('no benchmark talk, no "smartest", no ranking of vendors', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/benchmark/i);
    expect(text).not.toMatch(/smartest/i);
    const vendor = '(?:ChatGPT|Gemini|Copilot|Claude|OpenAI|Google|Microsoft|Anthropic)';
    const compare = '(?:better than|worse than|beats|outperforms|ahead of|ranked|ranks|number one|#1|the best)';
    expect(text).not.toMatch(new RegExp(`${vendor}[^.\\n]{0,60}${compare}`, 'i'));
    expect(text).not.toMatch(new RegExp(`${compare}[^.\\n]{0,60}${vendor}`, 'i'));
  });
});

// Voice: the GuideCta at the bottom is the page's one call to action, and the
// guide is written as "I". Nothing above the CTA, and nothing the tool says,
// mentions the training, a course, a cohort or a track, or says "we"/"our".
const COURSE_WORDS = /\b(?:tracks?|training|courses?|cohorts?)\b/i;
const WE_WORDS = /\b(?:we|our|ours|ourselves)\b/i;

/** Every string "Read my menu" can show: labels, each option's line, every result line. */
function toolStrings(): string[] {
  const out = new Set<string>([EMPLOYER_LINE, ...ACCOUNTS.map((a) => a.label), ...TASKS.map((t) => t.label)]);
  for (const m of AI_MODELS) out.add(m.pickWhen);
  for (const v of VENDORS) {
    for (const a of ACCOUNTS) {
      for (const t of TASKS) recommend(AI_MODELS, v, a.id, t.id).lines.forEach((l) => out.add(l));
    }
  }
  return [...out];
}

test.describe('which-model: voice', () => {
  test('the page above the call to action never mentions the training and never says "we"', async ({ page }) => {
    await page.goto(PAGE);
    // The header (title, lead, date) and the article, including the tool's hidden menus.
    const text = await page.evaluate(() =>
      [...document.querySelectorAll('[data-guide] > header, [data-guide] > article')].map((el) => el.textContent ?? '').join('\n'),
    );
    expect(text.length).toBeGreaterThan(2000);
    expect(await page.locator('[data-guide] > article [data-guide-cta]').count()).toBe(0);
    expect(text.match(COURSE_WORDS)?.[0], 'course word above the CTA').toBeUndefined();
    expect(text.match(WE_WORDS)?.[0], '"we" in the prose').toBeUndefined();
    await expect(page.locator('[data-guide] > article a[href^="/ai-training"]')).toHaveCount(0);
    // The CTA itself is still there, below the article.
    await expect(page.locator('[data-guide-cta]')).toHaveCount(1);
  });

  test('nothing the tool shows mentions the training or says "we"', () => {
    for (const s of toolStrings()) {
      expect(s, 'course word in a tool string').not.toMatch(COURSE_WORDS);
      expect(s, '"we" in a tool string').not.toMatch(WE_WORDS);
    }
  });

  test('"Does a better model stop making things up?" links When AI gets it wrong', async ({ page }) => {
    await page.goto(PAGE);
    const q = page.locator('article h3', { hasText: 'Does a better model stop making things up?' });
    await expect(q).toHaveCount(1);
    const answer = q.locator('xpath=following-sibling::p[1]');
    await expect(answer.locator('a[href="/ai-guides/when-ai-is-wrong/"]')).toHaveCount(1);
  });

  test('links the sister guide, and the thinking section has the medium-or-default line and the Opus paragraph', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('article a[href="/ai-guides/which-tool/"]')).toHaveCount(1);
    const h = page.locator('article h2', { hasText: /thinking/i });
    await expect(h).toHaveCount(1);
    const text = await h.evaluate((el) => {
      const out: string[] = [];
      for (let n = el.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) out.push(n.textContent ?? '');
      return out.join('\n');
    });
    expect(text).toContain('medium or the default');
    expect(text).toContain('a large Claude model, Opus, even for quick questions, and let it hand the smaller pieces to Sonnet');
  });
});
