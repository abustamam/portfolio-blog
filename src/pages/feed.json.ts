import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context: { site: URL }) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    home_page_url: context.site.href,
    feed_url: new URL('/feed.json', context.site).href,
    authors: [{ name: 'Rasheed Bustamam', url: 'https://bustamam.tech' }],
    items: posts.map(post => ({
      id: new URL(`/writing/${post.id}/`, context.site).href,
      url: new URL(`/writing/${post.id}/`, context.site).href,
      title: post.data.title,
      summary: post.data.dek ?? post.data.description,
      date_published: post.data.pubDate.toISOString(),
      date_modified: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
      tags: post.data.tag ? [post.data.tag] : [],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json' },
  });
}
