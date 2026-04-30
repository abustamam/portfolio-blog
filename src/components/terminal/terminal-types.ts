/** Virtual cwd: `~`, `~/writing`, `~/writing/post-slug`, `~/work`, etc. */
export type VirtualCwd = string;

export interface TerminalState {
	cwd: VirtualCwd;
}

export interface BlogPostPayload {
	id: string;
	title: string;
	body: string;
	pubDate: string;
	tag?: string;
	readMin?: number;
	words?: number;
}

export interface SeriesPayload {
	id: string;
	title: string;
}

export interface WorkPayload {
	id: string;
	company: string;
	role: string;
	period: string;
}

export interface SiteTerminalData {
	blog: BlogPostPayload[];
	series: SeriesPayload[];
	work: WorkPayload[];
}

export const VALID_THEMES = ['inherit', 'green', 'amber', 'ice'] as const;
export type ThemeName = (typeof VALID_THEMES)[number];

export interface CommandResult {
	next: TerminalState;
	lines: string[];
	closeTerminal?: boolean;
	navigateTo?: string;
	setTheme?: ThemeName;
}
