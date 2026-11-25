// Social preview cards for the AI training pages. BaseHead reads only the
// paths (no fonts load at page render); src/pages/og renders each card to
// /og/ai/<id>.png at build time with src/lib/og-ai.ts.

export type AiMotif = 'tracks' | 'quiz' | 'form' | 'seats' | 'hub' | 'prompt' | 'never-paste' | 'hand-off';

export interface AiCard {
  id: string;
  /** Page path, with the trailing slash. */
  path: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  motif: AiMotif;
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
    title: 'Never paste these',
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
];

/** The card image for a page path, or undefined when the page has none. */
export function aiCardImage(pathname: string): string | undefined {
  const path = pathname.replace(/\/?$/, '/');
  const card = AI_CARDS.find((c) => c.path === path);
  return card ? `/og/ai/${card.id}.png` : undefined;
}
