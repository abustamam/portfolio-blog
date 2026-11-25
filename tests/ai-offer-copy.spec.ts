import { test, expect } from '@playwright/test';

// Copy that points at the AI training from outside the sales page must agree
// with it: three tracks (one of them teaches coding), and reserving is open.
// Run after `bun run build`.

test.describe('AI training: copy that points at the offer', () => {
  test('the homepage line does not say every cohort is for people who do not code', async ({ page }) => {
    await page.goto('/');
    const line = page.locator('p', { has: page.locator('a[href="/ai-training/"]') }).last();
    await expect(line).toContainText('hands-on AI cohorts');
    await expect(line).not.toContainText("for people who don't code");
    await expect(line).toContainText('build');
  });

  test('the announcement post links straight to reserving and no longer says the quiz takes contact details', async ({ page }) => {
    await page.goto('/writing/hands-on-ai-cohort/');
    const article = page.locator('article');
    await expect(article.getByRole('link', { name: /Reserve a seat/ })).toHaveAttribute('href', '/ai-training/');
    await expect(article).toContainText('Reserving is open now');
    await expect(article).not.toContainText('Your name and contact details are optional');
    await expect(article).not.toContainText('tell you when it opens');
  });
});
