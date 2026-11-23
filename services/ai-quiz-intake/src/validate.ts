// Turns an untrusted /api/ai-quiz POST body into a row to store.
// The track and score are recomputed here; whatever the browser sent for them is ignored.
import { scoreQuiz, type Track } from '../../../src/utils/aiQuiz';

const ONE = [
  'frequency', 'wrongAnswer', 'prompt', 'files', 'connected',
  'format', 'price', 'context', 'start', 'payer',
] as const;
const MANY = ['tools', 'neverPaste', 'schedule', 'followUp'] as const;
const REQUIRED = ['frequency', 'wrongAnswer', 'prompt', 'files', 'connected'] as const;

// Option values on the page are short kebab-case tokens; anything else is not from the form.
const TOKEN = /^[a-z0-9-]{1,40}$/;
const MAX_ITEMS = 12;
const LIMITS = { weeklyTask: 600, name: 120, contact: 160 } as const;

export interface Row {
  track: Track;
  score: number;
  privacyGap: boolean;
  weeklyTask: string;
  name: string | null;
  contact: string | null;
  answers: Record<string, string | string[]>;
}

export type Parsed =
  | { kind: 'ok'; row: Row }
  | { kind: 'spam' }
  | { kind: 'invalid'; error: string };

const text = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new Error('expected text');
  const s = v.trim();
  if (s.length > max) throw new Error(`text longer than ${max}`);
  return s || null;
};

export function parseSubmission(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'invalid', error: 'body must be an object' };
  const b = raw as Record<string, unknown>;

  // Honeypot: people never see the "website" field, bots fill it.
  if (typeof b.website === 'string' && b.website.trim() !== '') return { kind: 'spam' };

  try {
    const answers: Record<string, string | string[]> = {};
    for (const k of ONE) {
      const v = b[k];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v !== 'string' || !TOKEN.test(v)) throw new Error(`bad value for ${k}`);
      answers[k] = v;
    }
    for (const k of MANY) {
      const v = b[k];
      if (v === undefined || v === null) continue;
      if (!Array.isArray(v) || v.length > MAX_ITEMS) throw new Error(`bad list for ${k}`);
      if (!v.every((x) => typeof x === 'string' && TOKEN.test(x))) throw new Error(`bad value in ${k}`);
      if (v.length) answers[k] = [...new Set(v as string[])];
    }
    for (const k of REQUIRED) if (!answers[k]) throw new Error(`missing ${k}`);

    const weeklyTask = text(b.weeklyTask, LIMITS.weeklyTask);
    if (!weeklyTask) throw new Error('missing weeklyTask');

    const result = scoreQuiz({ ...(answers as Record<string, never>), weeklyTask });
    return {
      kind: 'ok',
      row: {
        track: result.track,
        score: result.score,
        privacyGap: result.privacyGap,
        weeklyTask,
        name: text(b.name, LIMITS.name),
        contact: text(b.contact, LIMITS.contact),
        answers,
      },
    };
  } catch (err) {
    return { kind: 'invalid', error: (err as Error).message };
  }
}
