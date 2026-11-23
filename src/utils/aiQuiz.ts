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

/** Items a careful user keeps out of AI tools. "nothing" is the red flag. */
export const SENSITIVE = ['personal-info', 'passwords', 'financial', 'health'] as const;

export interface QuizResult {
  track: Track;
  score: number;
  /** True when the privacy answer suggests a gap worth covering first. */
  privacyGap: boolean;
}

export function scoreQuiz(a: QuizAnswers): QuizResult {
  const score = SKILL_KEYS.reduce((sum, k) => sum + (POINTS[k][a[k] ?? ''] ?? 0), 0);

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

export const TRACKS: Record<Track, { name: string; summary: string; covers: string[]; build: string }> = {
  foundations: {
    name: 'Foundations',
    summary:
      "You're early, and that's the best place to start. Most of the value in AI comes from a few habits: giving it enough context, checking what it tells you, and knowing what to keep out of it.",
    covers: [
      'Writing prompts with real context, so answers fit your situation',
      'Catching wrong answers before they cost you',
      'What never to paste into an AI tool, and safer ways to get the same help',
    ],
    build: 'a reusable prompt kit for the task you named, plus a checklist for verifying what comes back',
  },
  applied: {
    name: 'Applied',
    summary:
      "You already use AI and get value from it. The next step is pointing it at your actual work: the spreadsheets, documents, email and recurring operations that eat your week.",
    covers: [
      'Spreadsheets: cleaning data, writing formulas, summarising and checking the result',
      'Documents and email: drafts, templates, and summaries you can trust',
      'Turning a recurring task into a repeatable, documented workflow',
    ],
    build: 'a working, documented workflow for the task you named, using your own files',
  },
  builder: {
    name: 'Builder',
    summary:
      "You're past the basics and want AI to do work, not just answer questions. That means connecting it to your tools, chaining steps together, and deciding what runs locally versus in the cloud.",
    covers: [
      'Agents and multi-step workflows, and where they break',
      'Connecting AI to email, Sheets, calendars and other tools',
      'Local vs cloud models: cost, privacy and quality trade-offs',
    ],
    build: 'an automation that runs the task you named end to end, with a human check where it matters',
  },
};
