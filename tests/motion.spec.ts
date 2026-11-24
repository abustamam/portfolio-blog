import { test, expect, type Page } from '@playwright/test';

// Motion pass (#33): view transitions between pages, scroll-driven reveals on
// case studies, and the guarantees around them (reduced motion, no JS, page
// scripts working on the page a transition lands on).
//
// Page transitions are the browser's native cross-document view transitions
// (`@view-transition` in global.css): every navigation is a real page load, so
// each page's scripts run fresh. These tests pin that down.

const CASE_STUDY = '/work/salty/';

type VtRecord = { used: boolean; animations: string[] | null };

/**
 * On every document, record whether it was revealed by a view transition and
 * which view-transition animations ran. `pagereveal` fires before the first
 * render of each new page.
 */
async function recordViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: { used: boolean; animations: string[] | null } };
    w.__vt = { used: false, animations: null };
    addEventListener('pagereveal', (e) => {
      const vt = (e as Event & { viewTransition?: ViewTransition | null }).viewTransition;
      if (!vt) return;
      w.__vt.used = true;
      vt.ready
        .then(() => {
          w.__vt.animations = document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? '')
            .filter((p) => p.startsWith('::view-transition'));
        })
        .catch(() => {
          w.__vt.animations = [];
        });
    });
  });
}

async function viewTransition(page: Page): Promise<VtRecord> {
  return page.evaluate(() => (window as unknown as { __vt: VtRecord }).__vt);
}

/**
 * Click a same-site link, wait for the new page to load, and return whether
 * that page arrived through a view transition.
 */
async function navigate(page: Page, selector: string, url: RegExp): Promise<boolean> {
  await page.locator(selector).first().click();
  await expect(page).toHaveURL(url);
  await page.waitForLoadState('load');
  return (await viewTransition(page)).used;
}

const HOME_TO_CASE_STUDY = ['a[data-work-card]', /\/work\/[^/]+\/$/] as const;
const CASE_STUDY_TO_HOME = ['header a[href="/"]', /\/$/] as const;

test.describe('view transitions', () => {
  test('page scripts work on every page a view transition lands on', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await recordViewTransitions(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('terminal:open');
      localStorage.setItem('theme', 'light');
    });
    await page.reload();

    // Home → case study through a work card.
    const transitions: boolean[] = [];
    transitions.push(await navigate(page, ...HOME_TO_CASE_STUDY));

    // Theme picker.
    await page.locator('#theme-picker-btn').click();
    await expect(page.locator('#theme-picker-popover')).toBeVisible();
    await page.locator('#theme-picker-popover [data-brightness="dark"]').click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    // Terminal shell: one shortcut press opens it, one closes it.
    const shell = page.locator('#terminal-mode-shell');
    await expect(shell).toHaveClass(/hidden/);
    await page.keyboard.press('Control+Shift+T');
    await expect(shell).not.toHaveClass(/hidden/);
    await expect(page.locator('#terminal-cwd')).toContainText('~/work');
    await page.locator('#terminal-input').fill('ls');
    await page.locator('#terminal-input').press('Enter');
    await expect(page.locator('#terminal-output')).toContainText('salty/');
    await page.keyboard.press('Control+Shift+T');
    await expect(shell).toHaveClass(/hidden/);

    // Writing index → post, twice.
    const rows = page.locator('a.post-row');
    for (const slug of ['layered-agent-instructions', 'url-shortener-phase-1-baseline']) {
      transitions.push(await navigate(page, 'nav[aria-label="Primary"] a[href="/writing"]', /\/writing\/?$/));
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);

      // Search filter.
      const total = await rows.count();
      await page.locator('#search-input').fill('agent lessons');
      await expect(rows.filter({ visible: true })).toHaveCount(1);
      await page.locator('#search-input').fill('');
      await expect(rows.filter({ visible: true })).toHaveCount(total);

      transitions.push(await navigate(page, `a.post-row[href="/writing/${slug}/"]`, new RegExp(`/writing/${slug}/$`)));
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);

      // Copy buttons on code blocks.
      const copy = page.locator('.copy-btn').first();
      await expect(copy).toBeVisible();
      await copy.click();
      await expect(copy).toHaveText('✓ copied');
    }

    // Back home: the terminal widget takes commands.
    transitions.push(await navigate(page, ...CASE_STUDY_TO_HOME));
    const widget = page.locator('#terminal-widget');
    await widget.click(); // skips the intro
    await expect(widget).toHaveAttribute('data-intro-done', '');
    const widgetInput = page.locator('#widget-input');
    await widgetInput.fill('cd work');
    await widgetInput.press('Enter');
    await expect(page.locator('#widget-cwd')).toContainText('~/work');

    expect(errors).toEqual([]);
    // Every one of those pages was reached by a view transition.
    expect(transitions).toEqual([true, true, true, true, true, true]);
  });

  test('navigations animate when motion is allowed', async ({ page }) => {
    await recordViewTransitions(page);
    await page.goto('/');
    for (let i = 0; i < 4; i++) {
      const used = await navigate(page, ...(i % 2 ? CASE_STUDY_TO_HOME : HOME_TO_CASE_STUDY));
      expect(used, `navigation ${i + 1} should be a view transition`).toBe(true);
      await expect.poll(async () => (await viewTransition(page)).animations).not.toBeNull();
      expect((await viewTransition(page)).animations!.length).toBeGreaterThan(0);
    }
  });
});

test.describe('case-study reveals with motion allowed', () => {
  test('below-the-fold sections start hidden and reveal on scroll', async ({ page }) => {
    await page.goto(CASE_STUDY);
    const sources = page.locator('[data-section="sources"]');
    await expect(sources).toHaveCSS('opacity', '0');
    await sources.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(sources).toHaveCSS('opacity', '1');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('case-study content is visible without scrolling and nothing animates', async ({ page }) => {
    await page.goto(CASE_STUDY);
    await expect(page.locator('[data-section="outcome"]')).toContainText('$150M');
    const reveals = page.locator('[data-reveal]');
    expect(await reveals.count()).toBeGreaterThan(0);
    for (const el of await reveals.all()) {
      await expect(el).toHaveCSS('opacity', '1');
      expect(await el.evaluate((e) => e.getAnimations().length)).toBe(0);
    }
  });

  test('navigations are plain page loads with no view transition', async ({ page }) => {
    await recordViewTransitions(page);
    await page.goto('/');
    const transitions: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      transitions.push(await navigate(page, ...(i % 2 ? CASE_STUDY_TO_HOME : HOME_TO_CASE_STUDY)));
    }
    expect(transitions).toEqual([false, false, false, false]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('case-study sections are reachable and visible', async ({ page }) => {
    await page.goto(CASE_STUDY);
    const reveals = page.locator('[data-reveal]');
    expect(await reveals.count()).toBeGreaterThan(0);
    for (const el of await reveals.all()) {
      await el.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 300);
      await expect(el).toHaveCSS('opacity', '1');
    }
  });
});
