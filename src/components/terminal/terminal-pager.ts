export interface PagerState {
	lines: string[];
	offset: number;
	pageSize: number;
}

function maxOffset(p: PagerState): number {
	return Math.max(0, p.lines.length - p.pageSize);
}

export function lineDown(p: PagerState): PagerState {
	return { ...p, offset: Math.min(p.offset + 1, maxOffset(p)) };
}

export function lineUp(p: PagerState): PagerState {
	return { ...p, offset: Math.max(0, p.offset - 1) };
}

export function pageDown(p: PagerState): PagerState {
	return { ...p, offset: Math.min(p.offset + p.pageSize, maxOffset(p)) };
}

export function pageUp(p: PagerState): PagerState {
	return { ...p, offset: Math.max(0, p.offset - p.pageSize) };
}

export function toTop(p: PagerState): PagerState {
	return { ...p, offset: 0 };
}

export function toBottom(p: PagerState): PagerState {
	return { ...p, offset: maxOffset(p) };
}

/** Returns null when pager should close (q / Escape). */
export function handlePagerKey(e: KeyboardEvent, pager: PagerState): PagerState | null {
	if (e.metaKey || e.ctrlKey || e.altKey) return pager;
	const k = e.key;
	if (k === 'q' || k === 'Escape') {
		e.preventDefault();
		return null;
	}
	if (k === 'ArrowDown' || k === 'j') {
		e.preventDefault();
		return lineDown(pager);
	}
	if (k === 'ArrowUp' || k === 'k') {
		e.preventDefault();
		return lineUp(pager);
	}
	if (k === 'ArrowRight' || k === 'l' || k === ' ') {
		e.preventDefault();
		return pageDown(pager);
	}
	if (k === 'ArrowLeft' || k === 'h' || k === 'b') {
		e.preventDefault();
		return pageUp(pager);
	}
	if (k === 'g') {
		e.preventDefault();
		return toTop(pager);
	}
	if (k === 'G') {
		e.preventDefault();
		return toBottom(pager);
	}
	return pager;
}

export function sliceVisible(p: PagerState): string[] {
	return p.lines.slice(p.offset, p.offset + p.pageSize);
}

export const PAGER_LINE_THRESHOLD = 28;

export function shouldUsePager(lines: string[]): boolean {
	return lines.length > PAGER_LINE_THRESHOLD;
}
