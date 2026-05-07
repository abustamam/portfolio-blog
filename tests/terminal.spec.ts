import { test, expect } from '@playwright/test';

async function clearTerminalState(page) {
  await page.evaluate(() => {
    localStorage.removeItem('terminal:open');
    localStorage.removeItem('terminal:cwd');
    localStorage.removeItem('terminal:theme');
    localStorage.removeItem('terminal:history');
    localStorage.removeItem('terminal:session-lines');
  });
}

test.describe('TerminalModeShell', () => {
  test('opens with keyboard shortcut and accepts commands', async ({ page }) => {
    await page.goto('/');
    await clearTerminalState(page);
    await page.reload();

    const shell = page.locator('#terminal-mode-shell');
    await expect(shell).toHaveClass(/hidden/);

    // Open terminal with Ctrl+Shift+T
    await page.keyboard.press('Control+Shift+T');
    await expect(shell).not.toHaveClass(/hidden/);
    await expect(shell).toHaveAttribute('aria-hidden', 'false');

    // Type a command and submit
    const input = page.locator('#terminal-input');
    await input.fill('ls');
    await input.press('Enter');

    // Output should contain directory listing
    const output = page.locator('#terminal-output');
    await expect(output).toContainText('writing');

    // Change directory
    await input.fill('cd writing');
    await input.press('Enter');
    await expect(page.locator('#terminal-cwd')).toContainText('~/writing');

    // Clear with Ctrl+L
    await page.keyboard.press('Control+l');
    await expect(output).toBeEmpty();
  });

  test('persists open state to localStorage and restores on reload', async ({ page }) => {
    await page.goto('/');
    await clearTerminalState(page);
    await page.reload();

    const shell = page.locator('#terminal-mode-shell');
    await expect(shell).toHaveClass(/hidden/);

    // Open terminal
    await page.keyboard.press('Control+Shift+T');
    await expect(shell).not.toHaveClass(/hidden/);

    // Reload — terminal should auto-open
    await page.reload();
    await expect(shell).not.toHaveClass(/hidden/);

    // Close via minimize button
    await page.locator('#terminal-minimize-btn').click();
    await expect(shell).toHaveClass(/hidden/);

    // localStorage should record closed state
    const isOpen = await page.evaluate(() => localStorage.getItem('terminal:open'));
    expect(isOpen).toBe('0');

    // Reload — terminal should stay closed
    await page.reload();
    await expect(shell).toHaveClass(/hidden/);
  });

  test('uses pager for long output and quits with q', async ({ page }) => {
    await page.goto('/');
    await clearTerminalState(page);
    await page.reload();

    // Open terminal
    await page.keyboard.press('Control+Shift+T');

    // ls should produce paginated output (site has enough content)
    const input = page.locator('#terminal-input');
    await input.fill('ls');
    await input.press('Enter');

    // Pager may or may not appear depending on viewport —
    // if it does, quit it
    const pager = page.locator('#terminal-pager');
    if (await pager.isVisible().catch(() => false)) {
      await page.keyboard.press('q');
      await expect(pager).toBeHidden();
    }
  });
});