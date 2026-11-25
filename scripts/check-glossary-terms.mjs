#!/usr/bin/env node
// Jargon check for the AI guides (#122).
//
// For every guide in src/content/guides/ (minus EXCLUDES), every glossary term
// or synonym from src/consts/guides/glossary.ts must be marked on its first use
// in body prose: wrapped in <Term>. Exceptions:
//   - the term's home guide (the glossary entry's `guide`) explains it itself;
//   - an ordinary-word use listed in scripts/glossary-terms-allow.json.
//
// Not read as prose: frontmatter, import/export lines, JSX comments and
// expressions, headings, link text, inline and fenced code, <pre>/<code>/
// <style>/<script> blocks and HTML tags (so attribute values are skipped).
//
// A bold lead-in at the start of a list item ("- **Prompt.** What you type...")
// counts as marking the term when it is exactly the term, or when the same item
// marks the term with <Term> (#141).
//
// Usage: node scripts/check-glossary-terms.mjs [--dir <guidesDir>] [--allow <file>] [--list-excludes]
// Exit 0 when clean, 1 on findings, 2 on a bad allowlist or setup.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Files the check skips, with the reason. A new entry must be called out in review. */
export const EXCLUDES = [
  { file: 'term-fixture.mdx', reason: 'draft test fixture for tests/ai-guide-term.spec.ts, never built' },
  { file: 'glossary.mdx', reason: 'the glossary page itself, where every term is defined' },
];
// src/content/ai-partials/*.md is not listed: the check only reads
// src/content/guides/*.mdx, so a partial is never scanned (#137 owns those).

// ---------------------------------------------------------------- glossary
export function loadGlossary(path = join(ROOT, 'src/consts/guides/glossary.ts')) {
  const src = readFileSync(path, 'utf8');
  const start = src.indexOf('export const GLOSSARY');
  const end = src.indexOf('\n];', start);
  const body = src.slice(start, end);
  const entries = [];
  for (const block of body.split(/\n  \{\n/).slice(1)) {
    const field = (name) => block.match(new RegExp(`^    ${name}: '((?:[^'\\\\]|\\\\.)*)'`, 'm'))?.[1];
    const also = block.match(/^    also: \[([^\]]*)\]/m)?.[1];
    entries.push({
      id: field('id'),
      term: field('term'),
      words: [field('term'), ...(also ? [...also.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]) : [])],
      guide: field('guide'),
    });
  }
  return entries;
}

// ------------------------------------------------------------- extraction
// Every step replaces text with spaces (newlines kept), so offsets and line
// numbers stay those of the source file.
const blankStr = (s) => s.replace(/[^\n]/g, ' ');
function blank(text, re) {
  return text.replace(re, blankStr);
}

/** Blank balanced {...} JSX expressions (and comments, which are expressions). */
function blankBraces(text) {
  const out = text.split('');
  let depth = 0;
  let from = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) from = i;
      depth++;
    } else if (text[i] === '}' && depth > 0) {
      depth--;
      if (depth === 0) for (let j = from; j <= i; j++) if (out[j] !== '\n') out[j] = ' ';
    }
  }
  if (depth > 0) for (let j = from; j < out.length; j++) if (out[j] !== '\n') out[j] = ' ';
  return out.join('');
}

function blankImportsExports(text) {
  const lines = text.split('\n');
  let open = false;
  return lines
    .map((line) => {
      if (!open && /^(import|export)\b/.test(line)) open = true;
      if (!open) return line;
      if (/;\s*$/.test(line)) open = false;
      return blankStr(line);
    })
    .join('\n');
}

