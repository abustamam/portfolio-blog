// Turns an untrusted /api/ai-quiz/waitlist POST body into a row to store.
// Three forms post here: the cohort waitlist at /ai-cohort/waitlist (where the
// sold-out Stripe link sends people: name and contact), the "tell me when the
// next cohort opens" form on the free guides (contact only, plus a `source`
// naming the page), and the same ask on the /ai-quiz result screen (optional
// name, contact, and `quiz:<track>`). No imports: the page and the service
// both load this file.

export const WAITLIST_LIMITS = { name: 120, contact: 160, note: 400, source: 60 } as const;

/** Where a sign-up came from: the guides hub, one guide by its id, or the quiz result for a track. */
export const SOURCE = /^(guides-hub|guide:[a-z0-9-]{1,50}|quiz:(foundations|applied|builder))$/;

export interface WaitlistRow {
  /** Required on the cohort waitlist; the guides form has no name field. */
  name: string | null;
  contact: string;
  note: string | null;
  /** Null on the cohort waitlist; `guides-hub` or `guide:<id>` from the guides; `quiz:<track>` from the quiz. */
  source: string | null;
}

export type ParsedWaitlist =
  | { kind: 'ok'; row: WaitlistRow }
  | { kind: 'spam' }
  | { kind: 'invalid'; error: string };

const text = (v: unknown, k: string, max: number): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new Error(`expected text for ${k}`);
  const s = v.trim();
  if (s.length > max) throw new Error(`${k} longer than ${max}`);
  return s || null;
};

export function parseWaitlist(raw: unknown): ParsedWaitlist {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'invalid', error: 'body must be an object' };
  const b = raw as Record<string, unknown>;

  // Honeypot: people never see the "website" field, bots fill it.
  if (typeof b.website === 'string' && b.website.trim() !== '') return { kind: 'spam' };

  try {
    const source = text(b.source, 'source', WAITLIST_LIMITS.source);
    if (source && !SOURCE.test(source)) throw new Error('bad source');
    const name = text(b.name, 'name', WAITLIST_LIMITS.name);
    // A row with no name must say where it came from, or nobody knows what it signed up for.
    if (!name && !source) throw new Error('missing name');
    const contact = text(b.contact, 'contact', WAITLIST_LIMITS.contact);
    if (!contact) throw new Error('missing contact');
    return { kind: 'ok', row: { name, contact, note: text(b.note, 'note', WAITLIST_LIMITS.note), source } };
  } catch (err) {
    return { kind: 'invalid', error: (err as Error).message };
  }
}
