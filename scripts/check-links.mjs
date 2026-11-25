#!/usr/bin/env node
// Offline internal link checker for the built site.
// Usage: node scripts/check-links.mjs [distDir]   (default: dist)
// Scans every .html file in distDir, extracts href/src/srcset targets that are
// internal (root-relative or document-relative), and exits 1 if any does not
// resolve to a file. No network calls: external URLs are ignored.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
if (!existsSync(dist)) {
	console.error(`check-links: ${dist} does not exist. Run the build first.`);
	process.exit(2);
}

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const p = join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});
}

function resolves(urlPath) {
	let p;
	try {
		p = decodeURIComponent(urlPath);
	} catch {
		p = urlPath;
	}
	const target = join(dist, p);
	if (!target.startsWith(dist)) return false;
	if (existsSync(target) && statSync(target).isFile()) return true;
	if (existsSync(join(target, 'index.html'))) return true;
	if (!p.endsWith('/') && existsSync(target + '.html')) return true;
	return false;
}

const attrRe = /\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const srcsetRe = /\ssrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
// Paths a server answers, not files in dist. Listed one by one so a typo in
// any other /api/... link still fails. /api/ai-quiz/whatsapp is a 302 from the
// ai-quiz-intake service (see docs/ai-quiz-setup.md).
const SERVER_ROUTES = new Set(['/api/ai-quiz/whatsapp']);

const files = walk(dist).filter((f) => f.endsWith('.html'));
let checked = 0;
let skipped = 0;
const broken = [];

function check(file, raw) {
	const url = raw.trim();
	if (!url || url.startsWith('#')) return;
	if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return; // external, mailto:, data:, etc.
	const clean = url.split('#')[0].split('?')[0];
	if (!clean) return;
	const pageUrl = '/' + relative(dist, file).split(sep).join('/');
	const abs = clean.startsWith('/') ? clean : new URL(clean, 'http://x' + pageUrl).pathname;
	checked++;
	if (SERVER_ROUTES.has(abs)) return;
	if (!resolves(abs)) broken.push({ page: pageUrl, link: url });
}

for (const file of files) {
	const html = readFileSync(file, 'utf8');
	// Astro emits meta-refresh stubs for dynamic redirects (e.g. /blog/:slug, which
	// is a pattern, not a real URL). Skip them; they contain no authored links.
	if (html.startsWith('<!doctype html><title>Redirecting to:')) {
		skipped++;
		continue;
	}
	for (const m of html.matchAll(attrRe)) check(file, m[1] ?? m[2] ?? '');
	for (const m of html.matchAll(srcsetRe)) {
		for (const part of (m[1] ?? m[2] ?? '').split(',')) check(file, part.trim().split(/\s+/)[0] ?? '');
	}
}

console.log(`check-links: ${files.length - skipped} pages scanned (${skipped} redirect stubs skipped), ${checked} internal links checked, ${broken.length} broken`);
for (const b of broken) console.error(`  BROKEN ${b.link}  (on ${b.page})`);
process.exit(broken.length ? 1 : 0);
