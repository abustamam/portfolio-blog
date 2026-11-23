// Frontmatter dates like `pubDate: '2026-08-18'` are parsed by `z.coerce.date()`
// as UTC midnight. Format them with the UTC getters: local getters move the date
// back a day in any timezone west of UTC (the build machine runs in PST).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Aug 18 2026" */
export function fmtDate(date: Date): string {
	const d = new Date(date);
	return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')} ${d.getUTCFullYear()}`;
}

/** "August 18, 2026" */
export function fmtLongDate(date: Date): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	});
}
