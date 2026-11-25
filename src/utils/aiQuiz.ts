// Scoring for the AI training intake quiz (/ai-quiz).
// Pure functions so the page script and the tests share one source of truth.

export type Track = 'foundations' | 'applied' | 'builder';

/** Answers as the form serialises them. Multi-selects are arrays. */
export interface QuizAnswers {
  frequency?: string;
  tools?: string[];
  wrongAnswer?: string;
  prompt?: string;
  files?: string;
  connected?: string;
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

export interface QuizResult {
  track: Track;
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

  return { track, score, privacyGap };
}

// What the result screen shows. The keys stay as they are (they are stored in
// quiz_responses), but the names must be /ai-training/ track names, joined
// with " or " when a result fits more than one. tests/ai-quiz.spec.ts checks
// that. The text lives here, not imported from src/consts/aiCohort.ts, because
// the intake service's image copies only this file.
export const EVERYDAY_BUILD =
  'a version of that task you can rerun every week, a way to check its work, and a write-up so you can keep it running';

export const TRACKS: Record<Track, { name: string; summary: string; covers: string[]; build: string }> = {
  foundations: {
    name: 'Everyday AI',
    summary:
      "You're early, and that's the best place to start. Everyday AI takes one task you already do every week and builds the few habits that matter most: giving AI enough context, checking what it tells you, and knowing what to keep out of it. No code.",
    covers: [
      'Writing your task down, and a prompt that works on it',
      'Running it on your own file, with a check you trust',
      'What never to paste into an AI tool, and how to make a file safe first',
    ],
    build: EVERYDAY_BUILD,
  },
  applied: {
    name: 'Everyday AI',
    summary:
      'You already use AI and get value from it. Everyday AI points it at one real task from your week, on your own spreadsheet, document or emails, and turns it into something you can rerun without starting over. No code.',
    covers: [
      'Running your task on your own file, with a check you trust',
      'Making it repeatable, so next week starts where this one ended',
      'What never to paste into an AI tool, and how to make a file safe first',
    ],
    build: EVERYDAY_BUILD,
  },
  builder: {
    name: 'Connect or Build',
    summary:
      "You're past the basics and want AI to do work, not just answer questions. Two tracks fit. Connect puts AI inside your email and calendar, with no code. Build has you code with AI and build your own agents; pick it if you're comfortable installing software.",
    covers: [
      'Connect: drafted replies, summaries and scheduling, with you approving what goes out',
      'Build: AI reading and acting on your email, Sheets, calendar or files, with limits on what it can touch',
      'Both: a multi-step automation that stops for your approval where it matters',
    ],
    build: 'an automation that runs that task end to end, with a human check where it matters',
  },
};

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
