// Data for /ai-guides/first-ten-minutes/: the six numbered parts of the
// schematic chat screen, and the "where this is in your app" table.
//
// The schematic is a neutral drawing, so it carries no vendor facts and does
// not age. The table does. Every cell was read on the vendor's own page on its
// `checked` date and links that page as `source`. When the vendor page did not
// say, `confirmed` is false and the page shows "Check the vendor's page" with
// the link instead of a claim.
//
// Re-check every quarter: open each `source`, update `text` and `checked`.
// The page's "last checked" date is the oldest `checked` below.

import { UNCONFIRMED, type Fact } from './aiTools';

export type PartId = 1 | 2 | 3 | 4 | 5 | 6;

export interface ScreenPart {
  id: PartId;
  name: string;
  /** The one-line explanation shown when the part is picked. */
  line: string;
}

export const SCREEN_PARTS: ScreenPart[] = [
  { id: 1, name: 'Message box', line: 'Where you type. Enter sends on a computer; use Shift+Enter for a new line.' },
  { id: 2, name: 'Send', line: 'The arrow button. Nothing is sent until you press it.' },
  { id: 3, name: 'The answer', line: 'It appears a few words at a time. You can stop it part-way.' },
  { id: 4, name: 'New chat', line: "Starts fresh: it can't see your last chat. Use it when you change topic." },
  { id: 5, name: 'Past chats', line: 'Your earlier conversations, in a side list. Tap one to carry on.' },
  { id: 6, name: 'Model menu', line: 'A choice of which model answers. Leave it alone for now.' },
];

export type AppId = 'chatgpt' | 'gemini' | 'copilot' | 'claude';
export type AppFactKey = 'signIn' | 'account' | 'newChat';

export interface AppFacts {
  id: AppId;
  name: string;
  facts: Record<AppFactKey, Fact>;
}

export const APP_FACT_LABELS: Record<AppFactKey, string> = {
  signIn: 'Where to sign in',
  account: 'What a free account needs',
  newChat: 'The new-chat button',
};

export const APP_FACT_ORDER: AppFactKey[] = ['signIn', 'account', 'newChat'];

const CHECKED = '2026-11-25';

const fact = (text: string, source: string, confirmed = true): Fact => ({
  text: confirmed ? text : UNCONFIRMED,
  source,
  checked: CHECKED,
  confirmed,
});

export const APPS: AppFacts[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    facts: {
      signIn: fact(
        'chatgpt.com, or the phone app. You can try it before making an account, but your chats are only saved once you sign in.',
        'https://help.openai.com/en/articles/9125172-the-chatgpt-home-page',
      ),
      account: fact(
        'An email address, or a Google, Apple or Microsoft sign-in. In some countries you can sign up with only a phone number.',
        'https://help.openai.com/en/articles/10388702-phone-only-signups',
      ),
      newChat: fact('"New chat"', 'https://help.openai.com/en/articles/9125172-the-chatgpt-home-page'),
    },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    facts: {
      signIn: fact(
        'gemini.google.com, or the phone app. Some features work without signing in; you need to sign in to save your chats.',
        'https://support.google.com/gemini/answer/13278668?hl=en',
      ),
      account: fact('A Google account (the one you use for Gmail).', 'https://support.google.com/gemini/answer/13278668?hl=en'),
      newChat: fact(
        '"New chat", at the top left (open the menu first if you don\'t see it).',
        'https://support.google.com/gemini/answer/13275745?hl=en&co=GENIE.Platform%3DDesktop',
      ),
    },
  },
  {
    id: 'copilot',
    name: 'Copilot',
    facts: {
      signIn: fact(
        'copilot.com, or the phone app. Signing in keeps your chat history and gives you longer conversations.',
        'https://support.microsoft.com/en-us/microsoft-365-copilot/what-is-microsoft-copilot-app',
      ),
      account: fact(
        'A personal Microsoft account, Apple ID or Google account.',
        'https://support.microsoft.com/en-us/microsoft-365-copilot/what-is-microsoft-copilot-app',
      ),
      newChat: fact('', 'https://support.microsoft.com/en-us/microsoft-365-copilot/what-is-microsoft-copilot-app', false),
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    facts: {
      signIn: fact('claude.ai, or the phone app.', 'https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account'),
      account: fact(
        'An email address or a Google account, plus a mobile phone number that can receive a text: every new account must verify one.',
        'https://support.claude.com/en/articles/8287232-verify-your-phone-number',
      ),
      newChat: fact('', 'https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac', false),
    },
  },
];

/** The oldest `checked` date in the table: the page's "last checked" date. */
export function oldestChecked(apps: readonly AppFacts[]): string {
  const all = apps.flatMap((a) => APP_FACT_ORDER.map((k) => a.facts[k].checked));
  return all.reduce((min, d) => (d < min ? d : min), all[0]);
}

/** "2026-11-25" -> "November 25, 2026". */
export function formatChecked(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
