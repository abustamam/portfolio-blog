// "Start here" for the free AI guides hub, and the share text for a guide.
// Pure functions so the hub script, the guide script and the tests share one
// source of truth. Nothing here touches the browser or the network.
//
// The recommendation is written against guide ids, not against what is
// published: each answer names guides in order of preference and the first one
// that is actually published wins. When none of them is, the first published
// guide in `step` order is used, so the hub never recommends a missing page.

export interface GuideRef {
  id: string;
  step: number;
}

/**
 * "What do you do?" Values are stored through guideStore.setField.
 * This is the single shared vocabulary: #78's examples page saves the field
 * it filters by with these same values, so the hub can reuse it. Keep the two
 * in step (the first five are #78's five cards, `other` is the hub's extra).
 */
export const FIELDS = [
  { value: 'teacher', label: 'Teaching' },
  { value: 'bookkeeper', label: 'Bookkeeping or accounts' },
  { value: 'office-admin', label: 'Office or admin work' },
  { value: 'volunteer-coordinator', label: 'Running volunteers or a nonprofit' },
  { value: 'job-seeker', label: 'Looking for a job' },
  { value: 'other', label: 'Something else' },
] as const;

/** "Have you used AI before?" */
export const EXPERIENCE = [
  { value: 'never', label: 'Not yet' },
  { value: 'some', label: 'A little' },
  { value: 'often', label: 'Often' },
] as const;

export type Field = (typeof FIELDS)[number]['value'];
export type Experience = (typeof EXPERIENCE)[number]['value'];

export interface StartAnswers {
  field?: string | null;
  experience?: string | null;
}

export const isField = (x: unknown): x is Field => FIELDS.some((f) => f.value === x);
export const isExperience = (x: unknown): x is Experience => EXPERIENCE.some((e) => e.value === x);

// Guide ids as planned in #79 (what-is-ai is the first of the "start from zero" set): never-paste, prompt, when-ai-is-wrong, which-tool, job-search, examples.
const BY_EXPERIENCE: Record<Experience, string[]> = {
  never: ['what-is-ai', 'first-ten-minutes', 'never-paste', 'prompt', 'which-tool'],
  some: ['prompt', 'when-ai-is-wrong', 'never-paste'],
  often: ['when-ai-is-wrong', 'never-paste', 'examples'],
};

const BY_FIELD: Record<Field, string[]> = {
  'job-seeker': ['job-search', 'examples'],
  teacher: ['examples', 'prompt'],
  bookkeeper: ['examples', 'prompt'],
  'office-admin': ['examples', 'prompt'],
  'volunteer-coordinator': ['examples', 'prompt'],
  other: [],
};

export type GuideGroup = 'start' | 'guides' | 'reference';

export interface GroupedGuideRef extends GuideRef {
  group: GuideGroup;
}

/** The three hub lists, each in step order (ties by id). */
export function groupGuides<T extends GroupedGuideRef>(guides: readonly T[]): Record<GuideGroup, T[]> {
  const sorted = byStep(guides);
  return {
    start: sorted.filter((g) => g.group === 'start'),
    guides: sorted.filter((g) => g.group === 'guides'),
    reference: sorted.filter((g) => g.group === 'reference'),
  };
}

/**
 * The guide offered as "next" after `id`: the following guide in step order,
 * skipping `reference` guides (you look those up; you do not read on into them).
 */
export function nextGuide<T extends GroupedGuideRef>(guides: readonly T[], id: string): T | undefined {
  const sorted = byStep(guides);
  const at = sorted.findIndex((g) => g.id === id);
  if (at < 0) return undefined;
  return sorted.slice(at + 1).find((g) => g.group !== 'reference');
}

/** Guides in hub order: by step, ties by id. */
export function byStep<T extends GuideRef>(guides: readonly T[]): T[] {
  return [...guides].sort((a, b) => a.step - b.step || a.id.localeCompare(b.id));
}

/** Guide ids the answers point at, most wanted first (may repeat, may be unpublished). */
function wantedIds(answers: StartAnswers): string[] {
  const field = isField(answers.field) ? answers.field : null;
  const experience = isExperience(answers.experience) ? answers.experience : null;
  const wanted: string[] = [];
  if (experience === 'never') wanted.push(...BY_EXPERIENCE.never);
  if (field) wanted.push(...BY_FIELD[field]);
  if (experience && experience !== 'never') wanted.push(...BY_EXPERIENCE[experience]);
  return wanted;
}

const hasAnswer = (a: StartAnswers) => isField(a.field) || isExperience(a.experience);

/**
 * The guide to read first, or null when there are no answers (or no guides).
 * Someone who has never used AI always starts with the basics; otherwise a field
 * with its own guide wins, then the experience preference.
 */
export function recommend<T extends GuideRef>(answers: StartAnswers, guides: readonly T[]): T | null {
  const sorted = byStep(guides);
  if (sorted.length === 0 || !hasAnswer(answers)) return null;
  for (const id of wantedIds(answers)) {
    const hit = sorted.find((g) => g.id === id);
    if (hit) return hit;
  }
  return sorted[0];
}

/**
 * The reader's first few guides, in reading order: the recommended guide, then
 * the rest of what the answers point at, then the hub in step order. Reference
 * guides only join when the answers name them (you look those up, you do not
 * read on into them), and someone who already uses AI is not sent back to the
 * "start from zero" set unless their answers name one of those guides.
 * Empty with no answers.
 */
export function startPath<T extends GuideRef & { group?: GuideGroup }>(answers: StartAnswers, guides: readonly T[], size = 3): T[] {
  const first = recommend(answers, guides);
  if (!first) return [];
  const sorted = byStep(guides);
  const knowsAI = answers.experience === 'some' || answers.experience === 'often';
  const named = wantedIds(answers).map((id) => sorted.find((g) => g.id === id)).filter((g): g is T => !!g);
  const fill = sorted.filter((g) => g.group !== 'reference' && !(knowsAI && g.group === 'start'));
  const path: T[] = [first];
  for (const g of [...named, ...fill]) {
    if (path.length >= size) break;
    if (!path.includes(g)) path.push(g);
  }
  return path;
}

/** The first guide on the path not read yet, or null when every one has been read. */
export function nextUnread(path: readonly string[], visited: readonly string[]): string | null {
  const read = new Set(visited);
  return path.find((id) => !read.has(id)) ?? null;
}

/** Canonical form of a page URL for sharing: no query string, no fragment. */
export function canonicalShareUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return url.split(/[?#]/)[0];
  }
}

/** The text copied when the browser has no share sheet: "title — one line — link". */
export function shareText(title: string, line: string, url: string): string {
  return `${title} — ${line} — ${canonicalShareUrl(url)}`;
}
