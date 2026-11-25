// Social cards for the AI training pages: title on the left, a small picture of
// the page (track list, quiz question, form...) in a panel on the right.
import sharp from 'sharp';
import type { AiCard } from '../consts/aiCards';
import { C, OG_HEIGHT, OG_WIDTH, black, esc, footer, mono, serif, textPath, width, wrap } from './og-card';

const S = { surface: '#ffffff', faint: '#686d76', soft: '#e8e6dd', accentBg: '#dbeadf', accentInk: '#0f3f23', danger: '#b4432b' };

const PAD = 80;
const COL_W = 580;
// Right panel
const PX = 732;
const PY = 84;
const PW = 388;
const PH = 380;

const t = (font: Parameters<typeof width>[0], s: string, x: number, y: number, size: number, fill: string, tracking = 0) =>
  `<path fill="${fill}" d="${textPath(font, s, x, y, size, tracking)}"/>`;
const label = (s: string, x: number, y: number, fill: string = C.mute, size = 15) => t(mono, s.toUpperCase(), x, y, size, fill, 2.5);
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const right = (font: Parameters<typeof width>[0], s: string, xr: number, y: number, size: number, fill: string, tracking = 0) =>
  t(font, s, xr - width(font, s, size, tracking), y, size, fill, tracking);

// Narrow the measure until one more step would add a line, so the last line
// is not a lone word ("This cohort is / full").
function balance(text: string, size: number, n: number) {
  let w = COL_W;
  while (w > 200 && wrap(serif, text, size, w - 10).length === n) w -= 10;
  return wrap(serif, text, size, w);
}

function fit(text: string) {
  for (let size = 76; size >= 44; size -= 4) {
    const lines = wrap(serif, text, size, COL_W);
    if (lines.length <= 3) return { size, lines: balance(text, size, lines.length) };
  }
  return { size: 44, lines: wrap(serif, text, 44, COL_W).slice(0, 3) };
}

function panel(inner: string) {
  return [
    rect(PX + 10, PY + 10, PW, PH, C.line, 'rx="18"'),
    rect(PX, PY, PW, PH, S.surface, `rx="18" stroke="${C.ink}" stroke-width="2"`),
    inner,
  ].join('');
}

const IX = PX + 32; // panel content left
const IR = PX + PW - 32; // panel content right
const IW = IR - IX;

function tracks() {
  const rows = [
    ['Everyday AI', '$79', 'No code'],
    ['Connect', '$99', 'Email + calendar'],
    ['Build', '$149', 'Code + agents'],
  ];
  const out = [label('Three tracks', IX, PY + 52)];
  rows.forEach(([name, price, tag], i) => {
    const y = PY + 76 + i * 82;
    out.push(rect(IX, y, IW, 66, i === 0 ? S.accentBg : C.bg, `rx="10"`));
    out.push(t(serif, name, IX + 20, y + 32, 28, C.ink));
    out.push(t(mono, tag, IX + 20, y + 54, 15, C.mute));
    out.push(right(mono, price, IR - 20, y + 42, 24, i === 0 ? S.accentInk : C.ink));
  });
  const by = PY + PH - 66;
  out.push(rect(IX, by, IW, 42, C.accent, 'rx="21"'));
  const cta = 'RESERVE WITH $25';
  out.push(t(mono, cta, IX + (IW - width(mono, cta, 16, 2.5)) / 2, by + 27, 16, S.surface, 2.5));
  return out.join('');
}

function quiz() {
  const out = [label('Question 3 of 9', IX, PY + 52, C.accent)];
  out.push(rect(IX, PY + 66, IW, 6, S.soft, 'rx="3"'));
  out.push(rect(IX, PY + 66, Math.round((IW * 3) / 9), 6, C.accent, 'rx="3"'));
  out.push(t(serif, 'What would you hand', IX, PY + 118, 27, C.ink));
  out.push(t(serif, 'to AI first?', IX, PY + 150, 27, C.ink));
  const opts = ['Writing and email', 'Meetings and calendar', 'Spreadsheets and data', 'Building a small tool'];
  opts.forEach((o, i) => {
    const y = PY + 176 + i * 48;
    const on = i === 1;
    out.push(rect(IX, y, IW, 38, on ? S.accentBg : S.surface, `rx="8" stroke="${on ? C.accent : C.line}" stroke-width="2"`));
    out.push(`<circle cx="${IX + 20}" cy="${y + 19}" r="8" fill="none" stroke="${on ? C.accent : C.faint}" stroke-width="2"/>`);
    if (on) out.push(`<circle cx="${IX + 20}" cy="${y + 19}" r="4" fill="${C.accent}"/>`);
    out.push(t(mono, o, IX + 40, y + 25, 15, on ? S.accentInk : C.ink));
  });
  return out.join('');
}

