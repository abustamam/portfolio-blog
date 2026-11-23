import { test, expect } from '@playwright/test';

const FLAGSHIPS = ['salty', 'edvo', 'layerone'];
const RECENT = ['nuema', 'breezy', 'milken-cic'];
const MARKETSCREENER = 'https://www.marketscreener.com/quote/stock/CDK-GLOBAL-INC-18052701/news/CDK-Global-Inc-completed-the-acquisition-of-Salty-Dot-Inc-for-approximately-150-million-37150175/';
const BUSINESSWIRE = 'https://www.businesswire.com/news/home/20180719005086/en/Blockchain-Levels-Up-with-Another-Mega-Deal-XYO-Announces-Acquisition-of-LayerOne-and-Will-Be-Open-Sourcing-Its-Geospatial-Technology';

test.describe('/work/ index', () => {
  test('leads with the three flagships, then recent engagements, then the timeline', async ({ page }) => {
    await page.goto('/work/');

    const flagshipIds = await page.locator('[data-flagship]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-flagship')),
    );
    expect(flagshipIds).toEqual(FLAGSHIPS);

    const recentIds = await page.locator('[data-recent-card]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-recent-card')),
    );
    expect(recentIds).toEqual(RECENT);

    const timelineIds = await page.locator('[data-timeline-row]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-timeline-row')),
    );
    expect(timelineIds.length).toBeGreaterThan(0);
    for (const id of [...FLAGSHIPS, ...RECENT]) expect(timelineIds).not.toContain(id);
    expect(timelineIds).toContain('salty-ai');
    expect(timelineIds).not.toContain('embedded-insurance');
    expect(timelineIds).not.toContain('cdk-global');

    // Section order on the page: case studies, then recent, then timeline.
    const tops = await Promise.all(
      ['[data-flagships]', '[data-recent]', '[data-work-timeline]'].map((s) =>
        page.locator(s).evaluate((el) => el.getBoundingClientRect().top),
      ),
    );
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
  });

  test('shows the sourced acquisition figure with its source link', async ({ page }) => {
    await page.goto('/work/');
    const salty = page.locator('[data-flagship="salty"]');
    await expect(salty).toContainText('~$150M');
    await expect(salty.locator(`a[href="${MARKETSCREENER}"]`)).toBeVisible();
  });

  test('CoNarrative no longer carries the acquired badge', async ({ page }) => {
    await page.goto('/work/');
    await expect(page.locator('[data-timeline-row="conarrative"]')).not.toContainText(/acquired/i);
    await page.goto('/work/conarrative/');
    await expect(page.locator('aside')).not.toContainText(/acquired/i);
  });
});

test.describe('flagship case studies', () => {
  for (const id of FLAGSHIPS) {
    test(`${id} renders problem, what I did and outcome, and no empty quote`, async ({ page }) => {
      await page.goto(`/work/${id}/`);
      await expect(page.locator(`[data-case-study="${id}"]`)).toBeVisible();
      for (const section of ['problem', 'what-i-did', 'outcome']) {
        const el = page.locator(`[data-section="${section}"]`);
        await expect(el).toBeVisible();
        expect((await el.innerText()).trim().length).toBeGreaterThan(30);
      }
      // Quotes are not approved yet, so the slot must not render.
      await expect(page.locator('[data-section="quote"]')).toHaveCount(0);
      // Every flagship has at least one sourced fact or an outcome figure.
      expect(await page.locator('[data-metric]').count()).toBeGreaterThan(0);
      const body = await page.locator('main').innerText();
      expect(body).not.toMatch(/lorem|TODO|placeholder/i);
    });
  }

  for (const id of FLAGSHIPS) {
    test(`${id} at 375px puts the title and figures above the metadata box`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/work/${id}/`);
      const top = (sel: string) =>
        page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      const titleTop = await top('h1');
      const metricsTop = await top('[data-metrics]');
      const metaTop = await top('[data-work-meta]');
      expect(titleTop).toBeLessThan(metaTop);
      expect(metricsTop).toBeLessThan(metaTop);
    });
  }

  test('Salty never claims an early or founding role', async ({ page }) => {
    await page.goto('/work/salty/');
    const body = await page.locator('main').innerText();
    expect(body).not.toMatch(/found(ing|er)|early (member|employee|engineer)/i);
    await expect(page.locator(`[data-section="sources"] a[href="${MARKETSCREENER}"]`)).toBeVisible();
  });

  test('LayerOne links the acquisition source and prints no price', async ({ page }) => {
    await page.goto('/work/layerone/');
    await expect(page.locator(`a[href="${BUSINESSWIRE}"]`).first()).toBeVisible();
    expect(await page.locator('main').innerText()).not.toContain('$');
  });
});

test.describe('renamed and merged entries', () => {
  test('Salty.ai replaces Embedded Insurance', async ({ page }) => {
    await page.goto('/work/salty-ai/');
    await expect(page.locator('h1')).toContainText('Salty.ai');
    await expect(page.locator('main')).not.toContainText('Embedded Insurance, Inc.');
  });

  for (const [from, to] of [
    ['/work/cdk-global/', '/work/salty/'],
    ['/work/embedded-insurance/', '/work/salty-ai/'],
  ]) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to}$`));
    });
  }
});

test('homepage selected work shows exactly the three flagships', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('[data-work-card]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-work-card')),
  );
  expect(ids).toEqual(FLAGSHIPS);
});
