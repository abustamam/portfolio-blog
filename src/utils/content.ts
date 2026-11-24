export const isPublished = (data: { draft?: boolean }) =>
	import.meta.env.DEV || !data.draft;

const WORDS_PER_MINUTE = 200;

/**
 * Word count and reading time for a writing entry. Frontmatter `words` and
 * `readMin` win when set; otherwise both are computed from the markdown body
 * (code counts as content). Every page that lists posts uses this, so the
 * index, related cards, terminal and post header agree.
 */
export function readingStats(entry: {
	body?: string;
	data: { words?: number; readMin?: number };
}): { words: number; readMin: number } {
	const text = (entry.body ?? '').replace(/^---[\s\S]*?---/, '').trim();
	const words = entry.data.words ?? (text ? text.split(/\s+/).length : 0);
	const readMin = entry.data.readMin ?? Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
	return { words, readMin };
}
