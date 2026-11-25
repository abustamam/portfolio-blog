// Writes the synthetic sample spreadsheet for the data-analysis kit
// (expenses-2025.csv) and the answer key (answer-key.json) with the true
// totals and where every oddity was seeded. Deterministic: the same run always
// writes the same files.
//
//   node kits/data-analysis/tools/generate-sample.mjs
//
// Everything here is invented: made-up vendors, no real people or companies.
// Amounts are kept in whole cents so the totals are exact.
//
// Seeded oddities (one of each kind):
//   - one duplicate row (an exact copy of the row above it)
//   - one blank Amount
//   - one outlier: 18450.00 where 184.50 was meant (a slipped decimal point)
//   - one inconsistent category: 4 rows say "Supplies", the rest "Office Supplies"
// totals.outlierKept removes the duplicate and merges names but leaves the
// outlier as written (what the prompts tell the AI to do).
// "True" totals (afterFixes) remove the duplicate, merge the category name,
// correct the outlier to 184.50, and count the blank as nothing.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('../', import.meta.url));

let seed = 20261124;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (a) => a[Math.floor(rand() * a.length)];

const CATEGORIES = {
  Travel: { vendors: ['Sample Airlines', 'Example Hotel', 'Demo Rail', 'Test Taxi Co'], cents: [8000, 62000] },
  Software: { vendors: ['Sample Cloud Tools', 'Demo Design App', 'Example Docs Suite'], cents: [1500, 24000] },
  'Office Supplies': { vendors: ['Sample Stationers', 'Demo Paper Co', 'Example Office Store'], cents: [800, 14000] },
  Meals: { vendors: ['Sample Cafe', 'Demo Catering', 'Example Deli'], cents: [1200, 9500] },
  Training: { vendors: ['Sample Learning', 'Demo Courses', 'Example Workshop'], cents: [12000, 48000] },
  Equipment: { vendors: ['Sample Electronics', 'Demo Hardware', 'Example Furniture'], cents: [6000, 90000] },
};
const NAMES = Object.keys(CATEGORIES);
const PAID_BY = ['Staff A', 'Staff B', 'Staff C', 'Staff D', 'Staff E'];
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n) => String(n).padStart(2, '0');

let rows = [];
for (let m = 1; m <= 12; m++) {
  const n = int(23, 27);
  for (let i = 0; i < n; i++) {
    const category = pick(NAMES);
    const c = CATEGORIES[category];
    rows.push({
      date: `2025-${pad(m)}-${pad(int(1, DAYS[m - 1]))}`,
      vendor: pick(c.vendors),
      category,
      cents: int(c.cents[0], c.cents[1]),
      paidBy: pick(PAID_BY),
    });
  }
}
rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// Make sure the "Travel in March" question is not touched by any oddity, so
// its answer is the same in the raw file and after the fixes.
const free = (pred) => {
  const idx = rows.map((r, i) => (pred(r) && !r.odd ? i : -1)).filter((i) => i >= 0);
  const i = idx[Math.floor(rand() * idx.length)];
  return i;
};
const notTravelMarch = (r) => !(r.category === 'Travel' && r.date.startsWith('2025-03'));

const outlierIdx = free((r) => r.category === 'Office Supplies' && r.date >= '2025-08' && r.date < '2025-09');
rows[outlierIdx].odd = 'outlier';
rows[outlierIdx].cents = 1845000;
const blankIdx = free((r) => r.category === 'Meals' && r.date >= '2025-05' && r.date < '2025-06');
rows[blankIdx].odd = 'blank';
rows[blankIdx].cents = null;
const variantIdxs = [];
while (variantIdxs.length < 4) {
  const i = free((r) => r.category === 'Office Supplies' && notTravelMarch(r));
  rows[i].odd = 'variant';
  rows[i].categoryText = 'Supplies';
  variantIdxs.push(i);
}
const dupAt = free((r) => r.category === 'Software' && r.date >= '2025-09' && r.date < '2025-10');
rows[dupAt].odd = 'duplicate';
rows.splice(dupAt + 1, 0, { ...rows[dupAt], odd: 'duplicate-copy' });

const money = (c) => (c / 100).toFixed(2);
const header = 'Date,Vendor,Category,Amount,Paid by';
const line = (r) =>
  [r.date, r.vendor, r.categoryText ?? r.category, r.cents === null ? '' : money(r.cents), r.paidBy].join(',');
const lines = rows.map(line);
writeFileSync(`${KIT}expenses-2025.csv`, [header, ...lines].join('\n') + '\n');

// Spreadsheet row number = index + 2 (row 1 is the header).
const rowOf = (pred) => rows.map((r, i) => (pred(r) ? i + 2 : -1)).filter((n) => n > 0);
const sum = (rs) => rs.reduce((t, r) => t + (r.cents ?? 0), 0);
const fixed = rows
  .filter((r) => r.odd !== 'duplicate-copy')
  .map((r) => (r.odd === 'outlier' ? { ...r, cents: 18450 } : r));
// What an AI gets by following the prompts exactly: duplicate removed, names
// merged, outlier kept (the prompts say to list it and ask, not to change it).
const outlierKept = rows.filter((r) => r.odd !== 'duplicate-copy');
const byCategory = {};
const byMonth = {};
for (const r of fixed) {
  byCategory[r.category] = (byCategory[r.category] ?? 0) + (r.cents ?? 0);
  const mo = r.date.slice(0, 7);
  byMonth[mo] = (byMonth[mo] ?? 0) + (r.cents ?? 0);
}
const toDollars = (o) => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, v / 100]));
const travelMarch = fixed.filter((r) => r.category === 'Travel' && r.date.startsWith('2025-03'));

const facts = {
  file: 'expenses-2025.csv',
  columns: header.split(','),
  rowsInFile: rows.length,
  rowsAfterRemovingDuplicate: rows.length - 1,
  oddities: {
    duplicate: { rows: rowOf((r) => r.odd === 'duplicate' || r.odd === 'duplicate-copy'), line: line(rows[dupAt]) },
    blank: { row: rowOf((r) => r.odd === 'blank')[0], column: 'Amount' },
    outlier: { row: rowOf((r) => r.odd === 'outlier')[0], amount: 18450, likelyAmount: 184.5 },
    category: { canonical: 'Office Supplies', variant: 'Supplies', rows: rowOf((r) => r.odd === 'variant') },
  },
  totals: { asInFile: sum(rows) / 100, outlierKept: sum(outlierKept) / 100, afterFixes: sum(fixed) / 100 },
  byCategory: toDollars(byCategory),
  byMonth: toDollars(byMonth),
  question: {
    text: 'How much did we spend on Travel in March 2025?',
    category: 'Travel',
    month: '2025-03',
    rows: travelMarch.length,
    answer: sum(travelMarch) / 100,
  },
};
writeFileSync(`${KIT}answer-key.json`, JSON.stringify(facts, null, 2) + '\n');
console.log(`wrote ${rows.length} rows; total after fixes ${facts.totals.afterFixes}`);
