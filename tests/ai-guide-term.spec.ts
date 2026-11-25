import { test, expect, type Browser, type Page } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GLOSSARY } from '../src/consts/guides/glossary';
import { previewPort } from './support/previewPort';

// The <Term> component: a dotted-underline word with a definition card.
//
// The fixture page src/content/guides/term-fixture.mdx is a draft, so the
// production build (and `astro preview`, which Playwright serves) never has
// it. The browser tests therefore start their own `astro dev` server, which
// does render drafts, on the preview port plus 1000 (one per worktree).
// Set TERM_TEST_BASE_URL to run them against a server you started instead.

const ROOT = process.cwd();
const PORT = previewPort(ROOT, process.env) + 1000;
const BASE = process.env.TERM_TEST_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const PAGE = '/ai-guides/term-fixture/';
const GUIDES_DIR = join(ROOT, 'src/content/guides');
// A guide is published when its file exists and is not `draft: true`.
const isPublishedGuide = (guide: string) => {
  const file = join(GUIDES_DIR, `${guide}.mdx`);
  if (!existsSync(file)) return false;
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '';
  return !/^draft:\s*true\s*$/m.test(front);
};
const expectedHref = (id: string) => {
  const guide = GLOSSARY.find((t) => t.id === id)!.guide;
  return guide && isPublishedGuide(guide) ? `/ai-guides/${guide}/` : `/ai-guides/glossary/#${id}`;
};
const short = (id: string) => GLOSSARY.find((t) => t.id === id)!.short;

// One worker for the whole file: one dev server, one temporary build.
test.describe.configure({ mode: 'serial' });

