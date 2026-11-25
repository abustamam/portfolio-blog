// Scoring for the AI training intake quiz (/ai-quiz).
// Pure functions so the page script and the tests share one source of truth.

/**
 * Skill level, from the scored questions. It is stored with every response
 * (and predates the goal question), so its values and meaning must not change.
 */
export type Track = 'foundations' | 'applied' | 'builder';

/** A track on /ai-training/, by its id there. The result screen names exactly one. */
export type Offer = 'everyday' | 'connect' | 'build';

/** Answers as the form serializes them. Multi-selects are arrays. */
export interface QuizAnswers {
  frequency?: string;
  tools?: string[];
  wrongAnswer?: string;
  prompt?: string;
  files?: string;
  connected?: string;
  /** What they most want AI to do. Missing on responses from before the question existed. */
  goal?: string;
  weeklyTask?: string;
  neverPaste?: string[];
}

// Points per answer. Each skill question is worth 0–3.
export const POINTS: Record<string, Record<string, number>> = {
  frequency: { never: 0, monthly: 1, weekly: 2, daily: 3 },
  wrongAnswer: { 'didnt-notice': 0, 'gave-up': 0, 'asked-again': 1, 'checked-source': 2, 'reprompted-and-verified': 3 },
  prompt: { short: 0, medium: 1, rich: 3 },
  files: { never: 0, 'went-badly': 1, 'summaries': 2, 'checked-output': 3 },
  connected: { no: 0, 'built-in': 1, automation: 2, agents: 3 },
};

export const SKILL_KEYS = ['frequency', 'wrongAnswer', 'prompt', 'files', 'connected'] as const;
export const MAX_SCORE = SKILL_KEYS.length * 3;
export const MAX_PER_SKILL = 3;

/** Short names for the skill questions, shown beside each one's score on the result. */
export const SKILL_LABELS: Record<(typeof SKILL_KEYS)[number], string> = {
  frequency: 'using it',
  wrongAnswer: 'checking answers',
  prompt: 'giving context',
  files: 'working on files',
  connected: 'connecting tools',
};

/** Points for each skill question, in SKILL_KEYS order. Their sum is the score. */
export function skillScores(a: QuizAnswers): { key: (typeof SKILL_KEYS)[number]; points: number }[] {
  return SKILL_KEYS.map((key) => ({ key, points: POINTS[key][a[key] ?? ''] ?? 0 }));
}

/** Items a careful user keeps out of AI tools. "nothing" is the red flag. */
export const SENSITIVE = ['personal-info', 'passwords', 'financial', 'health'] as const;

/** The goal answers that name a track outright. "unsure" (or no answer) falls back on the skill questions. */
export const GOAL_OFFER: Record<string, Offer> = { 'weekly-task': 'everyday', inbox: 'connect', build: 'build' };

export interface QuizResult {
  /** Skill level: what they already do with AI. */
  track: Track;
  /** The /ai-training/ track to reserve: what they want, or failing that, what they already do. */
  recommend: Offer;
  score: number;
  /** True when the privacy answer suggests a gap worth covering first. */
  privacyGap: boolean;
}

export function scoreQuiz(a: QuizAnswers): QuizResult {
  const score = skillScores(a).reduce((sum, s) => sum + s.points, 0);

  const paste = a.neverPaste ?? [];
  const sensitiveCount = SENSITIVE.filter((s) => paste.includes(s)).length;
  const privacyGap = paste.includes('nothing') || sensitiveCount < 2;

  const usesBuilderTools = (a.tools ?? []).some((t) => t === 'local' || t === 'api');
  const connected = POINTS.connected[a.connected ?? ''] ?? 0;

  let track: Track;
  if (score >= 10 && (connected >= 2 || usesBuilderTools)) track = 'builder';
  else if (score >= 6) track = 'applied';
  else track = 'foundations';

  // The goal decides the track to reserve, whatever the score: /ai-training/
  // offers Connect to people catching up and Build to people starting to code,
  // so a low score must not route them away from what they came for.
  let recommend: Offer | undefined = GOAL_OFFER[a.goal ?? ''];
  if (!recommend) {
    if (track !== 'builder') recommend = 'everyday';
    else recommend = usesBuilderTools || a.connected === 'agents' ? 'build' : 'connect';
  }

  return { track, recommend, score, privacyGap };
}

// What the result screen shows: one /ai-training/ track, with a summary that
// fits the person's skill level. The names must be that page's track names;
// tests/ai-quiz.spec.ts checks that. The text lives here, not imported from
// src/consts/aiCohort.ts, because the intake service's image copies only this
// file.
export const OFFER_NAMES: Record<Offer, string> = { everyday: 'Everyday AI', connect: 'Connect', build: 'Build' };

export interface ResultCopy {
  name: string;
  summary: string;
  covers: string[];
  /** Finishes "you'd bring it and leave with …". */
  build: string;
}

const EVERYDAY_BUILD =
  'a version of that task you can rerun every week, a way to check its work, and a write-up so you can keep it running';

