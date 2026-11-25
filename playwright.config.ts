import { defineConfig, devices } from '@playwright/test';
import { previewPort } from './tests/support/previewPort';

// One preview port per git worktree (see tests/support/previewPort.ts).
const port = previewPort(process.cwd(), process.env);
const url = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: url,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${port}`,
    url,
    // Never reuse a server that is already listening: it may be serving
    // another worktree's build. A busy port fails the run instead.
    reuseExistingServer: false,
  },
});
