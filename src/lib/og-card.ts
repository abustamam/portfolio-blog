// Renders 1200x630 social preview cards (SVG template -> PNG via sharp).
// Text is converted to vector paths with opentype.js so the output does not
// depend on system fonts (the Docker build image has none).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
const loadFont = (spec: string) => {
  const buf = readFileSync(require.resolve(spec));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

export const serif = loadFont('@fontsource/newsreader/files/newsreader-latin-500-normal.woff');
export const mono = loadFont('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff');
export const black = loadFont('@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff');

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Tokens from src/styles/global.css (light theme)
export const C = { bg: '#f5f4ef', ink: '#0c0f14', mute: '#565c66', line: '#dcdad2', accent: '#1f6f43' };

type Font = opentype.Font;

// opentype.js 2.0 emits NaN control points for some long-fraction x offsets, and
// its string-level getPath/getAdvanceWidth hit that with kerning on. So lay text
// out glyph by glyph with positions rounded to 0.01px, applying kerning ourselves
// (not for JetBrains Mono, whose kerning/ligature tables mangle runs).
const round = (n: number) => Math.round(n * 100) / 100;

function layout(font: Font, text: string, size: number, tracking = 0) {
  const scale = size / font.unitsPerEm;
  const chars = [...text];
  const xs: number[] = [];
  let x = 0;
  chars.forEach((ch, i) => {
    xs.push(x);
    let adv = font.charToGlyph(ch).advanceWidth ?? 0;
    if (font !== mono && i + 1 < chars.length) {
      adv += font.getKerningValue(font.charToGlyph(ch), font.charToGlyph(chars[i + 1]));
    }
    x = round(x + adv * scale + tracking);
  });
  return { chars, xs, width: x - (chars.length ? tracking : 0) };
}

export function width(font: Font, text: string, size: number, tracking = 0) {
  return layout(font, text, size, tracking).width;
}

/** Path data for a line of text, optionally letter-spaced. Baseline at y. */
export function textPath(font: Font, text: string, x: number, y: number, size: number, tracking = 0) {
  const { chars, xs } = layout(font, text, size, tracking);
  return chars.map((ch, i) => font.getPath(ch, round(x + xs[i]), y, size).toPathData(2)).join('');
}

export function wrap(font: Font, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && width(font, next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size (down to a floor) at which the title fits in maxLines. */
function fitTitle(text: string, maxWidth: number, maxLines: number) {
  for (let size = 84; size >= 44; size -= 4) {
    const lines = wrap(serif, text, size, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = 44;
  const lines = wrap(serif, text, size, maxWidth).slice(0, maxLines);
  lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  return { size, lines };
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export interface CardInput {
  title: string;
  /** Mono uppercase label above the title, e.g. "Writing" */
  eyebrow?: string;
  /** Secondary line under the title */
  subtitle?: string;
}

export function cardSvg({ title, eyebrow, subtitle }: CardInput): string {
  const PAD = 80;
  const maxW = OG_WIDTH - PAD * 2;
  const { size, lines } = fitTitle(title, maxW, subtitle ? 3 : 4);
  const lineH = Math.round(size * 1.12);
  const titleTop = 228;

  const parts: string[] = [];
  parts.push(`<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${C.bg}"/>`);
  parts.push(`<rect x="0" y="0" width="${OG_WIDTH}" height="10" fill="${C.accent}"/>`);

  if (eyebrow) {
    parts.push(
      `<path fill="${C.accent}" d="${textPath(mono, eyebrow.toUpperCase(), PAD, 140, 24, 5)}"/>`,
    );
  }
  lines.forEach((l, i) => {
    parts.push(`<path fill="${C.ink}" d="${textPath(serif, l, PAD, titleTop + i * lineH, size)}"/>`);
  });
  if (subtitle) {
    const y = titleTop + (lines.length - 1) * lineH + 62;
    let subSize = 26;
    while (subSize > 16 && width(mono, subtitle, subSize) > maxW) subSize -= 1;
    parts.push(`<path fill="${C.mute}" d="${textPath(mono, subtitle, PAD, y, subSize)}"/>`);
  }

  parts.push(footer());

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}"><title>${esc(title)}</title>${parts.join('')}</svg>`;
  if (svg.includes('NaN')) throw new Error(`og-card: NaN in path data for "${title}"`);
  return svg;
}

export async function renderCard(input: CardInput): Promise<Buffer> {
  return sharp(Buffer.from(cardSvg(input)))
    .resize(OG_WIDTH, OG_HEIGHT)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

/** Footer rule + wordmark (BUSTAMAM / TECHNOLOGY) + host, shared by every card. */
export function footer(): string {
  const PAD = 80;
  const maxW = OG_WIDTH - PAD * 2;
  const parts: string[] = [];
  parts.push(`<rect x="${PAD}" y="506" width="${maxW}" height="2" fill="${C.line}"/>`);
  const wmSize = 44;
  const wmW = width(black, 'BUSTAMAM', wmSize, -1);
  parts.push(`<path fill="${C.ink}" d="${textPath(black, 'BUSTAMAM', PAD, 566, wmSize, -1)}"/>`);
  // TECHNOLOGY tracked out to the width of BUSTAMAM
  const techSize = 16;
  const natural = width(mono, 'TECHNOLOGY', techSize);
  const tracking = (wmW - natural) / 9;
  parts.push(`<path fill="${C.ink}" d="${textPath(mono, 'TECHNOLOGY', PAD, 594, techSize, tracking)}"/>`);
  const host = 'bustamam.tech';
  const hostSize = 26;
  parts.push(
    `<path fill="${C.mute}" d="${textPath(mono, host, OG_WIDTH - PAD - width(mono, host, hostSize), 580, hostSize)}"/>`,
  );

  return parts.join('');
}