const EVERYDAY_EARLY: ResultCopy = {
  name: OFFER_NAMES.everyday,
  summary:
    "You're early, and that's the best place to start. Everyday AI takes one task you already do every week and builds the few habits that matter most: giving AI enough context, checking what it tells you, and knowing what to keep out of it. No code.",
  covers: [
    'Writing your task down, and a prompt that works on it',
    'Running it on your own file, with a check you trust',
    'What never to paste into an AI tool, and how to make a file safe first',
  ],
  build: EVERYDAY_BUILD,
};

const EVERYDAY_USING: ResultCopy = {
  name: OFFER_NAMES.everyday,
  summary:
    'You already use AI and get value from it. Everyday AI points it at one real task from your week, on your own spreadsheet, document or emails, and turns it into something you can rerun without starting over. No code.',
  covers: [
    'Running your task on your own file, with a check you trust',
    'Making it repeatable, so next week starts where this one ended',
    'What never to paste into an AI tool, and how to make a file safe first',
  ],
  build: EVERYDAY_BUILD,
};

const CONNECT: ResultCopy = {
  name: OFFER_NAMES.connect,
  summary:
    "Your inbox and calendar are where your week goes, so that's where we put AI. Connect turns on Gemini or Copilot in your own account, with clear limits on what it can see and do, and uses it for drafted replies, thread summaries and scheduling. You approve what goes out. No code.",
  covers: [
    'Gemini or Copilot turned on in your own account, with clear limits on what it can see and do',
    'Drafted replies and thread summaries that you approve before anything is sent',
    'Meeting requests, scheduling and follow-up notes handled by rules you set',
  ],
  build: 'one no-code automation that runs that task end to end, with a human check where it matters',
};

const BUILD: ResultCopy = {
  name: OFFER_NAMES.build,
  summary:
    "You want AI to do things, not just answer questions. Build has you code with AI, connect it to your email, Sheets, calendar or files, and build an agent that stops for your approval before anything goes out. Coding experience helps but isn't required. You do need to be comfortable installing software.",
  covers: [
    'Coding with AI, and the habits that stop AI-written code from quietly being wrong',
    'AI reading and acting on your email, Sheets, calendar or files, with limits on what it can touch',
    'An agent that gathers, decides and acts, and stops for your approval before anything goes out',
  ],
  build: 'one working tool or agent you built yourself, running on a schedule or at a button press',
};

// For someone early with AI whose goal still points at Connect or Build: the
// same track, with a summary that says starting here is fine.
const CONNECT_EARLY =
  "Your inbox and calendar are where your week goes, so that's where we put AI. You don't need to have used AI much: Connect starts by turning on Gemini or Copilot in your own account, with clear limits on what it can see and do, then uses it for drafted replies, thread summaries and scheduling. You approve what goes out. No code.";
const BUILD_EARLY =
  "You want AI to do things, not just answer questions. Build has you code with AI, connect it to your email, Sheets, calendar or files, and build an agent that stops for your approval before anything goes out. You're early with AI, and that's fine: the first session starts with the habits that stop AI-written code from quietly being wrong. You do need to be comfortable installing software.";

export function resultCopy(r: Pick<QuizResult, 'track' | 'recommend'>): ResultCopy {
  const early = r.track === 'foundations';
  if (r.recommend === 'connect') return early ? { ...CONNECT, summary: CONNECT_EARLY } : CONNECT;
  if (r.recommend === 'build') return early ? { ...BUILD, summary: BUILD_EARLY } : BUILD;
  return early ? EVERYDAY_EARLY : EVERYDAY_USING;
}

// Free guides the result screen suggests, picked from the answers that show a
// gap. Ids are guide file names in src/content/guides/; the quiz page fails the
// build if one is missing, so a rename can't leave a dead card.
export const MAX_SUGGESTED_GUIDES = 3;

/** Every id suggestGuides can return, so the page can render and check each one. */
export const SUGGESTABLE_GUIDES = [
  'what-is-ai',
  'first-ten-minutes',
  'never-paste',
  'when-ai-is-wrong',
  'prompt',
  'photos-files-voice',
  'which-model',
  'examples',
] as const;
export type SuggestedGuide = (typeof SUGGESTABLE_GUIDES)[number];

// Filled in after the gaps, in this order, so everyone gets the same number of cards.
const FALLBACK_GUIDES: SuggestedGuide[] = ['which-model', 'examples'];

export function suggestGuides(a: QuizAnswers): SuggestedGuide[] {
  const out: SuggestedGuide[] = [];
  const add = (g: SuggestedGuide) => !out.includes(g) && out.push(g);
  const pts = (k: (typeof SKILL_KEYS)[number]) => POINTS[k][a[k] ?? ''] ?? 0;
  const tools = a.tools ?? [];

  if (a.frequency === 'never' || tools.length === 0 || tools.includes('none')) {
    add('what-is-ai');
    add('first-ten-minutes');
  }
  if (scoreQuiz(a).privacyGap) add('never-paste');
  if (pts('wrongAnswer') <= 1) add('when-ai-is-wrong');
  if (pts('prompt') <= 1) add('prompt');
  if (a.files === 'never' || a.files === 'went-badly') add('photos-files-voice');
  FALLBACK_GUIDES.forEach(add);

  return out.slice(0, MAX_SUGGESTED_GUIDES);
}
