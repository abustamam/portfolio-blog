import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { isPublished } from './content';

export interface PrevNext {
	prev: { id: string; title: string } | null;
	next: { id: string; title: string } | null;
}

export async function getSeriesPosts(seriesId: string): Promise<{
	posts: CollectionEntry<'blog'>[];
	getPrevNext: (currentSlug: string) => PrevNext;
}> {
	const allPosts = await getCollection('blog', ({ data }) => isPublished(data));
	const posts = allPosts
		.filter((p) => p.data.series === seriesId)
		.sort((a, b) => {
			const orderA = a.data.seriesOrder ?? Infinity;
			const orderB = b.data.seriesOrder ?? Infinity;
			if (orderA !== orderB) return orderA - orderB;
			return a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
		});

	function getPrevNext(currentSlug: string): PrevNext {
		const idx = posts.findIndex((p) => p.id === currentSlug);
		if (idx < 0) return { prev: null, next: null };
		const prev = idx > 0 ? { id: posts[idx - 1].id, title: posts[idx - 1].data.title } : null;
		const next =
			idx < posts.length - 1 ? { id: posts[idx + 1].id, title: posts[idx + 1].data.title } : null;
		return { prev, next };
	}

	return { posts, getPrevNext };
}
