import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const dist = resolve(process.cwd(), 'dist');
const failures = [];
const fail = (msg) => failures.push(msg);

// ── Homepage brand snippets ──────────────────────────────────────────────
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const requiredSnippets = [
  'href="/bustamam-favicon.svg"',
  'href="/favicon-32.png"',
  'href="/favicon.ico"',
  'href="/apple-touch-icon.png"',
  'brand-logo-svg',
  'property="og:image"',
  'property="twitter:image"',
];
for (const snippet of requiredSnippets) {
  if (!html.includes(snippet)) fail(`homepage missing snippet: ${snippet}`);
}

// ── Every built HTML page ────────────────────────────────────────────────
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const meta = (page, attr, name) => {
  const m =
    page.match(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`)) ??
    page.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`));
  return m?.[1];
};

const APEX = 'https://bustamam.tech/';
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const imageCache = new Map();
let checked = 0;

for (const file of pages) {
  const rel = file.slice(dist.length + 1);
  const page = readFileSync(file, 'utf8');

  checked++;

  const canonical = page.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1];
  const ogUrl = meta(page, 'property', 'og:url');
  for (const [label, value] of [['canonical', canonical], ['og:url', ogUrl]]) {
    if (!value) fail(`${rel}: missing ${label}`);
    else if (value.includes('blog.bustamam.tech')) fail(`${rel}: ${label} contains blog.bustamam.tech (${value})`);
    else if (!value.startsWith(APEX)) fail(`${rel}: ${label} is not an apex URL (${value})`);
  }

  for (const prop of ['og:image', 'twitter:image']) {
    const attr = prop.startsWith('og') ? 'property' : 'property';
    const url = meta(page, attr, prop);
    if (!url) {
      fail(`${rel}: missing ${prop}`);
      continue;
    }
    if (!url.startsWith(APEX)) fail(`${rel}: ${prop} is not an absolute apex URL (${url})`);
    if (!/\.(png|jpe?g)$/i.test(new URL(url).pathname)) {
      fail(`${rel}: ${prop} is not a PNG/JPEG (${url})`);
      continue;
    }
    const local = join(dist, decodeURIComponent(new URL(url).pathname));
    if (!imageCache.has(local)) {
      if (!existsSync(local) || !statSync(local).isFile()) {
        imageCache.set(local, 'missing');
      } else {
        const { width, height, format } = await sharp(local).metadata();
        imageCache.set(local, `${format} ${width}x${height}`);
      }
    }
    const info = imageCache.get(local);
    if (info === 'missing') fail(`${rel}: ${prop} does not exist in dist (${url})`);
    else if (!/^(png|jpeg) 1200x630$/.test(info)) fail(`${rel}: ${prop} is ${info}, expected 1200x630 png/jpeg (${url})`);
  }

  if (meta(page, 'property', 'og:image:width') !== '1200' || meta(page, 'property', 'og:image:height') !== '630') {
    fail(`${rel}: og:image:width/height not 1200/630`);
  }
}

// ── Feeds and sitemap emit apex URLs only ────────────────────────────────
for (const f of ['rss.xml', 'feed.json', 'sitemap-0.xml']) {
  const p = join(dist, f);
  if (!existsSync(p)) {
    fail(`missing ${f}`);
    continue;
  }
  const body = readFileSync(p, 'utf8');
  if (body.includes('blog.bustamam.tech')) fail(`${f} contains blog.bustamam.tech`);
  if (!body.includes(APEX)) fail(`${f} has no apex URLs`);
}

if (failures.length > 0) {
  console.error(`Brand metadata verification failed (${failures.length}):`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `Brand metadata verification passed: ${checked} pages checked, ` +
    `${imageCache.size} distinct og:image files all PNG/JPEG 1200x630, no blog.bustamam.tech in canonical/og:url.`,
);
