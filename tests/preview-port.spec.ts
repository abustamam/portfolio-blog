import { test, expect } from '@playwright/test';
import config from '../playwright.config';
import { DEFAULT_PORT, WORKTREE_PORT_COUNT, WORKTREE_PORT_MIN, isLinkedWorktree, previewPort } from './support/previewPort';

// Parallel sessions each work in their own git worktree. These tests pin down
// that each one previews and tests its own build.

const MAIN = '/data/coding/blog';
const A = '/data/coding/blog/.claude/worktrees/guide-prompt';
const B = '/data/coding/blog/.claude/worktrees/guide-scrubber';

test.describe('preview port', () => {
  test('the main checkout and CI use the default port', () => {
    expect(previewPort(MAIN, {}, false)).toBe(DEFAULT_PORT);
    expect(previewPort('/home/runner/work/portfolio-blog/portfolio-blog', {}, false)).toBe(4321);
  });

  test('a worktree gets its own stable port in the worktree range', () => {
    const a = previewPort(A, {}, true);
    const b = previewPort(B, {}, true);
    for (const p of [a, b]) {
      expect(p).toBeGreaterThanOrEqual(WORKTREE_PORT_MIN);
      expect(p).toBeLessThan(WORKTREE_PORT_MIN + WORKTREE_PORT_COUNT);
    }
    expect(a).not.toBe(b);
    expect(a).not.toBe(DEFAULT_PORT);
    expect(previewPort(A, {}, true)).toBe(a);
  });

  test('PORT overrides, and a value that is not a port is ignored', () => {
    expect(previewPort(A, { PORT: '5005' }, true)).toBe(5005);
    expect(previewPort(MAIN, { PORT: '5005' }, false)).toBe(5005);
    for (const bad of ['', 'abc', '0', '-1', '70000', '43.5']) {
      expect(previewPort(MAIN, { PORT: bad }, false), bad).toBe(DEFAULT_PORT);
    }
  });

  test('a directory with no .git is not a worktree', () => {
    expect(isLinkedWorktree('/nonexistent/path')).toBe(false);
  });

  test('the config serves this checkout on its own port and never reuses a running server', ({ baseURL }) => {
    const port = previewPort(process.cwd(), process.env);
    const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    expect(server?.reuseExistingServer).toBe(false);
    expect(server?.url).toBe(`http://localhost:${port}`);
    expect(server?.command).toContain(`--port ${port}`);
    expect(baseURL).toBe(`http://localhost:${port}`);
  });
});
