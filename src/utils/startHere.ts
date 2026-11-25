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

/** "What do you do?" Values are stored through guideStore.setField. */
export const FIELDS = [
  { value: 'office', label: 'Office or admin work' },
  { value: 'teaching', label: 'Teaching or training' },
  { value: 'business', label: 'My own business' },
  { value: 'job-search', label: 'Looking for a job' },
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

// Guide ids as planned in #79: never-paste, prompt, when-ai-is-wrong, which-tool, job-search, examples.
const BY_EXPERIENCE: Record<Experience, string[]> = {
  never: ['never-paste', 'prompt', 'which-tool'],
  some: ['prompt', 'when-ai-is-wrong', 'never-paste'],
  often: ['when-ai-is-wrong', 'never-paste', 'examples'],
};

const BY_FIELD: Record<Field, string[]> = {
  'job-search': ['job-search', 'examples'],
  office: ['examples', 'prompt'],
  teaching: ['examples', 'prompt'],
  business: ['examples', 'which-tool'],
  other: [],
};

/** Guides in hub order: by step, ties by id. */
export function byStep<T extends GuideRef>(guides: readonly T[]): T[] {
  return [...guides].sort((a, b) => a.step - b.step || a.id.localeCompare(b.id));
}

/**
 * The guide to read first, or null when there are no answers (or no guides).
 * Someone who has never used AI always starts with safety; otherwise a field
 * with its own guide wins, then the experience preference.
 */
export function recommend<T extends GuideRef>(answers: StartAnswers, guides: readonly T[]): T | null {
  const sorted = byStep(guides);
  if (sorted.length === 0) return null;
  const field = isField(answers.field) ? answers.field : null;
  const experience = isExperience(answers.experience) ? answers.experience : null;
  if (!field && !experience) return null;

  const wanted: string[] = [];
  if (experience === 'never') wanted.push(...BY_EXPERIENCE.never);
  if (field) wanted.push(...BY_FIELD[field]);
  if (experience && experience !== 'never') wanted.push(...BY_EXPERIENCE[experience]);

  for (const id of wanted) {
    const hit = sorted.find((g) => g.id === id);
    if (hit) return hit;
  }
  return sorted[0];
}

/** Guides in the order the hub shows them: the recommended one first, the rest in step order. */
export function orderGuides<T extends GuideRef>(answers: StartAnswers, guides: readonly T[]): T[] {
  const sorted = byStep(guides);
  const first = recommend(answers, sorted);
  return first ? [first, ...sorted.filter((g) => g.id !== first.id)] : sorted;
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
