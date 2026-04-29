import type { SiteTerminalData, VirtualCwd } from './terminal-types';

const ROOT_ENTRIES = ['writing/', 'work/', 'series/', 'about', 'contact', 'colophon'] as const;

export function resolveCd(from: VirtualCwd, target: string): VirtualCwd | null {
	const t = target.trim();
	if (!t || t === '~') return '~';
	if (t === '..') {
		if (from === '~') return '~';
		const inner = from.startsWith('~/') ? from.slice(2) : from === '~' ? '' : from;
		const parts = inner.split('/').filter(Boolean);
		if (parts.length === 0) return '~';
		parts.pop();
		if (parts.length === 0) return '~';
		return `~/${parts.join('/')}`;
	}
	if (t.startsWith('~/')) return resolveCd('~', t.slice(2));
	if (t.startsWith('/')) {
		const seg = t.replace(/^\/+/, '').split('/').filter(Boolean);
		if (seg.length === 0) return '~';
		return resolveCd('~', seg.join('/'));
	}
	// relative
	if (t === '.') return from;
	const base = from === '~' ? [] : from.replace(/^~\/?/, '').split('/').filter(Boolean);
	const segs = t.split('/').filter(Boolean);
	const out = [...base, ...segs];
	return `~/${out.join('/')}`;
}

export function isValidCwd(cwd: VirtualCwd, data: SiteTerminalData): boolean {
	if (cwd === '~') return true;
	const rest = cwd.replace(/^~\/?/, '');
	if (!rest) return true;
	const [top, ...restParts] = rest.split('/');
	if (top === 'writing') {
		if (restParts.length === 0) return true;
		if (restParts.length === 1) return data.blog.some((b) => b.id === restParts[0]);
		return false;
	}
	if (top === 'work') {
		if (restParts.length === 0) return true;
		if (restParts.length === 1) return data.work.some((w) => w.id === restParts[0]);
		return false;
	}
	if (top === 'series') {
		if (restParts.length === 0) return true;
		if (restParts.length === 1) return data.series.some((s) => s.id === restParts[0]);
		return false;
	}
	if (['about', 'contact', 'colophon'].includes(top) && restParts.length === 0) return true;
	return false;
}

export function lsLines(cwd: VirtualCwd, data: SiteTerminalData): string[] {
	if (cwd === '~') return [...ROOT_ENTRIES];
	const rest = cwd.replace(/^~\/?/, '');
	const [top, ...parts] = rest.split('/');
	if (top === 'writing' && parts.length === 0) {
		return data.blog.map((b) => `${b.id}/`);
	}
	if (top === 'work' && parts.length === 0) {
		return data.work.map((w) => `${w.id}/`);
	}
	if (top === 'series' && parts.length === 0) {
		return data.series.map((s) => `${s.id}/`);
	}
	if (top === 'writing' && parts.length === 1) {
		const post = data.blog.find((b) => b.id === parts[0]);
		if (!post) return ['ls: invalid cwd'];
		return ['README.md', 'index.md', '(use cat to read)'];
	}
	if (top === 'work' && parts.length === 1) {
		return ['README.md', '(use cat to read)'];
	}
	if (top === 'series' && parts.length === 1) {
		return ['README.md', '(use cat to read)'];
	}
	if (['about', 'contact', 'colophon'].includes(top) && parts.length === 0) {
		return ['(single page — run open to view in the browser)'];
	}
	return ['(empty)'];
}

export function routeForCwd(cwd: VirtualCwd): string | null {
	if (cwd === '~') return '/';
	const rest = cwd.replace(/^~\/?/, '');
	const [top, ...parts] = rest.split('/');
	if (top === 'writing' && parts.length === 0) return '/writing/';
	if (top === 'writing' && parts.length === 1) return `/writing/${parts[0]}/`;
	if (top === 'work' && parts.length === 0) return '/work/';
	if (top === 'work' && parts.length === 1) return `/work/${parts[0]}/`;
	if (top === 'series' && parts.length === 0) return '/series/';
	if (top === 'series' && parts.length === 1) return `/series/${parts[0]}/`;
	if (top === 'about') return '/about/';
	if (top === 'contact') return '/contact/';
	if (top === 'colophon') return '/colophon/';
	return null;
}
