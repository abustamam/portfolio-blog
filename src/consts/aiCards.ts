// Social preview cards for the AI training pages. BaseHead reads only the
// paths (no fonts load at page render); src/pages/og renders each card to
// /og/ai/<id>.png at build time with src/lib/og-ai.ts.
// The free guides (/ai-guides/) are not listed here: their cards come from the
// guides collection through guideCards(), so a new guide needs no edit here.

export type AiMotif = 'tracks' | 'quiz' | 'form' | 'seats' | 'hub' | 'prompt' | 'never-paste' | 'hand-off' | 'guide';

export interface AiCard {
  id: string;
  /** Page path, with the trailing slash. */
  path: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  motif: AiMotif;
  /** `guide` motif: the guide titles listed in the panel, and which one to highlight. */
  items?: string[];
  current?: number;
}

export const AI_CARDS: AiCard[] = [
  {
    id: 'training',
    path: '/ai-training/',
    eyebrow: 'Hands-on AI training',
    title: 'Get AI doing real work for you',
    subtitle: 'Small online cohorts · reserve with $25',
    motif: 'tracks',
  },
  {
    id: 'quiz',
    path: '/ai-quiz/',
    eyebrow: 'AI training · quiz',
    title: 'Which AI track fits you?',
    subtitle: '9 questions · about 4 minutes',
    motif: 'quiz',
  },
  {
    id: 'intake',
    path: '/ai-cohort/intake/',
    eyebrow: 'AI training · before we start',
    title: "Tell me about the task you'll bring",
    subtitle: 'About 5 minutes',
    motif: 'form',
  },
  {
    id: 'waitlist',
    path: '/ai-cohort/waitlist/',
    eyebrow: 'AI training · waitlist',
    title: 'This cohort is full',
    subtitle: 'Join the waitlist for the next one',
    motif: 'seats',
  },
  {
    id: 'cohort',
    path: '/ai-cohort/',
    eyebrow: 'AI training · participants',
    title: 'Welcome to the cohort',
    subtitle: 'Sessions, recordings and next steps',
    motif: 'hub',
  },
  {
    id: 'prompt',
    path: '/ai-cohort/prompt/',
    eyebrow: 'AI training · handout',
    title: 'The five-part prompt',
    subtitle: 'Session 1',
    motif: 'prompt',
  },
  {
    id: 'never-paste',
    path: '/ai-cohort/never-paste/',
    eyebrow: 'AI training · handout',
    title: "What's safe to paste into AI",
    subtitle: 'Sessions 1 and 2',
    motif: 'never-paste',
  },
  {
    id: 'hand-off',
    path: '/ai-cohort/hand-off/',
    eyebrow: 'AI training · handout',
    title: 'How my task works now',
    subtitle: 'The one-page hand-off · session 4',
    motif: 'hand-off',
  },
  {
    id: 'log-analysis',
    path: '/ai-cohort/log-analysis/',
    eyebrow: 'AI training · resource',
    title: 'Find errors in app logs with AI, safely',
    subtitle: 'Scrub first, then analyze · kit for IT',
    motif: 'never-paste',
  },
];

/** What guideCards() needs from each published guide (the collection entry fits). */
export interface GuideCardSource {
  id: string;
  data: { title: string; minutes: number; tool?: string; cardSubtitle?: string };
}

export const GUIDES_HUB_PATH = '/ai-guides/';
const GUIDE_PATH = /^\/ai-guides\/([^/]+)\/$/;

/** Card ids for the guides: `guides` for the hub, `guides/<id>` for each guide. */
const guideCardId = (id?: string) => (id ? `guides/${id}` : 'guides');

/**
 * Cards for the guides hub and every published guide, in hub order.
 * src/pages/og renders them from the guides collection.
 */
export function guideCards(guides: GuideCardSource[]): AiCard[] {
  const items = guides.map((g) => g.data.title);
  return [
    {
      id: guideCardId(),
      path: GUIDES_HUB_PATH,
      eyebrow: 'Free AI guides',
      title: 'Use AI safely and well',
      subtitle: 'Short reads for your phone · no sign-up',
      motif: 'guide',
      items,
    },
    ...guides.map((g, i) => ({
      id: guideCardId(g.id),
      path: `/ai-guides/${g.id}/`,
      eyebrow: 'Free AI guide',
      title: g.data.title,
      subtitle: g.data.cardSubtitle ?? [`${g.data.minutes} min read`, g.data.tool].filter(Boolean).join(' · '),
      motif: 'guide' as const,
      items,
      current: i,
    })),
  ];
}

/** The card image for a page path, or undefined when the page has none. */
export function aiCardImage(pathname: string): string | undefined {
  const path = pathname.replace(/\/?$/, '/');
  if (path === GUIDES_HUB_PATH) return `/og/ai/${guideCardId()}.png`;
  const guide = path.match(GUIDE_PATH);
  if (guide) return `/og/ai/${guideCardId(guide[1])}.png`;
  const card = AI_CARDS.find((c) => c.path === path);
  return card ? `/og/ai/${card.id}.png` : undefined;
}