function form() {
  const out = [label('Your track', IX, PY + 52)];
  const chip = 'Connect';
  const cw = width(mono, chip, 16) + 36;
  out.push(rect(IX, PY + 66, cw, 34, S.accentBg, `rx="17" stroke="${C.accent}" stroke-width="2"`));
  out.push(t(mono, chip, IX + 18, PY + 89, 16, S.accentInk));
  out.push(label('The task you want gone', IX, PY + 138));
  out.push(rect(IX, PY + 152, IW, 104, C.bg, `rx="8" stroke="${C.line}" stroke-width="2"`));
  ['Every Monday I copy the', 'week’s orders into a sheet', 'and email the totals…'].forEach((l, i) =>
    out.push(t(mono, l, IX + 16, PY + 182 + i * 26, 15, C.ink)),
  );
  out.push(label('How often', IX, PY + 290));
  out.push(rect(IX, PY + 302, 150, 36, C.bg, `rx="8" stroke="${C.line}" stroke-width="2"`));
  out.push(t(mono, 'Weekly', IX + 16, PY + 326, 15, C.ink));
  out.push(rect(IR - 110, PY + 302, 110, 36, C.ink, 'rx="18"'));
  out.push(t(mono, 'Send', IR - 110 + (110 - width(mono, 'Send', 16)) / 2, PY + 326, 16, S.surface));
  return out.join('');
}

function seats() {
  const out = [label('Seats', IX, PY + 52)];
  out.push(right(mono, '8 of 8', IR, PY + 52, 15, C.mute));
  const r = 30;
  const cols = 4;
  const step = (IW - 2 * r) / (cols - 1);
  for (let i = 0; i < 8; i++) {
    const cx = IX + r + (i % cols) * step;
    const cy = PY + 124 + Math.floor(i / cols) * 84;
    out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.ink}"/>`);
  }
  const cy = PY + 124 + 2 * 84 + 18;
  out.push(`<circle cx="${IX + r}" cy="${cy}" r="${r}" fill="${S.accentBg}" stroke="${C.accent}" stroke-width="3" stroke-dasharray="7 6"/>`);
  out.push(t(mono, '+', IX + r - width(mono, '+', 28) / 2, cy + 10, 28, C.accent));
  out.push(t(serif, 'You, next time', IX + 2 * r + 22, cy - 2, 26, C.ink));
  out.push(t(mono, 'First to hear', IX + 2 * r + 22, cy + 24, 15, C.mute));
  return out.join('');
}

function docLines(y0: number, n: number, widths: number[] = [1, 0.92, 0.7]) {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(rect(IX, y0 + i * 18, Math.round(IW * widths[i % widths.length]), 8, S.soft, 'rx="4"'));
  return out.join('');
}

