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
 * placeholders, plus every whole-word, case-insensitive occurrence of each
 * name in `names` with PERSON-n. The same value always gets the same
 * placeholder; numbering follows first appearance (names: list order).
 * The key lists every placeholder used and the first original it replaced.
 */
export function scrub(input: string, names: string[] = []): ScrubResult {
  // Names: trimmed, de-duplicated ignoring case, numbered in list order.
  const people: string[] = [];
  for (const raw of names) {
    const n = raw.trim();
    if (n && !people.some((p) => p.toLowerCase() === n.toLowerCase())) people.push(n);
  }
  const personNumber = new Map(people.map((p, i) => [p.toLowerCase(), i + 1]));
  const longestFirst = [...people].sort((a, b) => b.length - a.length);
  const nameAlt = longestFirst.length
    ? `|((?<![\\p{L}\\p{N}_])(?:${longestFirst.map((n) => n.replace(ESCAPE, '\\$&')).join('|')})(?![\\p{L}\\p{N}_]))`
    : '';
  const re = new RegExp(`(${EMAIL})|(${PHONE})|(${ACCOUNT})${nameAlt}`, 'giu');

  const seen = { EMAIL: new Map<string, string>(), PHONE: new Map<string, string>(), ACCOUNT: new Map<string, string>() };
  const used = new Map<string, string>(); // placeholder -> first original
  const text = input.replace(re, (match, email, phone, account, person) => {
    let placeholder: string;
    if (typeof person === 'string') {
      placeholder = `PERSON-${personNumber.get(match.toLowerCase())}`;
      if (!used.has(placeholder)) used.set(placeholder, people.find((p) => p.toLowerCase() === match.toLowerCase()) ?? match);
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
