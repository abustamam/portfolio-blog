import type { CommandResult, SiteTerminalData, TerminalState } from './terminal-types';
import { isValidCwd, lsLines, resolveCd, routeForCwd } from './terminal-fs';

const MAN_PAGES: Record<string, string[]> = {
	help: [
		'NAME',
		'  help — list available commands',
		'',
		'SYNOPSIS',
		'  help',
		'',
		'DESCRIPTION',
		'  You are in a simulated shell. No real processes run here.',
		'  Try: ls, cd, pwd, cat, open, man, clear, exit',
	],
	ls: [
		'NAME',
		'  ls — list virtual directory entries',
		'',
		'SYNOPSIS',
		'  ls [path]',
	],
	cat: [
		'NAME',
		'  cat — print file contents (markdown source for posts)',
		'',
		'SYNOPSIS',
		'  cat [file]',
		'  From ~/writing/<slug>: cat, cat README.md, cat index.md',
	],
	'easter-eggs': [
		'NAME',
		'  easter-eggs — hints for curious visitors',
		'',
		'DESCRIPTION',
		'  Not everything is listed in help.',
		'  If you found this page, you are already doing great.',
		'  Try: whoami, hint, trace, coffee, and explore with cd.',
	],
	rasheed: [
		'NAME',
		'  rasheed — short bio',
		'',
		'DESCRIPTION',
		'  Independent software consultant, California.',
		'  This site is an engineering journal.',
	],
};

function tokenize(line: string): string[] {
	const trimmed = line.trim();
	if (!trimmed) return [];
	const parts: string[] = [];
	let cur = '';
	let quote: '"' | "'" | null = null;
	for (let i = 0; i < trimmed.length; i++) {
		const c = trimmed[i];
		if (quote) {
			if (c === quote) {
				quote = null;
				parts.push(cur);
				cur = '';
			} else {
				cur += c;
			}
			continue;
		}
		if (c === '"' || c === "'") {
			quote = c as '"' | "'";
			continue;
		}
		if (c === ' ') {
			if (cur) {
				parts.push(cur);
				cur = '';
			}
			continue;
		}
		cur += c;
	}
	if (cur) parts.push(cur);
	return parts;
}

function catPost(data: SiteTerminalData, slug: string): string[] {
	const post = data.blog.find((b) => b.id === slug);
	if (!post) return [`cat: ${slug}: No such file`];
	const meta = [
		`── ${post.title} ──`,
		`slug: ${post.id}  date: ${post.pubDate}${post.tag ? `  tag: ${post.tag}` : ''}${post.readMin != null ? `  ${post.readMin} min` : ''}`,
		'',
		post.body.trimEnd(),
		'',
	];
	return meta;
}

