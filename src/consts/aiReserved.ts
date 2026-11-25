// Facts for the post-deposit page /ai-training/reserved/ that are not in aiCohort.ts.
// Track ids, names, the launch threshold and the refund terms come from aiCohort.ts.
import type { Track } from './aiCohort';

export const RESERVED_CONTACT = {
  email: 'admin@bustamam.tech',
  mailto: 'mailto:admin@bustamam.tech',
} as const;

export const SHARE_URL = 'https://bustamam.tech/ai-training/';

export interface ReservedGuide {
  href: string;
  title: string;
  why: string;
}

const G = {
  neverPaste: { href: '/ai-guides/never-paste/', title: "What's safe to paste into AI", why: 'Read this first. It takes five minutes.' },
  prompt: { href: '/ai-guides/prompt/', title: 'The five-part prompt', why: 'How to ask AI so the answer is usable.' },
  whenWrong: { href: '/ai-guides/when-ai-is-wrong/', title: 'When AI gets it wrong', why: 'Five mistakes and a 30-second check for each.' },
  whichTool: { href: '/ai-guides/which-tool/', title: 'Which AI app should I use?', why: 'What each costs and what your employer may already pay for.' },
  whichModel: { href: '/ai-guides/which-model/', title: 'Which model to pick in the menu', why: 'The model menu, in plain sizes.' },
  examples: { href: '/ai-guides/examples/', title: 'One weekly task, by profession', why: 'See what a good first task looks like.' },
} satisfies Record<string, ReservedGuide>;

/** Shown when there is no valid ?track= or JavaScript is off. */
export const GENERIC_GUIDES: ReservedGuide[] = [G.neverPaste, G.prompt, G.whenWrong];

export const TRACK_GUIDES: Record<Track['id'], ReservedGuide[]> = {
  everyday: [G.neverPaste, G.prompt, G.examples],
  connect: [G.neverPaste, G.whichTool, G.whenWrong],
  build: [G.neverPaste, G.whenWrong, G.whichModel],
};
