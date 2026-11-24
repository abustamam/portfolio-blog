// Turns an untrusted /api/ai-quiz/waitlist POST body (the form at
// /ai-cohort/waitlist, where the sold-out Stripe link sends people) into a row
// to store. No imports: the page and the service both load this file.

export const WAITLIST_LIMITS = { name: 120, contact: 160, note: 400 } as const;

export interface WaitlistRow {
  name: string;
  contact: string;
  note: string | null;
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
    const name = text(b.name, 'name', WAITLIST_LIMITS.name);
    if (!name) throw new Error('missing name');
    const contact = text(b.contact, 'contact', WAITLIST_LIMITS.contact);
    if (!contact) throw new Error('missing contact');
    return { kind: 'ok', row: { name, contact, note: text(b.note, 'note', WAITLIST_LIMITS.note) } };
  } catch (err) {
    return { kind: 'invalid', error: (err as Error).message };
  }
}
