// Tests for the data-analysis kit (bun test kits/data-analysis).
//
// Every fact in answer-key.json is recomputed here straight from the CSV with
// its own tiny parser, so the key cannot drift from the file it describes.

import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildKit, KITS } from '../../scripts/build-log-kit.mjs';

const DIR = new URL('./', import.meta.url).pathname;
const read = (f: string) => readFileSync(join(DIR, f), 'utf8');
const facts = JSON.parse(read('answer-key.json'));

type Row = { n: number; date: string; vendor: string; category: string; amount: number | null; text: string };
const lines = read('expenses-2025.csv').trimEnd().split('\n');
const rows: Row[] = lines.slice(1).map((text, i) => {
  const [date, vendor, category, amount] = text.split(',');
  return { n: i + 2, date, vendor, category, amount: amount === '' ? null : Math.round(Number(amount) * 100), text };
});
const cents = (rs: Row[]) => rs.reduce((t, r) => t + (r.amount ?? 0), 0);
const dollars = (c: number) => c / 100;

// The same fixes the key describes: drop the exact duplicate, merge the
// category name, put the outlier back to 184.50, leave the blank at nothing.
function fixed(): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    if (seen.has(r.text)) continue;
    seen.add(r.text);
    out.push({
      ...r,
      category: r.category === 'Supplies' ? 'Office Supplies' : r.category,
      amount: r.n === facts.oddities.outlier.row ? 18450 : r.amount,
    });
  }
  return out;
}

describe('sample file', () => {
  test('is a few hundred rows with five columns', () => {
    expect(lines[0]).toBe('Date,Vendor,Category,Amount,Paid by');
    expect(rows.length).toBeGreaterThanOrEqual(250);
    expect(rows.length).toBeLessThanOrEqual(400);
    for (const l of lines) expect(l.split(',').length).toBe(5);
    expect(rows.length).toBe(facts.rowsInFile);
  });

  test('has exactly the seeded oddities, found from the CSV alone', () => {
    const counts = new Map<string, number[]>();
    for (const r of rows) counts.set(r.text, [...(counts.get(r.text) ?? []), r.n]);
    const dups = [...counts.values()].filter((v) => v.length > 1);
    expect(dups).toEqual([facts.oddities.duplicate.rows]);
    expect(rows.filter((r) => r.amount === null).map((r) => r.n)).toEqual([facts.oddities.blank.row]);
    const big = rows.filter((r) => (r.amount ?? 0) > 90000);
    expect(big.map((r) => r.n)).toEqual([facts.oddities.outlier.row]);
    expect(dollars(big[0].amount!)).toBe(facts.oddities.outlier.amount);
    const names = new Set(rows.map((r) => r.category));
    expect([...names].sort()).toEqual(['Equipment', 'Meals', 'Office Supplies', 'Software', 'Supplies', 'Training', 'Travel']);
    expect(rows.filter((r) => r.category === 'Supplies').map((r) => r.n)).toEqual(facts.oddities.category.rows);
  });

  test('no real-looking emails or phone numbers', () => {
    const csv = read('expenses-2025.csv');
    expect(csv).not.toMatch(/@/);
    expect(csv).not.toMatch(/\d{3}[-. ]\d{3}[-. ]\d{4}/);
  });
});

describe('answer key matches the CSV', () => {
  test('totals', () => {
    expect(dollars(cents(rows))).toBe(facts.totals.asInFile);
    expect(dollars(cents(fixed()))).toBe(facts.totals.afterFixes);
    expect(fixed().length).toBe(facts.rowsAfterRemovingDuplicate);
  });

  test('by category and by month', () => {
    const byCat: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const r of fixed()) {
      byCat[r.category] = (byCat[r.category] ?? 0) + (r.amount ?? 0);
      byMonth[r.date.slice(0, 7)] = (byMonth[r.date.slice(0, 7)] ?? 0) + (r.amount ?? 0);
    }
    expect(Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, dollars(v)]))).toEqual(facts.byCategory);
    expect(Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, dollars(v)]))).toEqual(facts.byMonth);
  });

  test('the question and its answer', () => {
    const q = facts.question;
    const hit = fixed().filter((r) => r.category === q.category && r.date.startsWith(q.month));
    expect(hit.length).toBe(q.rows);
    expect(dollars(cents(hit))).toBe(q.answer);
  });
});

describe('prompts', () => {
  test('four prompts, each with the five parts in order', () => {
    const bodies = [...read('prompts.md').matchAll(/^## .+\n\n```text\n([\s\S]*?)\n```/gm)].map((m) => m[1]);
    expect(bodies.length).toBe(4);
    for (const b of bodies) {
      const at = ['Situation:', 'Task:', 'Input:', 'Format:', 'Check:'].map((p) => b.indexOf(p));
      expect(at.every((i) => i >= 0), b).toBe(true);
      expect([...at].sort((a, c) => a - c)).toEqual(at);
    }
  });
});

describe('zip', () => {
  test('holds exactly the kit files, byte for byte, and passes a CRC check', () => {
    const { out } = buildKit('data-analysis', join(mkdtempSync(join(tmpdir(), 'data-kit-')), 'kit.zip'));
    const r = Bun.spawnSync(
      ['python3', '-I', '-c', 'import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))', out],
      { stdout: 'pipe', stderr: 'pipe' },
    );
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const entries = JSON.parse(r.stdout.toString());
    const { zipRoot, files } = KITS['data-analysis'];
    expect(Object.keys(entries)).toEqual(files.map((f: string) => zipRoot + f));
    for (const f of files) expect(entries[zipRoot + f], f).toBe(read(f));
  });
});
