import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { test, expect } from '@playwright/test';

// Spelling guard (#126): the site uses American spelling. This is a fixed word
// list, not a pattern, so "advertise", "install" and friends are never flagged.
// Known exceptions live in tests/spelling-allow.json, each with a reason.

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = join(ROOT, 'src');

const BRITISH = [
  'practise', 'practised', 'practising',
  'labelled', 'labelling',
  'colour', 'colours',
  'cancelled', 'cancelling',
  'analyse', 'analysed', 'analysing',
  'travelling', 'travelled',
  'summarise', 'summarises', 'summarised', 'summarising',
  'recognise', 'recognised',
  'realise', 'realised',
  'generalise',
  'centre',
  'judgement',
  'licence',
  'personalisation',
  'serialises',
  'capitalised',
  'anonymise',
];
const WORD = new RegExp(`\\b(${BRITISH.join('|')})\\b`, 'gi');

type Allow = { file: string; word: string; reason: string };
const allow: Allow[] = JSON.parse(readFileSync(new URL('./spelling-allow.json', import.meta.url), 'utf8'));

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(md|mdx|astro|ts)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

test.describe('American spelling', () => {
  test('every allowlist entry has a file, a word and a reason', () => {
    for (const a of allow) {
      expect(a.file, 'file').toBeTruthy();
      expect(BRITISH, `${a.file}: word`).toContain(a.word.toLowerCase());
      expect(a.reason?.trim(), `${a.file}: reason`).toBeTruthy();
    }
  });

  test('no British spellings under src/ except allowlisted ones', () => {
    const hits: string[] = [];
    for (const f of files(SRC)) {
      const rel = relative(ROOT, f);
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(WORD)) {
          if (allow.some((a) => a.file === rel && a.word.toLowerCase() === m[0].toLowerCase())) continue;
          hits.push(`${rel}:${i + 1}: "${m[0]}"`);
        }
      });
    }
    expect(hits, 'British spellings found (use American, or allowlist with a reason)').toEqual([]);
  });
});
