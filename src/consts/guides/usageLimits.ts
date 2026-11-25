// Data for the free guide /ai-guides/usage-limits/: how each app describes its
// free limit, when it refills and where to see your usage.
//
// Every fact was read on the vendor's own page on its `checked` date and links
// that page as `source`. Nothing here is from memory or a third-party article.
// When a vendor page did not say, `confirmed` is false and the page shows
// "Check the vendor's page" with the link instead of a claim.
//
// The paid price is not stored here: the page imports it from aiTools.ts so
// there is one copy. Re-check every quarter: open each `source`, update `text`
// and `checked`. The page's "last checked" date is the oldest `checked` across
// this file and the imported paid facts.
import { AI_TOOLS, type Fact, type ToolId } from './aiTools';

export { UNCONFIRMED, type Fact } from './aiTools';

export type LimitKey = 'freeLimit' | 'reset' | 'seeUsage';

export const LIMIT_LABELS: Record<LimitKey, string> = {
  freeLimit: 'Free plan allowance',
  reset: 'When it refills',
  seeUsage: 'Where to see your usage',
};

export const LIMIT_ORDER: LimitKey[] = ['freeLimit', 'reset', 'seeUsage'];

export interface UsageLimitApp {
  id: ToolId;
  name: string;
  facts: Record<LimitKey, Fact>;
}

const CHECKED = '2026-11-25';

const OPENAI = 'https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq';
const GEMINI = 'https://support.google.com/gemini/answer/16275805?hl=en';
const COPILOT = 'https://www.microsoft.com/en-us/copilot/pricing/individuals';
const COPILOT_CREDITS = 'https://support.microsoft.com/en-us/microsoft-365-copilot/ai-credits-and-limits-for-microsoft-365-subscriptions';
const CLAUDE = 'https://claude.com/pricing';

const fact = (text: string, source: string, confirmed: boolean): Fact => ({ text, source, checked: CHECKED, confirmed });

export const USAGE_LIMITS: UsageLimitApp[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    facts: {
      freeLimit: fact(
        'Everyday text chats are unlimited (within abuse limits). Uploads, images, voice and data analysis each have their own limits; it tells you when you reach one.',
        OPENAI,
        true,
      ),
      reset: fact('It shows when the limit resets inside the app. OpenAI does not publish a fixed time.', OPENAI, true),
      seeUsage: fact('(not stated)', OPENAI, false),
    },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    facts: {
      freeLimit: fact(
        '"Standard limits". Usage depends on how complex the request is, the features you use and how long the chat is; video, Deep Research and the Pro model use more.',
        GEMINI,
        true,
      ),
      reset: fact('Refreshes every 5 hours, until you reach a weekly limit.', GEMINI, true),
      seeUsage: fact('gemini.google.com: Settings (bottom left), then Usage Limits.', GEMINI, true),
    },
  },
  {
    id: 'copilot',
    name: 'Copilot',
    facts: {
      freeLimit: fact(
        'A limited free version, "subject to available capacity and limits". When you hit a limit you can upgrade or come back later.',
        COPILOT,
        true,
      ),
      reset: fact('(not stated)', COPILOT, false),
      seeUsage: fact('(not stated)', COPILOT_CREDITS, false),
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    facts: {
      freeLimit: fact(
        'Limited use every 5 hours and every week. How fast you reach it depends on the model, how long your chats are and how large your files are.',
        CLAUDE,
        true,
      ),
      reset: fact('A rolling five-hour window, plus a weekly limit.', CLAUDE, true),
      seeUsage: fact('Settings, then Usage.', CLAUDE, true),
    },
  },
];

/** The paid personal plan fact for an app, straight from aiTools.ts. */
export const paidFact = (id: ToolId): Fact => AI_TOOLS.find((t) => t.id === id)!.facts.paid;

/** Every fact the page shows, including the imported paid ones. */
export const allUsageFacts = (): Fact[] => [
  ...USAGE_LIMITS.flatMap((a) => LIMIT_ORDER.map((k) => a.facts[k])),
  ...USAGE_LIMITS.map((a) => paidFact(a.id)),
];

/** The page's "last checked" date: the oldest `checked` of any fact it shows. */
export const oldestChecked = (): string =>
  allUsageFacts()
    .map((f) => f.checked)
    .sort()[0];
