// Data for the free guide /ai-guides/photos-files-voice/: what each app's free plan
// accepts (photo, file, voice), and the three worked example cards.
//
// Every cell was read on the vendor's own page on its `checked` date and links that
// page as `source`. Nothing here is from memory or a third-party article. When the
// vendor page did not confirm a cell, `confirmed` is false and the page shows
// "Check the vendor's page" with the link instead of a claim. It never says "No".
//
// Re-check every quarter: open each `source`, update `text` and `checked`.
// The page's "last checked" date is the oldest `checked` below.

import { UNCONFIRMED, type Fact } from './aiTools';

export type AppId = 'chatgpt' | 'gemini' | 'copilot' | 'claude';
export type AcceptKey = 'photo' | 'file' | 'voice';

export const ACCEPT_LABELS: Record<AcceptKey, string> = { photo: 'Photo', file: 'File', voice: 'Voice' };
export const ACCEPT_ORDER: AcceptKey[] = ['photo', 'file', 'voice'];

export interface AttachApp {
  id: AppId;
  name: string;
  /** The vendor's own domains; every `source` must be on one of them. */
  domains: string[];
  accepts: Record<AcceptKey, Fact>;
}

const CHECKED = '2026-11-25';

const yes = (text: string, source: string): Fact => ({ text, source, checked: CHECKED, confirmed: true });
const unsure = (source: string): Fact => ({ text: UNCONFIRMED, source, checked: CHECKED, confirmed: false });

const CHATGPT_FAQ = 'https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq';
const GEMINI_HELP = 'https://support.google.com/gemini/answer/14903178?hl=en';
const COPILOT_HELP = 'https://support.microsoft.com/en-us/microsoft-365-copilot/what-is-microsoft-copilot-app';
const CLAUDE_UPLOAD = 'https://support.claude.com/en/articles/8241126-upload-files-to-claude';

export const ATTACH_APPS: AttachApp[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    domains: ['openai.com', 'chatgpt.com'],
    accepts: {
      photo: yes('Yes, limited', CHATGPT_FAQ),
      file: yes('Yes, limited', CHATGPT_FAQ),
      voice: yes('Limited voice chats', 'https://chatgpt.com/pricing/'),
    },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    domains: ['google.com', 'gemini.google'],
    accepts: {
      photo: yes('Yes, signed in', GEMINI_HELP),
      file: yes('Yes, signed in', GEMINI_HELP),
      voice: yes('Yes (Gemini Live)', 'https://gemini.google/subscriptions/'),
    },
  },
  {
    id: 'copilot',
    name: 'Copilot',
    domains: ['microsoft.com'],
    accepts: {
      photo: unsure(COPILOT_HELP),
      file: unsure(COPILOT_HELP),
      voice: yes('Yes; signing in gives longer voice sessions', COPILOT_HELP),
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    domains: ['claude.com'],
    accepts: {
      photo: unsure(CLAUDE_UPLOAD),
      file: unsure(CLAUDE_UPLOAD),
      voice: yes('Yes', 'https://claude.com/pricing'),
    },
  },
];

export const allCells = (apps: AttachApp[] = ATTACH_APPS) =>
  apps.flatMap((app) => ACCEPT_ORDER.map((key) => ({ app, key, fact: app.accepts[key] })));

/** The oldest `checked` date across every cell (YYYY-MM-DD). */
export function lastChecked(apps: AttachApp[] = ATTACH_APPS): string {
  return allCells(apps)
    .map((c) => c.fact.checked)
    .sort()[0];
}

// ---- The three cards. Every document is made up; no real person or organization. ----

export type ExampleId = 'letter' | 'manual' | 'voice';

export interface AttachExample {
  id: ExampleId;
  /** Short label above the card. */
  kind: string;
  /** What was handed over, in words (also the accessible name of the picture). */
  handed: string;
  question: string;
  answer: string;
  /** The line to double-check; null when there is nothing to verify. */
  check: string | null;
  /** Shown instead of a check line when `check` is null. */
  noCheck?: string;
}

export const ATTACH_EXAMPLES: AttachExample[] = [
  {
    id: 'letter',
    kind: 'A photo of a letter',
    handed: 'A photo of a past-due notice from Riverbend Water District to Resident, 14 Alder Court, amount due $84.17, pay by December 12.',
    question: 'What is this asking me to do, and by when?',
    answer: 'Pay $84.17 by December 12, online or by phone. Service may be interrupted after that date.',
    check: 'The amount and the date, against the letter. Photos are where digits get misread.',
  },
  {
    id: 'manual',
    kind: 'A PDF',
    handed: 'A PDF file named Halden HD-40 manual, 12 pages.',
    question: 'The display says E4. What does that mean and what do I do?',
    answer: 'E4 is a drain fault. Clean the filter under the lower rack, then check the drain hose for a kink (page 9).',
    check: 'Open page 9 and confirm it says that. Ask it for the page number every time.',
  },
  {
    id: 'voice',
    kind: 'A spoken question',
    handed: 'A recording of a spoken question, shown as a waveform with its transcript.',
    question: "I've got chicken thighs, rice and a bag of spinach. What can I make in half an hour?",
    answer: 'A one-pan chicken and rice, with the spinach stirred in at the end. Four steps.',
    check: null,
    noCheck: 'Nothing to verify. A low-stakes question, which is when you can just use the answer.',
  },
];

/** Bar heights (percent) for the waveform strip. Fixed, so the page is the same every build. */
export const WAVEFORM: number[] = [
  18, 30, 46, 62, 40, 26, 54, 78, 90, 70, 48, 34, 58, 82, 66, 44, 28, 20, 36, 60, 84, 72, 50, 32, 22, 40, 64, 88, 74, 52, 30, 18, 26, 44, 68, 56, 38, 24, 16, 12,
];
