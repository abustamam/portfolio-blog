// Pure rules for the never-paste Scrubber. Nothing here touches the DOM,
// storage or the network: the component and the tests both import it.

export type KeyEntry = { placeholder: string; original: string };
export type ScrubResult = { text: string; key: KeyEntry[] };

type Kind = 'EMAIL' | 'PHONE' | 'ACCOUNT';

const EMAIL = String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}`;
// International (+...), (555) 123-4567, 555-123-4567 and a plain 10 digits.
const PHONE = [
  String.raw`\+\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{1,4}(?:[ .-]?\d{2,4}){2,3}(?!\d)`,
  String.raw`(?<![\d(])\(\d{3}\)[ .-]?\d{3}[ .-]?\d{4}(?!\d)`,
  String.raw`(?<!\d[ .-]?)\d{3}[ .-]\d{3}[ .-]\d{4}(?![ .-]?\d)`,
  String.raw`(?<!\d)\d{10}(?!\d)`,
].join('|');
// Card-like and long digit runs: 9+ digits, single spaces or dashes allowed.
const ACCOUNT = String.raw`(?<!\d)\d(?:[ -]?\d){8,}(?!\d)`;

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

function normalise(kind: Kind, value: string): string {
  return kind === 'EMAIL' ? value.toLowerCase() : value.replace(/\D/g, '');
}

/**
 * Replace emails, phone numbers and long digit runs with numbered
 * placeholders, plus the names in `names` with PERSON-n (whole words only).
 * A one-word entry matches in any case. An entry of several words ("Dana Lee")
 * matches the full phrase and each word on its own, but only where every
 * matched word is capitalised, so "Rose May" does not catch "may" or "rose".
 * The same value always gets the same placeholder; numbering follows first appearance (names: list order).
 * The key lists every placeholder used and the first original it replaced.
 */
export function scrub(input: string, names: string[] = []): ScrubResult {
  // Names: trimmed, de-duplicated ignoring case, numbered in list order.
  const people: string[] = [];
  for (const raw of names) {
    const n = raw.trim().replace(/\s+/g, ' ');
    if (n && !people.some((p) => p.toLowerCase() === n.toLowerCase())) people.push(n);
  }
  // A full name counts as one person: the whole phrase and each of its words
  // map to that entry's PERSON-n. Full phrases claim their own entry first;
  // a part shared by two entries goes to the entry added first.
  const fold = (t: string) => t.replace(/\s+/g, ' ').toLowerCase();
  const tokenOwner = new Map<string, number>(); // folded token -> index in people
  people.forEach((p, i) => tokenOwner.set(fold(p), i));
  people.forEach((p, i) => {
    for (const part of p.split(/\s+/)) if (!tokenOwner.has(fold(part))) tokenOwner.set(fold(part), i);
  });
  // A one-word entry matches in any case. Every other token (a phrase of
  // several words, or one word of it) must be capitalised: each word starts
  // with its upper-case letter, the rest may be any case.
  const anyCase = new Set(people.filter((p) => !p.includes(' ')).map(fold));
  const word = (w: string, cap: boolean) =>
    [...w]
      .map((ch, i) => {
        const lo = ch.toLowerCase();
        const up = ch.toUpperCase();
        if (lo === up) return ch.replace(ESCAPE, '\\$&');
        if (i === 0 && cap) return up.replace(ESCAPE, '\\$&');
        return `(?:${lo.replace(ESCAPE, '\\$&')}|${up.replace(ESCAPE, '\\$&')})`;
      })
      .join('');
  const tokens = [...tokenOwner.keys()].sort((a, b) => b.length - a.length);
  const nameAlt = tokens.length
    ? `|((?<![\\p{L}\\p{N}_])(?:${tokens.map((t) => t.split(' ').map((w) => word(w, !anyCase.has(t))).join('\\s+')).join('|')})(?![\\p{L}\\p{N}_]))`
    : '';
  // Case-sensitive on purpose: the name patterns spell out their own case
  // rules, and the email pattern lists both cases.
  const re = new RegExp(`(${EMAIL})|(${PHONE})|(${ACCOUNT})${nameAlt}`, 'gu');

  const seen = { EMAIL: new Map<string, string>(), PHONE: new Map<string, string>(), ACCOUNT: new Map<string, string>() };
  const used = new Map<string, string>(); // placeholder -> first original
  const text = input.replace(re, (match, email, phone, account, person) => {
    let placeholder: string;
    if (typeof person === 'string') {
      const owner = tokenOwner.get(fold(match))!;
      placeholder = `PERSON-${owner + 1}`;
      if (!used.has(placeholder)) used.set(placeholder, people[owner]);
      return placeholder;
    }
    const kind: Kind = email ? 'EMAIL' : phone ? 'PHONE' : 'ACCOUNT';
    const norm = normalise(kind, match);
    placeholder = seen[kind].get(norm) ?? `${kind}-${seen[kind].size + 1}`;
    seen[kind].set(norm, placeholder);
    if (!used.has(placeholder)) used.set(placeholder, match);
    return placeholder;
  });

  const rank = (p: string) => ['EMAIL', 'PHONE', 'ACCOUNT', 'PERSON'].indexOf(p.split('-')[0]);
  const key = [...used.entries()]
    .map(([placeholder, original]) => ({ placeholder, original }))
    .sort((a, b) => rank(a.placeholder) - rank(b.placeholder) || Number(a.placeholder.split('-')[1]) - Number(b.placeholder.split('-')[1]));
  return { text, key };
}

/** Put the originals back. Placeholders are replaced longest first so PERSON-10 is not eaten by PERSON-1. */
export function restore(text: string, key: KeyEntry[]): string {
  const map = new Map(key.map((k) => [k.placeholder, k.original]));
  return text.replace(/(?:EMAIL|PHONE|ACCOUNT|PERSON)-\d+/g, (p) => map.get(p) ?? p);
}

/** The key as plain text, one "PLACEHOLDER = original" per line. */
export function keyToText(key: KeyEntry[]): string {
  return key.map((k) => `${k.placeholder} = ${k.original}`).join('\n');
}