function hub() {
  const out = [label('Your cohort', IX, PY + 52)];
  const items: Array<[string, string, boolean]> = [
    ['Session 1', 'Your task and the habits', true],
    ['Session 2', 'Your files', true],
    ['Session 3', 'Make it repeatable', false],
    ['Session 4', 'Demo and hand-off', false],
  ];
  items.forEach(([n, title, done], i) => {
    const y = PY + 76 + i * 58;
    out.push(`<circle cx="${IX + 14}" cy="${y + 20}" r="14" fill="${done ? C.accent : S.surface}" stroke="${done ? C.accent : C.line}" stroke-width="2"/>`);
    if (done) out.push(`<path d="M${IX + 8} ${y + 20} l4 5 l9 -10" fill="none" stroke="${S.surface}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(label(n, IX + 44, y + 12, C.faint, 13));
    out.push(t(serif, title, IX + 44, y + 38, 24, C.ink));
    if (i < items.length - 1) out.push(rect(IX + 13, y + 36, 2, 26, C.line));
  });
  out.push(rect(IX, PY + PH - 64, IW, 2, C.line));
  out.push(t(mono, 'Private WhatsApp group', IX, PY + PH - 30, 15, C.mute));
  return out.join('');
}

function prompt() {
  const parts = ['Situation', 'Task', 'Input', 'Format', 'Check'];
  const out = [label('One prompt, five parts', IX, PY + 52)];
  parts.forEach((p, i) => {
    const y = PY + 76 + i * 58;
    out.push(rect(IX, y, 6, 44, i === 1 ? C.accent : C.ink, 'rx="3"'));
    out.push(t(mono, `${i + 1}`, IX + 22, y + 18, 15, C.accent));
    out.push(label(p, IX + 46, y + 18, C.ink, 15));
    out.push(rect(IX + 22, y + 32, Math.round((IW - 22) * [0.9, 0.7, 0.8, 0.6, 0.75][i]), 8, S.soft, 'rx="4"'));
  });
  return out.join('');
}

function neverPaste() {
  const items = ["Other people's details", 'Passwords and codes', 'Account and card numbers', 'Health details'];
  const out = [label('Keep out of the chat', IX, PY + 52, S.danger)];
  items.forEach((it, i) => {
    const y = PY + 78 + i * 64;
    out.push(rect(IX, y, IW, 50, C.bg, 'rx="10"'));
    const cx = IX + 26;
    const cy = y + 25;
    out.push(`<circle cx="${cx}" cy="${cy}" r="13" fill="${S.danger}"/>`);
    out.push(`<path d="M${cx - 5} ${cy - 5} L${cx + 5} ${cy + 5} M${cx + 5} ${cy - 5} L${cx - 5} ${cy + 5}" stroke="${S.surface}" stroke-width="3" stroke-linecap="round"/>`);
    out.push(t(mono, it, IX + 54, y + 31, 16, C.ink));
  });
  out.push(t(mono, 'Swap in PERSON-1 instead.', IX, PY + PH - 26, 15, C.mute));
  return out.join('');
}

function handOff() {
  const secs = ['The task', 'Steps', 'How I check the output', 'When it breaks'];
  const out = [t(serif, 'My weekly report', IX, PY + 56, 28, C.ink), label('One page · updated Feb 1', IX, PY + 82, C.faint, 13)];
  out.push(rect(IX, PY + 98, IW, 2, C.line));
  secs.forEach((s, i) => {
    const y = PY + 140 + i * 62;
    out.push(t(mono, `${i + 1}.`, IX, y, 16, C.accent));
    out.push(t(mono, s, IX + 30, y, 16, C.ink));
    out.push(docLines(y + 18, 1, [[0.9, 0.7, 0.8, 0.6][i]]));
  });
  return out.join('');
}

/** Shorten `s` with an ellipsis until it fits `max` px in `font` at `size`. */
function clip(font: Parameters<typeof width>[0], s: string, size: number, max: number) {
  if (width(font, s, size) <= max) return s;
  let out = s;
  while (out.length > 1 && width(font, `${out}…`, size) > max) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

// Generic motif for every free guide and the guides hub: the numbered guide
// list, with this card's guide highlighted (none on the hub).
function guide(card: AiCard) {
  const all = card.items ?? [];
  const rows = 5;
  const start = Math.max(0, Math.min((card.current ?? 0) - 2, all.length - rows));
  const shown = all.slice(start, start + rows);
  const out = [label('Free guides', IX, PY + 52, C.accent)];
  shown.forEach((title, k) => {
    const i = start + k;
    const y = PY + 72 + k * 54;
    const on = i === card.current;
    out.push(rect(IX, y, IW, 44, on ? S.accentBg : C.bg, `rx="10"${on ? ` stroke="${C.accent}" stroke-width="2"` : ''}`));
    const cx = IX + 22;
    const cy = y + 22;
    out.push(`<circle cx="${cx}" cy="${cy}" r="12" fill="${on ? C.accent : S.surface}" stroke="${on ? C.accent : C.line}" stroke-width="2"/>`);
    const n = `${i + 1}`;
    out.push(t(mono, n, cx - width(mono, n, 13) / 2, cy + 5, 13, on ? S.surface : C.mute));
    out.push(t(mono, clip(mono, title, 16, IW - 64), IX + 46, y + 28, 16, on ? S.accentInk : C.ink));
  });
  out.push(rect(IX, PY + PH - 64, IW, 2, C.line));
  out.push(t(mono, 'Free · no sign-up', IX, PY + PH - 30, 15, C.mute));
  return out.join('');
}

const MOTIFS: Record<AiCard['motif'], (card: AiCard) => string> = {
  tracks,
  quiz,
  form,
  seats,
  hub,
  prompt,
  'never-paste': neverPaste,
  'hand-off': handOff,
  guide,
};

export function aiCardSvg(card: AiCard): string {
  const { size, lines } = fit(card.title);
  const lineH = Math.round(size * 1.1);
  const block = lineH * (lines.length - 1);
  // Centre eyebrow + title + subtitle in the band above the footer rule (y 10..506)
  const total = 40 + block + size * 0.75 + 56;
  const top = Math.round(10 + (496 - total) / 2);
  const titleTop = top + 40 + Math.round(size * 0.75);

  const parts: string[] = [];
  parts.push(rect(0, 0, OG_WIDTH, OG_HEIGHT, C.bg));
  parts.push(rect(0, 0, OG_WIDTH, 10, C.accent));
  parts.push(t(mono, card.eyebrow.toUpperCase(), PAD, top + 18, 20, C.accent, 4));
  lines.forEach((l, i) => parts.push(t(serif, l, PAD, titleTop + i * lineH, size, C.ink)));
  let subSize = 24;
  while (subSize > 16 && width(mono, card.subtitle, subSize) > COL_W) subSize -= 1;
  parts.push(t(mono, card.subtitle, PAD, titleTop + block + 56, subSize, C.mute));
  parts.push(panel(MOTIFS[card.motif](card)));
  parts.push(footer());
  void black;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}"><title>${esc(card.title)}</title>${parts.join('')}</svg>`;
  if (svg.includes('NaN')) throw new Error(`og-ai: NaN in path data for "${card.title}"`);
  return svg;
}

export async function renderAiCard(card: AiCard): Promise<Buffer> {
  return sharp(Buffer.from(aiCardSvg(card))).png({ compressionLevel: 9, palette: true }).toBuffer();
}
