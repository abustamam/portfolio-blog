import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderCard, type CardInput } from '../../lib/og-card';
import { renderAiCard } from '../../lib/og-ai';
import { AI_CARDS, type AiCard } from '../../consts/aiCards';
import { isPublished } from '../../utils/content';

// Emits /og/default.png, /og/{writing,work,series}/<id>.png and
// /og/ai/<id>.png (the AI training pages) at build time.
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
        subtitle: 'Four years as a founding engineer · two acquisitions',
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

  return [
    ...cards.map(({ slug, card }) => ({ params: { slug }, props: { card } })),
    ...AI_CARDS.map((ai) => ({ params: { slug: `ai/${ai.id}` }, props: { ai } })),
  ];
};

export const GET: APIRoute = async ({ props }) => {
  const png = props.ai ? await renderAiCard(props.ai as AiCard) : await renderCard(props.card as CardInput);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
