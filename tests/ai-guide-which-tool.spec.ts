import { test, expect } from '@playwright/test';
import { AI_TOOLS, FACT_ORDER, UNCONFIRMED, allFacts, lastChecked } from '../src/consts/guides/aiTools';
import { EMPLOYER_LINE, QUESTIONS, allAnswerSets, nextQuestion, questionsFor, recommend } from '../src/utils/toolPicker';

// /ai-guides/which-tool/: the data file, the picker's rules, and the page.
// The shared guide checks (indexed, card, CTA, no sideways scroll) are in ai-guides.spec.ts.

const PATH = '/ai-guides/which-tool/';

const onDomain = (url: string, domains: string[]) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' && domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
};

test.describe('which-tool: data', () => {
  test('four tools, and every fact has an https source on that vendor and a checked date', () => {
    expect(AI_TOOLS.map((t) => t.id)).toEqual(['gemini', 'chatgpt', 'copilot', 'claude']);
    for (const t of AI_TOOLS) expect(Object.keys(t.facts).sort()).toEqual([...FACT_ORDER].sort());

    for (const { tool, key, fact } of allFacts()) {
      const where = `${tool.id}.${key}`;
      expect(onDomain(fact.source, tool.domains), `${where} source ${fact.source}`).toBe(true);
      for (const url of fact.more ?? []) expect(onDomain(url, tool.domains), `${where} more ${url}`).toBe(true);
      expect(fact.checked, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(fact.checked)), where).toBe(false);
      expect(fact.text.trim().length, where).toBeGreaterThan(0);
      // A fact the vendor did not confirm says so, and nothing else.
      if (!fact.confirmed) expect(fact.text, where).toBe(UNCONFIRMED);
    }
  });

  test('sources stay off third-party sites even when a vendor domain appears in the path', () => {
    expect(onDomain('https://example.com/claude.com/pricing', ['claude.com'])).toBe(false);
    expect(onDomain('https://notclaude.com/', ['claude.com'])).toBe(false);
    expect(onDomain('http://claude.com/pricing', ['claude.com'])).toBe(false);
    expect(onDomain('https://support.claude.com/x', ['claude.com'])).toBe(true);
  });
});

test.describe('which-tool: picker rules', () => {
  test('every combination of answers returns one recommendation with a reason and a first step', () => {
    const sets = allAnswerSets();
    expect(sets).toHaveLength(3 * 3 + 3 * 3 * 2);
    for (const a of sets) {
      const r = recommend(a);
      const where = JSON.stringify(a);
      expect(r.first.length, where).toBeGreaterThan(0);
      expect(r.reason.length, where).toBeGreaterThan(0);
      expect(r.firstStep.length, where).toBeGreaterThan(0);
      if (r.tool) expect(AI_TOOLS.map((t) => t.id), where).toContain(r.tool);
      if (a.task === 'inbox') expect(r.link?.href, where).toBe('/ai-training/#connect');
      if (a.task === 'code') expect(r.link?.href, where).toBe('/ai-training/#build');
      if (a.task === 'everyday') expect(r.link, where).toBeUndefined();
    }
  });

  test('a work account always gets "use what your employer allows" first, never a personal account', () => {
    for (const a of allAnswerSets()) {
      const r = recommend(a);
      if (a.account === 'work') {
        expect(r.first).toBe(EMPLOYER_LINE);
        expect(r.workAccount).toBe(true);
      } else {
        expect(r.first).not.toBe(EMPLOYER_LINE);
        expect(r.workAccount).toBe(false);
      }
    }
  });

  test('at most four questions; a work account is not asked about paying', () => {
    expect(QUESTIONS).toHaveLength(4);
    expect(questionsFor({ account: 'work' }).map((q) => q.id)).toEqual(['account', 'ecosystem', 'task']);
    expect(questionsFor({ account: 'personal' }).map((q) => q.id)).toEqual(['account', 'ecosystem', 'task', 'pay']);
    expect(nextQuestion({ account: 'work', ecosystem: 'google', task: 'code' })).toBeNull();
    expect(nextQuestion({ account: 'personal', ecosystem: 'google', task: 'code' })?.id).toBe('pay');
  });
});

test.describe('which-tool: page', () => {
  test('the table has one row per tool, every fact linked to its source', async ({ page }) => {
    await page.goto(PATH);
    const rows = page.locator('[data-tools-table] tbody tr');
    await expect(rows).toHaveCount(AI_TOOLS.length);
    expect(await rows.evaluateAll((trs) => trs.map((tr) => tr.getAttribute('data-tool')))).toEqual(
      AI_TOOLS.map((t) => t.id),
    );
    for (const tool of AI_TOOLS) {
      for (const key of FACT_ORDER) {
        const fact = tool.facts[key];
        const cell = page.locator(`[data-tools-table] tr[data-tool="${tool.id}"] td[data-fact="${key}"]`);
        await expect(cell).toHaveCount(1);
        await expect(cell).toContainText(fact.text);
        const hrefs = await cell.locator('a[data-source]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        expect(hrefs, `${tool.id}.${key}`).toEqual([fact.source, ...(fact.more ?? [])]);
      }
    }
  });

  test('"last checked" is the oldest checked date in the data', async ({ page }) => {
    await page.goto(PATH);
    const time = page.locator('[data-last-checked]');
    await expect(time).toHaveCount(1);
    await expect(time).toHaveAttribute('datetime', lastChecked());
  });

  test('every path reaches a result in at most four taps, can restart, and sends nothing', async ({ page }) => {
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    const url = page.url();
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));

    const picker = page.locator('[data-tool-picker]');
    const result = picker.locator('[data-tp-result]');

    for (const a of allAnswerSets()) {
      let taps = 0;
      while (await result.isHidden()) {
        const text = (await picker.locator('[data-tp-question]').innerText()).trim();
        const question = QUESTIONS.find((x) => x.text === text);
        expect(question, `unknown question "${text}"`).toBeDefined();
        if (!question) break;
        await picker.locator(`[data-tp-options] button[data-tp-value="${a[question.id]}"]`).click();
        taps++;
        expect(taps, JSON.stringify(a)).toBeLessThanOrEqual(4);
      }
      const r = recommend(a);
      await expect(result.locator('[data-tp-first]')).toHaveText(r.first);
      await expect(result.locator('[data-tp-reason]')).toHaveText(r.reason);
      await expect(result.locator('[data-tp-step]')).toHaveText(r.firstStep);
      await expect(result).toHaveAttribute('data-tool', r.tool ?? 'employer');
      if (r.link) await expect(result.locator('[data-tp-link]')).toHaveAttribute('href', r.link.href);
      else await expect(result.locator('[data-tp-link-wrap]')).toBeHidden();

      await result.locator('[data-tp-restart]').click();
      await expect(result).toBeHidden();
      await expect(picker.locator('[data-tp-question]')).toHaveText(QUESTIONS[0].text);
    }

    expect(requests).toEqual([]);
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(storage);
  });

  test('Back undoes the last answer', async ({ page }) => {
    await page.goto(PATH);
    const picker = page.locator('[data-tool-picker]');
    await picker.locator('button[data-tp-value="personal"]').click();
    await expect(picker.locator('[data-tp-question]')).toHaveText(QUESTIONS[1].text);
    await picker.locator('[data-tp-back]').click();
    await expect(picker.locator('[data-tp-question]')).toHaveText(QUESTIONS[0].text);
    await expect(picker.locator('[data-tp-back]')).toBeHidden();
  });
});