/** Source text with everything that is not body prose blanked, plus the <Term> ranges. */
export function extract(source, glossary) {
  let text = source;
  const fm = text.match(/^---\n[\s\S]*?\n---(?=\n|$)/);
  if (fm) text = blankStr(fm[0]) + text.slice(fm[0].length);

  const terms = [];
  const termRe = /<Term(?:\s+id="([^"]*)")?\s*>([\s\S]*?)<\/Term>/g;
  for (const m of text.matchAll(termRe)) {
    const open = m[0].indexOf('>') + 1;
    const inner = m[2];
    const word = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const entry = m[1]
      ? glossary.find((g) => g.id === m[1])
      : glossary.find((g) => g.words.some((w) => w.toLowerCase() === word));
    terms.push({ start: m.index + open, end: m.index + open + inner.length, entry, word });
  }

  text = blankImportsExports(text);
  text = blank(text, /```[\s\S]*?```/g);
  text = blank(text, /`[^`\n]*`/g);
  text = blankBraces(text);
  text = blank(text, /^#{1,6}[ \t].*$/gm);
  text = blank(text, /!?\[[^\]\n]*\]\([^)\n]*\)/g);
  for (const tag of ['a', 'pre', 'code', 'style', 'script']) {
    text = blank(text, new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi'));
  }
  text = blank(text, /<\/?[A-Za-z][^>]*>/g);
  return { text, terms };
}

// ---------------------------------------------------------------- matching
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findOccurrences(text, glossary) {
  const all = [];
  for (const entry of glossary) {
    for (const w of entry.words) {
      const flags = /[A-Z]/.test(w) ? 'g' : 'gi'; // AI, LLM, "AI app" are case-sensitive
      const re = new RegExp(`(?<![\\w-])${escapeRe(w).replace(/\\? /g, '\\s+')}(?:s|es|ed|ing)?(?![\\w-])`, flags);
      for (const m of text.matchAll(re)) all.push({ entry, start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  // Longest match wins where two overlap ("chat app" beats "chat", "free plan" beats "plan").
  all.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept = [];
  let last = -1;
  for (const o of all) {
    if (o.start < last) continue;
    kept.push(o);
    last = o.end;
  }
  return kept;
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
const around = (source, o) => source.slice(Math.max(0, o.start - 40), o.end + 40).replace(/\s+/g, ' ').trim();

export function loadAllow(path) {
  const entries = JSON.parse(readFileSync(path, 'utf8'));
  const problems = [];
  entries.forEach((e, i) => {
    for (const k of ['guide', 'term', 'sentence', 'reason']) {
      if (typeof e[k] !== 'string' || !e[k].trim()) problems.push(`allowlist entry ${i + 1}: "${k}" is missing or empty`);
    }
  });
  return { entries, problems };
}

/**
 * Bold lead-ins ("- **Prompt.** What you type...") that define their own term:
 * the lead-in is exactly the term, or the same list item marks the term with <Term>.
 * Such an occurrence is the term's definition, so it counts as marked.
 */
function markLeadIns(text, occ) {
  const itemRe = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\*\*([^*\n]+)\*\*/gm;
  for (const m of text.matchAll(itemRe)) {
    const from = m.index + m[0].indexOf('**');
    const to = from + m[1].length + 4;
    const rest = text.slice(m.index + m[0].length);
    const end = m.index + m[0].length + (rest.search(/\n[ \t]*(?:[-*+]|\d+[.)])[ \t]|\n[ \t]*\n/) + 1 || rest.length + 1) - 1;
    const bare = m[1].trim().replace(/[.:]$/, '').trim().toLowerCase();
    for (const o of occ) {
      if (o.marked || o.start < from || o.end > to) continue;
      const exact = o.text.toLowerCase() === bare;
      const marksInItem = occ.some((x) => x.marked && x.entry === o.entry && x.start >= to && x.end <= end);
      if (exact || marksInItem) o.marked = true;
    }
  }
}

/** Check one guide. Returns { findings, used } where used = allowlist entries that matched. */
export function checkGuide(id, source, glossary, allow) {
  const { text, terms } = extract(source, glossary);
  const used = new Set();
  const findings = [];
  const occ = findOccurrences(text, glossary).filter((o) => !terms.some((t) => o.start >= t.start && o.end <= t.end));
  for (const t of terms) {
    if (!t.entry) {
      findings.push({ line: lineOf(source, t.start), msg: `<Term> "${t.word}" is not in the glossary`, term: t.word });
    } else {
      occ.push({ entry: t.entry, start: t.start, end: t.end, text: t.word, marked: true });
    }
  }
  occ.sort((a, b) => a.start - b.start);
  markLeadIns(text, occ);

  for (const entry of glossary) {
    if (entry.guide === id) continue; // the home guide explains it itself
    for (const o of occ.filter((x) => x.entry === entry)) {
      if (o.marked) break; // first real use is marked: done with this term
      const hit = allow.findIndex((a) => {
        if (a.guide !== id) return false;
        const t = a.term.toLowerCase();
        if (!(t === o.text.toLowerCase() || t === entry.term.toLowerCase() || entry.words.some((w) => w.toLowerCase() === t))) return false;
        const at = source.indexOf(a.sentence);
        return at >= 0 && o.start >= at && o.end <= at + a.sentence.length;
      });
      if (hit >= 0) {
        used.add(hit);
        continue;
      }
      findings.push({
        line: lineOf(source, o.start),
        term: entry.term,
        msg: `"${o.text}" (glossary: ${entry.term}) is used before it is marked: ...${around(source, o)}...`,
      });
      break; // one finding per term per guide
    }
  }
  return { findings, used };
}

// ------------------------------------------------------------------- main
export function run({ dir, allowPath, glossaryPath } = {}) {
  const guidesDir = dir ?? join(ROOT, 'src/content/guides');
  const glossary = loadGlossary(glossaryPath);
  const { entries: allow, problems } = loadAllow(allowPath ?? join(ROOT, 'scripts/glossary-terms-allow.json'));
  const excluded = new Set(EXCLUDES.map((e) => e.file));
  const files = readdirSync(guidesDir).filter((f) => f.endsWith('.mdx') && !excluded.has(f)).sort();
  const lines = [...problems];
  const used = new Set();
  for (const f of files) {
    const id = basename(f, '.mdx');
    const source = readFileSync(join(guidesDir, f), 'utf8');
    const res = checkGuide(id, source, glossary, allow);
    res.used.forEach((i) => used.add(i));
    for (const x of res.findings) lines.push(`${f}:${x.line}: ${x.msg}`);
  }
  allow.forEach((a, i) => {
    if (!used.has(i) && guidesDir === join(ROOT, 'src/content/guides')) {
      lines.push(`allowlist entry ${i + 1} (${a.guide}, "${a.term}") matches nothing: remove it or fix its sentence`);
    }
  });
  return { files, lines };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  if (process.argv.includes('--list-excludes')) {
    for (const e of EXCLUDES) console.log(`${e.file}\t${e.reason}`);
    process.exit(0);
  }
  const dir = arg('--dir');
  if (dir && !existsSync(dir)) {
    console.error(`check-glossary-terms: ${dir} does not exist`);
    process.exit(2);
  }
  const { files, lines } = run({ dir, allowPath: arg('--allow') });
  if (lines.length) {
    console.error(`check-glossary-terms: ${lines.length} problem(s) in ${files.length} guides\n`);
    for (const l of lines) console.error(l);
    process.exit(1);
  }
  console.log(`check-glossary-terms: ${files.length} guides clean`);
}
