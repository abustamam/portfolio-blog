import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const htmlPath = resolve(process.cwd(), 'dist/index.html');
const html = readFileSync(htmlPath, 'utf8');

const requiredSnippets = [
  'href="/bustamam-favicon.svg"',
  'href="/favicon-32.png"',
  'href="/favicon.ico"',
  'href="/apple-touch-icon.png"',
  'bustamam-technology-wordmark.svg',
  'brand-logo-svg',
  'property="og:image"',
  'property="twitter:image"'
];

const missingSnippets = requiredSnippets.filter((snippet) => !html.includes(snippet));

if (missingSnippets.length > 0) {
  console.error('Brand metadata verification failed. Missing snippets:');
  for (const snippet of missingSnippets) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

// Post with heroImage: og:image must use the resolved asset, not the wordmark fallback
const postPath = resolve(process.cwd(), 'dist/blog/url-shortener-phase-1-baseline/index.html');
const postHtml = readFileSync(postPath, 'utf8');
const ogPost = postHtml.match(/property="og:image"[^>]*content="([^"]+)"/);
if (!ogPost) {
  console.error('Brand metadata verification failed: missing og:image on sample post page');
  process.exit(1);
}
if (!ogPost[1].includes('_astro/url-shortener-cover')) {
  console.error(
    `Brand metadata verification failed: expected hero cover in og:image, got: ${ogPost[1]}`
  );
  process.exit(1);
}
if (ogPost[1].includes('bustamam-technology-wordmark')) {
  console.error('Brand metadata verification failed: sample post og:image should not use wordmark');
  process.exit(1);
}

console.log(
  'Brand metadata verification passed: homepage dist/index.html + sample post og:image checks OK.'
);
