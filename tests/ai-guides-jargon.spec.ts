import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

// The jargon check (#122): every glossary term must be marked with <Term> on
// its first use in a guide. The logic lives in scripts/check-glossary-terms.mjs;
// this spec runs it so `bun run test` covers it.

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts/check-glossary-terms.mjs');
const GUIDES = join(ROOT, 'src/content/guides');

// The five "start from zero" posts were written before the check and may not be
// edited by the audit (#122). Their findings are printed as warnings, not
// failures, until a follow-up marks them. Remove an id here once its post is clean.
const SOFT = ['does-it-remember', 'first-ten-minutes', 'photos-files-voice', 'usage-limits', 'what-is-ai'];

const check = (args: string[] = []) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

test.describe('guide jargon check', () => {
  test('the files the check skips are exactly the agreed list', () => {
    const out = check(['--list-excludes']).stdout.trim().split('\n').map((l) => l.split('\t')[0]);
    // Printed so a new skip is visible in review; adding one means changing this line.
    console.log(`jargon check skips: ${out.join(', ')} (and src/content/ai-partials/*.md, never scanned)`);
    expect(out).toEqual(['term-fixture.mdx', 'glossary.mdx']);
  });

  test('every guide is clean', () => {
    const r = check(['--soft', SOFT.join(',')]);
    if (r.stderr) console.log(r.stderr);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('guides clean');
  });

  test('only the five start-from-zero posts are soft', () => {
    expect([...SOFT].sort()).toEqual(['does-it-remember', 'first-ten-minutes', 'photos-files-voice', 'usage-limits', 'what-is-ai']);
    const guides = readdirSync(GUIDES).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
    for (const id of SOFT) expect(guides, id).toContain(id);
    for (const id of ['examples', 'job-search', 'never-paste', 'prompt', 'when-ai-is-wrong', 'which-model', 'which-tool']) {
      expect(SOFT, id).not.toContain(id);
    }
  });

  test('every allowlist entry has a reason and a sentence', () => {
    const entries = JSON.parse(readFileSync(join(ROOT, 'scripts/glossary-terms-allow.json'), 'utf8'));
    for (const e of entries) {
      expect(e.reason?.trim(), `${e.guide}/${e.term}`).toBeTruthy();
      expect(e.sentence?.trim(), `${e.guide}/${e.term}`).toBeTruthy();
    }
  });

  test('the check bites: unmarking one <Term> fails it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jargon-'));
    try {
      cpSync(GUIDES, dir, { recursive: true });
      const file = join(dir, 'job-search.mdx');
      const src = readFileSync(file, 'utf8');
      expect(src).toContain('<Term>chat app</Term>');
      writeFileSync(file, src.replace('<Term>chat app</Term>', 'chat app'));
      const r = check(['--dir', dir, '--soft', SOFT.join(',')]);
      console.log(r.stderr);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('job-search.mdx');
      expect(r.stderr).toContain('"chat app"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the check ignores headings, link text, code and attribute values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jargon-'));
    try {
      writeFileSync(
        join(dir, 'sample.mdx'),
        [
          '---',
          'title: A model prompt',
          '---',
          'import Term from "../x.astro";',
          '',
          '## The prompt heading',
          '',
          'See [the prompt guide](/ai-guides/prompt/) and `prompt` and <a href="/x" title="prompt">a model</a>.',
          '',
          '<div title="the chat app">Plain text.</div>',
          '',
        ].join('\n'),
      );
      const r = check(['--dir', dir]);
      expect(r.status, r.stderr).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
