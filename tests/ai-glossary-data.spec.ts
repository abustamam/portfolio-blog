import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { GLOSSARY, findTerm } from '../src/consts/guides/glossary';

// The glossary data (#124): the single source for the glossary page and the
// term popovers. Pure data checks, no browser.

const SRC = fileURLToPath(new URL('../src/content/guides/', import.meta.url));
const published = readdirSync(SRC)
  .filter((f) => f.endsWith('.mdx'))
  .filter((f) => !/^draft:\s*true\s*$/m.test(readFileSync(SRC + f, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''))
  .map((f) => f.replace(/\.mdx$/, ''));
const PLANNED = ['what-is-ai', 'first-ten-minutes', 'usage-limits', 'does-it-remember', 'photos-files-voice'];
const words = (s: string) => s.trim().split(/\s+/).length;

test.describe('glossary data', () => {
  test('there are 18 entries and six are marked "first"', () => {
    expect(GLOSSARY).toHaveLength(18);
    expect(GLOSSARY.filter((t) => t.first).map((t) => t.id)).toEqual(['ai', 'chat-app', 'prompt', 'model', 'conversation', 'usage-limit']);
  });

  test('every short is 25 words or fewer, and every why is one non-empty sentence', () => {
    for (const t of GLOSSARY) {
      expect(words(t.short), `${t.id} short`).toBeLessThanOrEqual(25);
      expect(t.why.trim().length, `${t.id} why`).toBeGreaterThan(0);
      expect((t.why.match(/[.!?](\s|$)/g) ?? []).length, `${t.id} why is one sentence`).toBe(1);
    }
  });

  test('ids are unique', () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('no term or synonym resolves to two entries', () => {
    const seen = new Map<string, string>();
    for (const t of GLOSSARY) {
      for (const name of [t.term, ...(t.also ?? [])]) {
        const key = name.toLowerCase();
        expect(seen.get(key), `"${name}" is claimed by ${seen.get(key)} and ${t.id}`).toBeUndefined();
        seen.set(key, t.id);
      }
    }
  });

  test('findTerm resolves a term or any synonym, case-insensitively', () => {
    for (const t of GLOSSARY) {
      for (const name of [t.term, ...(t.also ?? [])]) {
        expect(findTerm(name)?.id).toBe(t.id);
        expect(findTerm(name.toUpperCase())?.id).toBe(t.id);
        expect(findTerm(`  ${name.toLowerCase()} `)?.id).toBe(t.id);
      }
    }
    expect(findTerm('Chatbot')?.id).toBe('chat-app');
    expect(findTerm('free tier')?.id).toBe('plan');
    expect(findTerm('not a term')).toBeUndefined();
    expect(findTerm('')).toBeUndefined();
  });

  test('every guide value is a published guide or one of the five planned slugs', () => {
    const ok = new Set([...published, ...PLANNED]);
    for (const t of GLOSSARY) if (t.guide) expect(ok.has(t.guide), `${t.id} -> ${t.guide}`).toBe(true);
  });
});
