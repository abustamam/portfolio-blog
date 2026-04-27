import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const htmlPath = resolve(process.cwd(), 'dist/index.html');
const html = readFileSync(htmlPath, 'utf8');

const requiredSnippets = [
  'href="/bustamam-favicon.svg"',
  'href="/favicon-32.png"',
  'href="/favicon.ico"',
  'href="/apple-touch-icon.png"',
  'src="/bustamam-technology-wordmark.svg"',
  'class="brand-logo"',
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

console.log('Brand metadata verification passed: all required snippets are present in dist/index.html.');
