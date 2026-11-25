import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { AI_CARDS } from '../src/consts/aiCards';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const meta = (html: string, prop: string) =>
  html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`))?.[1];

/** Width and height from a PNG's IHDR chunk. */
function pngSize(buf: Buffer) {
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test.describe('AI page social cards', () => {
  for (const card of AI_CARDS) {
    test(`${card.path} shares its own 1200x630 card`, () => {
      const html = readFileSync(`${DIST}${card.path.slice(1)}index.html`, 'utf8');
      const image = `https://bustamam.tech/og/ai/${card.id}.png`;
      expect(meta(html, 'og:image')).toBe(image);
      expect(meta(html, 'twitter:image')).toBe(image);
      expect(meta(html, 'og:image:width')).toBe('1200');

      const png = readFileSync(`${DIST}og/ai/${card.id}.png`);
      expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
      // WhatsApp drops previews for large images; keep each card small.
      expect(png.length).toBeLessThan(100_000);
    });
  }

  test('every AI page has a card', () => {
    const pages = ['ai-training/', 'ai-quiz/'];
    for (const dir of readdirSync(`${DIST}ai-cohort`, { withFileTypes: true })) {
      if (dir.isDirectory() && existsSync(`${DIST}ai-cohort/${dir.name}/index.html`)) pages.push(`ai-cohort/${dir.name}/`);
    }
    pages.push('ai-cohort/');
    const covered = new Set(AI_CARDS.map((c) => c.path.slice(1)));
    expect(pages.filter((p) => !covered.has(p))).toEqual([]);
  });
});