test.describe('build', () => {
  test('an unknown term fails the build and names the file and the word', () => {
    // Build a throwaway copy of the site, so the repo's content folder (which
    // other specs read) never holds the bad guide.
    const work = mkdtempSync(join(tmpdir(), 'term-build-'));
    try {
      cpSync(join(ROOT, 'src'), join(work, 'src'), { recursive: true });
      // Everything else (config, public, the services the pages import) is linked, not copied.
      for (const name of readdirSync(ROOT)) {
        if (['src', 'dist', '.git', '.claude', '.astro', 'test-results', 'playwright-report'].includes(name)) continue;
        symlinkSync(join(ROOT, name), join(work, name));
      }
      const bad = join(work, 'src/content/guides/term-unknown.mdx');
      writeFileSync(
        bad,
        [
          '---',
          'title: Unknown term',
          'description: Test.',
          'lead: Test.',
          'step: 98',
          'minutes: 1',
          '---',
          "import Term from '../../components/guides/Term.astro';",
          '',
          'A made-up word: <Term>flarbnox</Term>.',
          '',
        ].join('\n'),
      );
      const run = spawnSync(join(ROOT, 'node_modules/.bin/astro'), ['build'], { cwd: work, encoding: 'utf8', timeout: 240_000 });
      const out = `${run.stdout}\n${run.stderr}`;
      expect(run.status, out.slice(-1500)).not.toBe(0);
      expect(out).toContain('term-unknown.mdx');
      expect(out).toContain('flarbnox');
      expect(existsSync(join(work, 'dist/ai-guides/term-unknown/index.html'))).toBe(false);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  test('the draft fixture is not in the production build, the hub or the sitemap', () => {
    const dist = join(ROOT, 'dist');
    expect(existsSync(join(dist, 'ai-guides/index.html')), 'run `bun run build` first').toBe(true);
    expect(existsSync(join(dist, 'ai-guides/term-fixture'))).toBe(false);
    expect(readFileSync(join(dist, 'ai-guides/index.html'), 'utf8')).not.toContain('term-fixture');
    expect(readFileSync(join(dist, 'sitemap-0.xml'), 'utf8')).not.toContain('term-fixture');
  });
});

let dev: ChildProcess | undefined;

async function answers(url: string): Promise<boolean> {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function warm(browser: Browser) {
  // The first browser load makes Vite optimize dependencies and reload once.
  const page = await browser.newPage();
  await page.goto(BASE + PAGE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.goto(BASE + PAGE, { waitUntil: 'networkidle' });
  await page.close();
}

test.describe('on the fixture page', () => {
  test.use({ baseURL: BASE, reducedMotion: 'reduce' });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    if (!process.env.TERM_TEST_BASE_URL) {
      if (await answers(BASE + '/')) throw new Error(`${BASE} is already serving something; free the port or set TERM_TEST_BASE_URL`);
      dev = spawn(join(ROOT, 'node_modules/.bin/astro'), ['dev', '--port', String(PORT), '--host', '127.0.0.1'], {
        cwd: ROOT,
        detached: true,
        stdio: 'ignore',
      });
      const deadline = Date.now() + 120_000;
      while (!(await answers(BASE + PAGE))) {
        if (Date.now() > deadline) throw new Error(`astro dev did not answer on ${BASE}${PAGE}`);
        if (dev.exitCode !== null) throw new Error(`astro dev exited with ${dev.exitCode}`);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    await warm(browser);
  });

  test.afterAll(async () => {
    const child = dev;
    if (!child?.pid) return;
    const gone = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    try {
      process.kill(-child.pid, 'SIGTERM'); // the whole process group
    } catch {}
    await Promise.race([gone, new Promise((r) => setTimeout(r, 5000))]);
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {}
  });

  test.describe('in the HTML', () => {
    test('a term is marked the first time only, synonyms included', async ({ request }) => {
      const html = await (await request.get(PAGE)).text();
      const marked = [...html.matchAll(/<a class="term"[^>]*data-term="([^"]+)"/g)].map((m) => m[1]);
      expect(marked.filter((id) => id === 'usage-limit')).toHaveLength(1); // "usage limit", "usage limit" again, "quota"
      expect(marked.filter((id) => id === 'chat-app')).toHaveLength(1);
      expect(new Set(marked).size, marked.join(',')).toBe(marked.length);
      // The repeat and the synonym are still on the page, as plain text.
      expect(html).toContain('The same usage limit again is plain text.');
      expect(html).toContain('A synonym of it, quota, is the same entry');
    });

    test('each word links to its guide when that guide is published, else to its glossary entry', async ({ page }) => {
      await page.goto(PAGE);
      const href = (id: string) => page.locator(`a.term[data-term="${id}"]`).getAttribute('href');
      expect(await href('model')).toBe('/ai-guides/which-model/'); // published guide
      expect(await href('hallucination')).toBe('/ai-guides/when-ai-is-wrong/'); // explicit id, published guide
      expect(await href('agent')).toBe('/ai-guides/glossary/#agent'); // no guide
      // The rule, read from the files, so it holds whichever guides have landed.
      for (const id of ['token', 'usage-limit']) {
        expect(await href(id), id).toBe(expectedHref(id));
      }
    });

    test('a name that is not on the page text but is an explicit id still resolves', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('#explicit a.term')).toHaveText('making stuff up');
      await expect(page.locator('#explicit a.term')).toHaveAttribute('data-term', 'hallucination');
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the word is a plain link with its definition in the title', async ({ page }) => {
      await page.goto(PAGE);
      const t = page.locator('a.term[data-term="usage-limit"]');
      await expect(t).toHaveAttribute('href', expectedHref('usage-limit'));
      await expect(t).toHaveAttribute('title', short('usage-limit'));
      expect(await page.locator('.term-card').count()).toBe(0);
    });
  });

  test.describe('excluded contexts', () => {
    test('headings, code and buttons are not marked, and keep their words', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('a.term[data-term="usage-limit"]')).toHaveAttribute('aria-expanded', 'false'); // script ran
      await expect(page.locator('#about-the-conversation-heading')).toHaveText('About the conversation heading');
      await expect(page.locator('#code-host')).toHaveText('llm');
      await expect(page.locator('#button-host')).toHaveText('attach');
      for (const host of ['#about-the-conversation-heading', '#code-host', '#button-host']) {
        expect(await page.locator(`${host} a.term`).count(), host).toBe(0);
      }
      // Body terms are still marked.
      expect(await page.locator('#first a.term').count()).toBe(1);
    });
  });

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('hover opens the card with the term, the definition and one link; leaving closes it', async ({ page }) => {
      await page.goto(PAGE);
      const term = page.locator('#first a.term');
      await expect(term).toHaveAttribute('aria-expanded', 'false');
      await expect(term).not.toHaveAttribute('title', /.+/); // the card replaces the native tooltip
      const card = page.locator('#term-card');
      await term.hover();
      await expect(card).toBeVisible();
      await expect(card.locator('.term-card__term')).toHaveText('usage limit');
      await expect(card.locator('.term-card__short')).toHaveText(short('usage-limit'));
      await expect(card.locator('a')).toHaveCount(1);
      await expect(card.locator('a')).toHaveText('More on this');
      await expect(card.locator('a')).toHaveAttribute('href', expectedHref('usage-limit'));
      await expect(term).toHaveAttribute('aria-describedby', 'term-card');
      await page.mouse.move(5, 5);
      await expect(card).toBeHidden();
      await expect(term).not.toHaveAttribute('aria-describedby', /.+/);
    });

    test('the pointer can travel from the word onto the card without it closing', async ({ page }) => {
      await page.goto(PAGE);
      const term = page.locator('#first a.term');
      await term.hover();
      const card = page.locator('#term-card');
      await expect(card).toBeVisible();
      await card.locator('a').hover();
      await page.waitForTimeout(400);
      await expect(card).toBeVisible();
    });

    test('the card does not cover the word, including a word that wraps over two lines', async ({ page }) => {
      await page.goto(PAGE);
      for (const sel of ['#first a.term', '#wrapped a.term']) {
        await page.locator(sel).hover();
        await expect(page.locator('#term-card')).toBeVisible();
        const { overlap, inside } = await page.evaluate((s) => {
          const card = document.querySelector('#term-card')!.getBoundingClientRect();
          const rects = Array.from(document.querySelector(s)!.getClientRects());
          const hit = rects.some((r) => r.left < card.right && r.right > card.left && r.top < card.bottom && r.bottom > card.top);
          return { overlap: hit, inside: card.left >= 0 && card.right <= innerWidth && card.top >= 0 && card.bottom <= innerHeight };
        }, sel);
        expect(overlap, sel).toBe(false);
        expect(inside, sel).toBe(true);
        await page.mouse.move(5, 5);
      }
    });

    test('Escape closes the card, and clicking the word does not leave the page', async ({ page }) => {
      await page.goto(PAGE);
      const term = page.locator('#first a.term');
      await term.hover();
      await expect(page.locator('#term-card')).toBeVisible();
      await term.click();
      await expect(page).toHaveURL(new RegExp(`${PAGE}$`));
      await page.keyboard.press('Escape');
      await expect(page.locator('#term-card')).toBeHidden();
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`the card text and link keep 4.5:1 contrast (${scheme})`, async ({ page }) => {
        await page.addInitScript((s) => localStorage.setItem('theme', s), scheme);
        await page.goto(PAGE);
        await page.locator('#first a.term').hover();
        await expect(page.locator('#term-card')).toBeVisible();
        const colors = await page.evaluate(() => {
          const c = (el: Element) => getComputedStyle(el);
          const card = document.querySelector('#term-card')!;
          return {
            bg: c(card).backgroundColor,
            parts: ['.term-card__term', '.term-card__short', '.term-card__more'].map((s) => c(card.querySelector(s)!).color),
            dark: document.documentElement.classList.contains('dark'),
          };
        });
        expect(colors.dark).toBe(scheme === 'dark');
        const lum = (rgb: string) => {
          const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
            const x = Number(v) / 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        for (const fg of colors.parts) {
          const [a, b] = [lum(fg), lum(colors.bg)].sort((x, y) => y - x);
          expect((a + 0.05) / (b + 0.05), `${fg} on ${colors.bg}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  });

  test.describe('keyboard only', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    async function tabToTerm(page: Page, id: string) {
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate((x) => (document.activeElement as HTMLElement | null)?.dataset?.term === x, id)) return;
      }
      throw new Error(`Tab never reached the "${id}" term`);
    }

    test('Tab to a term opens the card, Tab reaches its link before it closes, Enter follows it', async ({ page }) => {
      await page.goto(PAGE);
      const term = page.locator('#first a.term');
      await expect(term).toHaveAttribute('aria-expanded', 'false');
      await tabToTerm(page, 'usage-limit');
      const card = page.locator('#term-card');
      await expect(card).toBeVisible();
      await expect(card.locator('.term-card__short')).toHaveText(short('usage-limit'));
      await expect(term).toHaveAttribute('aria-describedby', 'term-card');
      await page.keyboard.press('Tab');
      await expect(card.locator('a')).toBeFocused();
      await expect(card).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL((u) => u.pathname + u.hash === expectedHref('usage-limit'));
    });

    test('Escape closes the card and puts focus back on the word without reopening it', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('#first a.term')).toHaveAttribute('aria-expanded', 'false');
      await tabToTerm(page, 'usage-limit');
      await page.keyboard.press('Tab');
      await expect(page.locator('#term-card a')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('#term-card')).toBeHidden();
      await expect(page.locator('#first a.term')).toBeFocused();
    });

    test('moving focus away from the word and the card closes it', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('#first a.term')).toHaveAttribute('aria-expanded', 'false');
      await tabToTerm(page, 'usage-limit');
      await expect(page.locator('#term-card')).toBeVisible();
      await page.keyboard.press('Tab'); // onto the card's link
      await page.keyboard.press('Tab'); // past it, onto the next word on the page
      await expect(page.locator('#first a.term')).not.toHaveAttribute('aria-describedby', /.+/);
      await expect(page.locator('#other-synonym a.term')).toBeFocused();
      // The card is now that word's, not the first one's.
      await expect(page.locator('#term-card .term-card__term')).toHaveText('chat app');
      // Focus moving to something that is not a word or the card closes it.
      await page.locator('#link-host').focus();
      await expect(page.locator('#term-card')).toBeHidden();
    });
  });

  test.describe('phone, 375px wide, touch', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

    test('a tap opens the card, a tap on the word again or elsewhere closes it, and the page stays put', async ({ page }) => {
      await page.goto(PAGE);
      const term = page.locator('#first a.term');
      await expect(term).toHaveAttribute('aria-expanded', 'false');
      await term.tap();
      await expect(page.locator('#term-card')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${PAGE}$`));
      await term.tap();
      await expect(page.locator('#term-card')).toBeHidden();
      await term.tap();
      await expect(page.locator('#term-card')).toBeVisible();
      await page.locator('.ai-title').tap();
      await expect(page.locator('#term-card')).toBeHidden();
    });

    test('a word at the right edge gets a card that stays on screen and off the word', async ({ page }) => {
      await page.goto(PAGE);
      const term = page.locator('#edge a.term');
      await expect(term).toHaveAttribute('aria-expanded', 'false');
      const right = await term.evaluate((el) => el.getBoundingClientRect().right);
      expect(right, 'the word must sit near the right edge').toBeGreaterThan(375 - 40);
      await term.tap();
      const card = page.locator('#term-card');
      await expect(card).toBeVisible();
      const r = await page.evaluate(() => {
        const c = document.querySelector('#term-card')!.getBoundingClientRect();
        const w = document.querySelector('#edge a.term')!.getBoundingClientRect();
        return { cl: c.left, cr: c.right, ct: c.top, cb: c.bottom, wl: w.left, wr: w.right, wt: w.top, wb: w.bottom, vw: innerWidth, vh: innerHeight, sx: scrollX };
      });
      expect(r.cl).toBeGreaterThanOrEqual(0);
      expect(r.cr).toBeLessThanOrEqual(r.vw);
      expect(r.sx).toBe(0);
      expect(r.cl < r.wr && r.cr > r.wl && r.ct < r.wb && r.cb > r.wt, 'card overlaps the word').toBe(false);
    });
  });
});
