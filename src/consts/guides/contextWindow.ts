// The scripted road-trip chat for the "window" figure on
// /ai-guides/does-it-remember/. Pure data and two pure functions: the
// component and the tests both read them, so the page and the spec agree.
//
// The frame holds eight messages. Nothing here is a vendor fact: the chat is
// made up and the eight-message frame is a scaled-down picture.

export const FRAME_SIZE = 8;

export type Who = 'You' | 'AI';

export interface ChatMessage {
  /** 1-based position in the chat. */
  n: number;
  who: Who;
  text: string;
  /** A phrase inside `text` to underline, so the eye finds the allergy and the nuts. */
  flag?: string;
}

export const MESSAGES: ChatMessage[] = [
  { n: 1, who: 'You', text: 'We are four people driving to the coast in July. My daughter is allergic to nuts.', flag: 'allergic to nuts' },
  { n: 2, who: 'AI', text: 'Noted: four people, July, no nuts. Where are you starting from?' },
  { n: 3, who: 'You', text: 'Sacramento. We want to stop once on the way.' },
  { n: 4, who: 'AI', text: 'A halfway stop with a park and a picnic area would work well.' },
  { n: 5, who: 'You', text: 'What should we pack for the beach?' },
  { n: 6, who: 'AI', text: 'Sunscreen, towels, a shade tent, water, a change of clothes each.' },
  { n: 7, who: 'You', text: 'Which day is least busy?' },
  { n: 8, who: 'AI', text: 'A weekday. Leave early and you miss the crowds.' },
  { n: 9, who: 'You', text: 'Where can we park?' },
  { n: 10, who: 'AI', text: 'Arrive before ten and use the main lot. A side street is the backup.' },
  { n: 11, who: 'You', text: 'Suggest snacks for the drive.' },
  { n: 12, who: 'AI', text: 'Trail mix, peanut butter crackers, fruit.', flag: 'peanut butter' },
];

export const LAST = MESSAGES.length;

/** The chat after "start a new chat with a summary": two messages. */
export const RESET_MESSAGES: ChatMessage[] = [
  {
    n: 1,
    who: 'You',
    text: 'Four of us, July, coast trip from Sacramento, one child allergic to nuts. Suggest snacks for the drive.',
    flag: 'allergic to nuts',
  },
  { n: 2, who: 'AI', text: 'Sliced fruit, cheese sticks, popcorn, pretzels. All nut-free.', flag: 'nut-free' },
];

export const CAPTION =
  'It did not ignore the allergy. It could no longer see it. Message 1 had slid out of the frame by the time you asked for snacks.';

export interface Window {
  /** First and last message the AI can see (1-based, inclusive). */
  from: number;
  to: number;
  /** How many messages have slid out above the frame. */
  outside: number;
}

/** What the frame covers once `count` messages exist. */
export function windowFor(count: number, size = FRAME_SIZE): Window {
  const to = Math.max(0, Math.min(count, LAST));
  const from = Math.max(1, to - size + 1);
  return { from, to, outside: to === 0 ? 0 : from - 1 };
}

/** True when the AI can see message `n` after `count` messages. */
export function isVisible(n: number, count: number, size = FRAME_SIZE): boolean {
  const w = windowFor(count, size);
  return n >= w.from && n <= w.to;
}

/** The caption shows only when the allergy has left the frame and the answer has nuts in it. */
export function showCaption(count: number): boolean {
  return count === LAST && !isVisible(1, count);
}

/** One line for the polite live region after a step. */
export function statusLine(count: number): string {
  const w = windowFor(count);
  const range = w.from === w.to ? `message ${w.to}` : `messages ${w.from} to ${w.to}`;
  let line = `Message ${count} added. The AI can see ${range}.`;
  if (w.outside > 0) {
    const gone = w.outside === 1 ? 'Message 1 can no longer be seen' : `Messages 1 to ${w.outside} can no longer be seen`;
    line += ` ${gone}.`;
  }
  if (showCaption(count)) line += ` ${CAPTION}`;
  return line;
}

export const RESET_STATUS =
  'New chat started with a summary. It holds two messages, and the AI can see both. The answer is nut-free.';
