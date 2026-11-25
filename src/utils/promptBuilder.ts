// Pure logic for the five-part prompt builder (src/components/guides/PromptBuilder.astro).
// The component script and the tests both import from here.

export const PROMPT_FIELDS = ['situation', 'task', 'input', 'format', 'check'] as const;
export type PromptField = (typeof PROMPT_FIELDS)[number];
export type PromptParts = Record<PromptField, string>;

/** Labels, in the order the assembled prompt uses them (same as the cohort template). */
export const FIELD_LABELS: Record<PromptField, string> = {
  situation: 'Situation',
  task: 'Task',
  input: 'Input',
  format: 'Format',
  check: 'Check',
};

export const emptyParts = (): PromptParts => ({ situation: '', task: '', input: '', format: '', check: '' });

/** A named set of the five parts, shown as a chip and used to fill the builder. */
export interface PromptPreset extends PromptParts {
  id: string;
  label: string;
}

/** Fill in any missing or non-string field with an empty one. */
export function normalizeParts(x: unknown): PromptParts {
  const out = emptyParts();
  if (typeof x === 'object' && x !== null) {
    for (const f of PROMPT_FIELDS) {
      const v = (x as Record<string, unknown>)[f];
      if (typeof v === 'string') out[f] = v;
    }
  }
  return out;
}

/** A saved draft is valid only when it is an object with at least one string field. */
export function parseDraft(x: unknown): PromptParts | null {
  if (typeof x !== 'object' || x === null) return null;
  const hasAny = PROMPT_FIELDS.some((f) => typeof (x as Record<string, unknown>)[f] === 'string');
  return hasAny ? normalizeParts(x) : null;
}

/** "Label: text" for each non-empty part, in order, blank line between. Empty parts are left out. */
export function assemblePrompt(parts: Partial<PromptParts>): string {
  return PROMPT_FIELDS.flatMap((f) => {
    const v = (parts[f] ?? '').trim();
    return v ? [`${FIELD_LABELS[f]}: ${v}`] : [];
  }).join('\n\n');
}

export const hasCheckLine = (check: string, line: string): boolean =>
  check.split('\n').some((l) => l.trim() === line.trim());

/** Append a Check line on its own line. Adding the same line again changes nothing. */
export function addCheckLine(check: string, line: string): string {
  const l = line.trim();
  if (!l || hasCheckLine(check, l)) return check;
  const base = check.replace(/\s+$/, '');
  return base ? `${base}\n${l}` : l;
}

/** "Your task in one sentence": blanks stay as underscores so a half-filled sentence still reads. */
export interface TaskSentence {
  what: string;
  using: string;
  time: string;
  done: string;
}
export const SENTENCE_KEYS = ['what', 'using', 'time', 'done'] as const;
export const emptySentence = (): TaskSentence => ({ what: '', using: '', time: '', done: '' });

export function assembleSentence(s: Partial<TaskSentence>): string {
  const b = (v?: string) => (v ?? '').trim() || '________';
  return `Every week I do ${b(s.what)} using ${b(s.using)}, it takes ${b(s.time)}, and done means ${b(s.done)}.`;
}

export function parseSentence(x: unknown): TaskSentence | null {
  if (typeof x !== 'object' || x === null) return null;
  const out = emptySentence();
  let any = false;
  for (const k of SENTENCE_KEYS) {
    const v = (x as Record<string, unknown>)[k];
    if (typeof v === 'string') {
      out[k] = v;
      any = true;
    }
  }
  return any ? out : null;
}
