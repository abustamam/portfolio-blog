import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
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
const PARTIALS_DIR = join(ROOT, 'src/content/ai-partials');

const check = (args: string[] = []) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

test.describe('guide jargon check', () => {
  test('the files the check skips are exactly the agreed list', () => {
    const out = check(['--list-excludes']).stdout.trim().split('\n').map((l) => l.split('\t')[0]);
    // Printed so a new skip is visible in review; adding one means changing this line.
    console.log(`jargon check skips: ${out.join(', ')}`);
    expect(out).toEqual(['term-fixture.mdx', 'glossary.mdx']);
  });

  test('every guide is clean', () => {
    const r = check();
    if (r.stderr) console.log(r.stderr);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/\d+ guides and 2 partials clean/);
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
      const file = join(dir, 'does-it-remember.mdx'); // a start-from-zero post
      const src = readFileSync(file, 'utf8');
      expect(src).toContain('<Term>chat app</Term>');
      writeFileSync(file, src.replace('<Term>chat app</Term>', 'chat app'));
      const r = check(['--dir', dir]);
      console.log(r.stderr);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('does-it-remember.mdx');
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

  const sample = (lines: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), 'jargon-'));
    try {
      writeFileSync(join(dir, 'sample.mdx'), ['---', 'title: Sample', '---', '', ...lines, ''].join('\n'));
      return check(['--dir', dir]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  test('a bold lead-in that is exactly the term counts as defining it', () => {
    expect(sample(['- **Prompt.** What you type to it.', '- **Model.** The part that writes.']).status).toBe(0);
    // Not exactly the term: still a finding.
    const r = sample(['- **A good prompt.** What you type to it.']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('"prompt"');
  });

  test('a bold lead-in counts when the same list item marks the term', () => {
    expect(sample(['- **The large model.** A <Term>model</Term> writes the answers.', '- **A thinking setting.** The <Term id="thinking">thinking setting</Term> helps.']).status).toBe(0);
    // The term is marked in the next item, not this one: still a finding.
    const r = sample(['- **The large model.** It writes the answers.', '- **Another.** A <Term>model</Term> writes.']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('"model"');
  });

  // Run the check on a temp copy of the partials, with some files replaced.
  const withPartials = (files: Record<string, string>, drop: string[] = []) => {
    const dir = mkdtempSync(join(tmpdir(), 'jargon-partials-'));
    try {
      cpSync(PARTIALS_DIR, dir, { recursive: true });
      for (const f of drop) unlinkSync(join(dir, f));
      for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text);
      return check(['--partials-dir', dir]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  // protects=a new partial cannot skip the jargon check; fails_when=a file in src/content/ai-partials/ is not named by PARTIALS (or PARTIALS names a file that is gone); no_claim=that the listed files are free of findings (the "every guide is clean" test does that)
  test('PARTIALS names exactly the files in src/content/ai-partials/', async () => {
    const { PARTIALS } = await import(SCRIPT);
    const listed = PARTIALS.flatMap((p: { parts: string[] }) => p.parts).sort();
    expect(listed).toEqual(readdirSync(PARTIALS_DIR).sort());
  });

  // protects=deleting a <Term> from a shared partial is caught, with the part file and its own line; fails_when=the check does not read partials, or reports the joined-document line instead of the line in that file; no_claim=that the reported term is the only one missing, or that guide files are checked here
  test('a <Term> removed from never-paste-before.mdx fails, naming the file and line', () => {
    const file = 'never-paste-before.mdx';
    const src = readFileSync(join(PARTIALS_DIR, file), 'utf8');
    expect(src).toContain('<Term>chat</Term>');
    const line = src.split('\n').findIndex((l) => l.includes('<Term>chat</Term>')) + 1;
    const r = withPartials({ [file]: src.replace('<Term>chat</Term>', 'chat') });
    console.log(r.stderr);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`${file}:${line}:`);
    expect(r.stderr).toContain('"chat"');
  });

  // protects=the before-half and after-half count as one document, in render order; fails_when=a term marked in the before-half is reported in the after-half, or an unmarked first use in the after-half is not reported; no_claim=that a term marked only in the after-half covers earlier uses (it does not: order matters)
  test('a term marked in the before-half needs no mark in the after-half', () => {
    const before = ['A <Term>chat</Term> is a conversation.', ''].join('\n');
    const after = ['Another chat follows.', ''].join('\n');
    const ok = withPartials({ 'never-paste-before.mdx': `import Term from '../../components/guides/Term.astro';\n\n${before}`, 'never-paste-after.mdx': after });
    expect(ok.status, ok.stderr).toBe(0);
    // Same words, nothing marked in the before-half: the after-half's use is the first, and is a finding.
    const bad = withPartials({ 'never-paste-before.mdx': 'Nothing here.\n', 'never-paste-after.mdx': after });
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('never-paste-after.mdx:1:');
  });

  // protects=a partial is exempt from explaining the glossary entry whose home guide is its host (the prompt partial may use "prompt" unmarked), and from no other; fails_when=the host guide is not passed as the home, so the exemption is lost, or it is granted to every partial; no_claim=that the real prompt.md uses the word outside its code block (it does not today)
  test('the host guide of a partial is its glossary home', () => {
    const prose = 'A good prompt is specific.\n';
    const home = withPartials({ 'prompt.md': prose });
    expect(home.status, home.stderr).toBe(0);
    const away = withPartials({ 'never-paste-after.mdx': prose });
    expect(away.status).toBe(1);
    expect(away.stderr).toContain('never-paste-after.mdx:1:');
    expect(away.stderr).toContain('"prompt"');
  });

  // protects=a missing part file is a setup error, not a silent skip; fails_when=the check exits 0 or 1 when a PARTIALS file is gone; no_claim=anything about the content of the other files
  test('a missing partial file is a setup error naming it', () => {
    const r = withPartials({}, ['never-paste-after.mdx']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('never-paste-after.mdx');
  });

  test('--soft is gone: a guide cannot be made warn-only', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).not.toMatch(/soft/i);
  });
});
