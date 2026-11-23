import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderCard, type CardInput } from '../../lib/og-card';
import { isPublished } from '../../utils/content';

// Emits /og/default.png and /og/{writing,work,series}/<id>.png at build time.
export const getStaticPaths: GetStaticPaths = async () => {
  const [writing, work, series] = await Promise.all([
    getCollection('writing', ({ data }) => isPublished(data)),
    getCollection('work', ({ data }) => !data.draft),
    getCollection('series', ({ data }) => isPublished(data)),
  ]);

  const cards: Array<{ slug: string; card: CardInput }> = [
    {
      slug: 'default',
      card: {
        title: 'Fractional founding engineer and technical advisor',
        eyebrow: 'Rasheed Bustamam',
        subtitle: 'For funded startups · zero-to-one builds · measured AI-assisted delivery',
      },
    },
    ...writing.map((p) => ({
      slug: `writing/${p.id}`,
      card: {
        title: p.data.title,
        eyebrow: ['Writing', p.data.kind].filter(Boolean).join(' / '),
      },
    })),
    ...work.map((w) => ({
      slug: `work/${w.id}`,
      card: {
        title: w.data.projectName ? `${w.data.company}: ${w.data.projectName}` : w.data.company,
        eyebrow: 'Work',
        subtitle: `${w.data.role} · ${w.data.period}`,
      },
    })),
    ...series.map((s) => ({
      slug: `series/${s.id}`,
      card: { title: s.data.title, eyebrow: 'Series' },
    })),
  ];

  return cards.map(({ slug, card }) => ({ params: { slug }, props: { card } }));
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCard(props.card as CardInput);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