export function runCommandLine(
	line: string,
	state: TerminalState,
	data: SiteTerminalData,
): CommandResult {
	const tokens = tokenize(line);
	if (tokens.length === 0) return { next: state, lines: [] };

	const cmd0 = tokens[0].toLowerCase();
	const alias =
		cmd0 === 'll'
			? 'ls'
			: cmd0 === '?'
				? 'help'
				: cmd0;
	const args = tokens.slice(1);

	if (tokens[0] === '..') {
		const next = resolveCd(state.cwd, '..');
		return { next: { cwd: next! }, lines: [] };
	}

	if (alias === 'exit') {
		return { next: state, lines: ['bye'], closeTerminal: true };
	}

	if (alias === 'clear') {
		return { next: state, lines: ['__CLEAR__'] };
	}

	if (alias === 'pwd') {
		return { next: state, lines: [state.cwd] };
	}

	if (alias === 'whoami') {
		return {
			next: state,
			lines: ['rasheed bustamam · independent consultant · california'],
		};
	}

	if (alias === 'hint') {
		return {
			next: state,
			lines: [
				'try: man easter-eggs',
				'try: trace',
				'try: coffee',
				'try: cd writing && ls',
			],
		};
	}

	if (alias === 'trace') {
		return {
			next: state,
			lines: [
				'Segmentation fault (core dumped)',
				'#0  0x00000000 in existence ()',
				'#1  0x0000002a in consulting.c:404',
				'#2  0x00c0ffee in main ()',
				'    at life.c:1',
				'note: try turning it off and on again',
			],
		};
	}

	if (alias === 'coffee') {
		return {
			next: state,
			lines: [
				'     ( (',
				'      ) )',
				'   .______.',
				'   |      |]',
				'   \\      /',
				"    `----'",
				'> brewing ideas since 2019',
			],
		};
	}

	if (alias === 'help') {
		return {
			next: state,
			lines: [
				'commands:',
				'  help, ?, ls, ll, cd, pwd, cat, open, man, clear, exit, whoami, hint',
				'  hotkey: Ctrl/Cmd + Shift + T toggles terminal mode',
			],
		};
	}

	if (alias === 'man') {
		const topic = (args[0] ?? 'help').toLowerCase();
		const page = MAN_PAGES[topic];
		if (!page) return { next: state, lines: [`No manual entry for ${topic}`] };
		return { next: state, lines: page };
	}

	if (alias === 'ls') {
		const pathArg = args[0];
		let cwd = state.cwd;
		if (pathArg) {
			const next = resolveCd(cwd, pathArg);
			if (!isValidCwd(next, data)) {
				return { next: state, lines: [`ls: cannot access '${pathArg}': No such file or directory`] };
			}
			cwd = next;
		}
		return { next: state, lines: lsLines(cwd, data) };
	}

	if (alias === 'cd') {
		const target = args.join(' ') || '~';
		const next = resolveCd(state.cwd, target);
		if (!isValidCwd(next, data)) {
			return {
				next: state,
				lines: [`cd: no such file or directory: ${target}`],
			};
		}
		return { next: { cwd: next }, lines: [] };
	}

	if (alias === 'open') {
		const pathArg = args[0];
		let cwd = state.cwd;
		if (pathArg) {
			const next = resolveCd(state.cwd, pathArg);
			if (!isValidCwd(next, data)) {
				return { next: state, lines: [`open: ${pathArg}: No such file or directory`] };
			}
			cwd = next;
		}
		const href = routeForCwd(cwd);
		if (!href) return { next: state, lines: ['open: nowhere to go from this path'] };
		return { next: state, lines: [`opening ${href}`], navigateTo: href };
	}

	if (alias === 'cat') {
		const inner = state.cwd.startsWith('~/') ? state.cwd.slice(2) : '';
		const parts = inner.split('/').filter(Boolean);
		let slug: string | null = null;
		if (parts[0] === 'writing' && parts.length === 2) slug = parts[1];
		else if (parts[0] === 'writing' && parts.length === 1 && args[0]) slug = args[0].replace(/\/$/, '');
		else if (parts[0] === 'writing' && parts.length === 0) {
			return { next: state, lines: ['cat: not a file (cd into a post first)'] };
		}

		const file = args[0]?.toLowerCase();
		if (parts[0] === 'writing' && parts.length === 2) {
			if (!args.length || file === 'readme.md' || file === 'index.md') {
				return { next: state, lines: catPost(data, parts[1]) };
			}
			return { next: state, lines: [`cat: ${args[0]}: No such file`] };
		}

		if (slug) {
			if (!args.length || file === 'readme.md' || file === 'index.md') {
				return { next: state, lines: catPost(data, slug) };
			}
			return { next: state, lines: [`cat: ${args[0]}: No such file`] };
		}

		if (parts[0] === 'work' && parts.length === 2) {
			const w = data.work.find((x) => x.id === parts[1]);
			if (!w) return { next: state, lines: ['cat: not found'] };
			if (!args.length || file === 'readme.md') {
				return {
					next: state,
					lines: [`── ${w.company} ──`, `role: ${w.role}`, `period: ${w.period}`, ''],
				};
			}
			return { next: state, lines: [`cat: ${args[0]}: No such file`] };
		}

		if (parts[0] === 'series' && parts.length === 2) {
			const s = data.series.find((x) => x.id === parts[1]);
			if (!s) return { next: state, lines: ['cat: not found'] };
			if (!args.length || file === 'readme.md') {
				return { next: state, lines: [`── ${s.title} ──`, ''] };
			}
			return { next: state, lines: [`cat: ${args[0]}: No such file`] };
		}

		return { next: state, lines: ['cat: open a project or post directory first (cd …)'] };
	}

	if (alias === 'theme') {
		const VALID_THEMES = ['inherit', 'green', 'amber', 'ice'];
		const requested = (args[0] ?? '').toLowerCase();

		if (!requested) {
			return {
				next: state,
				lines: [
					`available: ${VALID_THEMES.join(' · ')}`,
					'usage: theme <name>',
					'usage: theme inherit  (reset to default)',
				],
			};
		}

		if (!VALID_THEMES.includes(requested)) {
			return {
				next: state,
				lines: [
					`theme: unknown theme '${requested}'`,
					`available: ${VALID_THEMES.join(' · ')}`,
				],
			};
		}

		return {
			next: state,
			lines: [`theme: ${requested}`],
			setTheme: requested,
		};
	}

	return {
		next: state,
		lines: [`command not found: ${tokens[0]}`, 'try: help'],
	};
}
