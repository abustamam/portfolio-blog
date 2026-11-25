import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { join } from 'node:path';

// The port `astro preview` serves the built site on during a test run.
//
// Every git worktree gets its own port, so sessions working in parallel never
// run their browser tests against each other's build. The main checkout (and
// CI) keep Astro's default.

export const DEFAULT_PORT = 4321;
export const WORKTREE_PORT_MIN = 4400;
export const WORKTREE_PORT_COUNT = 500;

/** In a linked worktree `.git` is a file that points at the main checkout. */
export function isLinkedWorktree(dir: string): boolean {
  try {
    return statSync(join(dir, '.git')).isFile();
  } catch {
    return false;
  }
}

/**
 * `PORT` wins when it is a valid port. Otherwise a linked worktree gets a
 * port derived from its path (stable across runs, 4400–4899) and anything
 * else gets 4321. Two worktrees can land on the same port; the run then
 * fails, because the Playwright config never reuses a running server.
 */
export function previewPort(dir: string, env: { PORT?: string }, linked = isLinkedWorktree(dir)): number {
  const fromEnv = Number(env.PORT);
  if (Number.isInteger(fromEnv) && fromEnv > 0 && fromEnv < 65536) return fromEnv;
  if (!linked) return DEFAULT_PORT;
  const hash = parseInt(createHash('sha1').update(dir).digest('hex').slice(0, 8), 16);
  return WORKTREE_PORT_MIN + (hash % WORKTREE_PORT_COUNT);
}
