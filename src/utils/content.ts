export const isPublished = (data: { draft?: boolean }) =>
	import.meta.env.DEV || !data.draft;
