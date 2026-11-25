// Data for the free guide /ai-guides/which-tool/: one entry per AI app.
//
// Every fact was read on the vendor's own page on its `checked` date and links
// that page as `source`. Nothing here is from memory or a third-party article.
// When a vendor page did not confirm a fact, `confirmed` is false and the page
// shows "check the company's page" with the link instead of a claim.
//
// Re-check every quarter: open each `source`, update `text` and `checked`.
// The page's "last checked" date is the oldest `checked` below.
//
// This file answers "which app". Which option to pick inside an app's menu is
// a different guide; keep model names out of here.

export type ToolId = 'gemini' | 'chatgpt' | 'copilot' | 'claude';

export type FactKey = 'free' | 'paid' | 'work' | 'sees' | 'training';

export interface Fact {
  /** Plain words for the reader. Prices exactly as the vendor shows them. */
  text: string;
  /** The vendor's own page that says this. */
  source: string;
  /** The day `source` was read, YYYY-MM-DD. */
  checked: string;
  /** False when the vendor page did not confirm it; the page then says "check the company's page". */
  confirmed: boolean;
  /** Further vendor pages, when one page did not say all of `text`. */
  more?: string[];
}

export interface AiTool {
  id: ToolId;
  name: string;
  vendor: string;
  /** Where to start, on the vendor's site. */
  home: string;
  /** The vendor's own domains; every `source` must be on one of them. */
  domains: string[];
  facts: Record<FactKey, Fact>;
}

export const FACT_LABELS: Record<FactKey, string> = {
  free: 'Free plan',
  paid: 'Paid personal plan',
  work: 'With a work account',
  sees: 'What it can see once you connect it',
  training: 'Your chats and training',
};

export const FACT_ORDER: FactKey[] = ['free', 'paid', 'work', 'sees', 'training'];

/** Shown in place of a fact the vendor page did not confirm. */
export const UNCONFIRMED = "Check the company's page";

const CHECKED = '2026-11-24';

export const AI_TOOLS: AiTool[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    home: 'https://gemini.google.com/',
    domains: ['google.com', 'gemini.google'],
    facts: {
      free: {
        text: 'Free with a Google Account ($0 a month). Includes image making, Deep Research and Gemini Live. Gemini inside Gmail and Docs is listed with the paid plans.',
        source: 'https://gemini.google/subscriptions/',
        checked: CHECKED,
        confirmed: true,
      },
      paid: {
        text: 'Google AI Plus $4.99/month; Google AI Pro $19.99/month (US prices). Plus lists Gemini in Gmail; Pro lists Gmail and Docs.',
        source: 'https://gemini.google/subscriptions/',
        checked: CHECKED,
        confirmed: true,
      },
      work: {
        text: 'Included as a core service in most Google Workspace business editions (Business Starter, Standard and Plus, and Enterprise).',
        source: 'https://support.google.com/gemini/answer/14620100?hl=en',
        checked: CHECKED,
        confirmed: true,
      },
      sees: {
        text: 'Gmail, Google Calendar, Docs and Drive, once you connect them in Connected Apps. It cannot see comments or images in Docs or Gmail.',
        source: 'https://support.google.com/gemini/answer/15229592?hl=en',
        checked: CHECKED,
        confirmed: true,
      },
      training: {
        text: 'On by default if you are over 18, and some chats are read by human reviewers. Turn it off at gemini.google.com: Settings, then History, then untick "Chat content including text & uploads". Turning History off is a separate switch; chats are still kept for about two months.',
        source: 'https://support.google.com/gemini/answer/13278892?hl=en',
        checked: CHECKED,
        confirmed: true,
        more: ['https://support.google.com/gemini/answer/13594961?hl=en'],
      },
    },
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    home: 'https://chatgpt.com/',
    domains: ['chatgpt.com', 'openai.com'],
    facts: {
      free: {
        text: 'Free plan with unlimited text chats (within abuse limits), plus limited file uploads, image making, voice chats and deep research.',
        source: 'https://chatgpt.com/pricing',
        checked: CHECKED,
        confirmed: true,
      },
      paid: {
        text: 'ChatGPT Plus: $20/month, billed monthly.',
        source: 'https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus',
        checked: CHECKED,
        confirmed: true,
      },
      work: {
        text: 'A separate plan, ChatGPT Business, which an employer buys per user (2 users or more). It does not come with a Google or Microsoft work account.',
        source: 'https://chatgpt.com/pricing',
        checked: CHECKED,
        confirmed: true,
      },
      sees: {
        text: 'Gmail, Google Calendar and Google Drive (and other apps), once you connect them yourself. What you can connect depends on your plan and region.',
        source: 'https://help.openai.com/en/articles/10408842-google-app-for-chatgpt-data-controls-faq',
        checked: CHECKED,
        confirmed: true,
      },
      training: {
        text: 'On by default for Free, Plus and Pro. Turn it off in Settings, then Data controls, then "Improve the model for everyone". Business accounts are not used for training by default.',
        source: 'https://help.openai.com/en/articles/7730893-data-controls-faq',
        checked: CHECKED,
        confirmed: true,
      },
    },
  },
  {
    id: 'copilot',
    name: 'Copilot',
    vendor: 'Microsoft',
    home: 'https://copilot.microsoft.com/',
    domains: ['microsoft.com'],
    facts: {
      free: {
        text: 'A limited free version of Copilot, subject to available capacity and limits.',
        source: 'https://www.microsoft.com/en-us/copilot/pricing/individuals',
        checked: CHECKED,
        confirmed: true,
      },
      paid: {
        text: 'Microsoft 365 Personal $9.99/month, or Microsoft 365 Premium $19.99/month (US regular prices). Personal includes Copilot in Word, Excel and Outlook.',
        source: 'https://www.microsoft.com/en-us/copilot/pricing/individuals',
        checked: CHECKED,
        confirmed: true,
      },
      work: {
        text: 'Copilot Chat is available at no additional cost when you sign in with a work account that has an eligible Microsoft 365 subscription. Microsoft describes the no-cost version as web-grounded chat; more needs the paid Microsoft 365 Copilot license.',
        source: 'https://www.microsoft.com/en-us/microsoft-365-copilot/chat',
        checked: CHECKED,
        confirmed: true,
      },
      sees: {
        text: 'OneDrive, Outlook.com email, calendar and contacts, Gmail and Google Drive, once you connect them yourself. Microsoft describes this for Microsoft 365 Personal, Family, Premium and Pro.',
        source: 'https://support.microsoft.com/en-us/microsoft-copilot/connecting-microsoft-copilot-to-other-services',
        checked: CHECKED,
        confirmed: true,
      },
      training: {
        // confirmed: the FAQ wording below was read on the page. Microsoft's privacy pages describe the training opt-out only for the
        // older Copilot app (replaced August 18, 2026); the page for the current
        // app did not say whether chats are used for training or where to turn it off.
        text: "Assume it is on. Microsoft's privacy FAQ says personal Copilot chats can be used to train its AI unless you opt out, but that page now covers only the older app (replaced August 18, 2026) and its page for the new app does not say. Check the privacy settings in the app.",
        source: 'https://support.microsoft.com/en-us/microsoft-copilot/privacy-faq-for-microsoft-copilot',
        checked: CHECKED,
        confirmed: true,
      },
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    home: 'https://claude.ai/',
    domains: ['claude.com', 'claude.ai', 'anthropic.com'],
    facts: {
      free: {
        text: 'Free plan ($0) with limited use every 5 hours and every week. Includes web search, making files, and connecting your apps.',
        source: 'https://claude.com/pricing',
        checked: CHECKED,
        confirmed: true,
      },
      paid: {
        text: 'Claude Pro: $20 if billed monthly, or $17/month billed annually ($200 up front). Prices do not include tax.',
        source: 'https://claude.com/pricing',
        checked: CHECKED,
        confirmed: true,
      },
      work: {
        text: 'Separate plans, Claude Team and Enterprise, which an employer buys per seat. They do not come with a Google or Microsoft work account.',
        source: 'https://claude.com/pricing',
        checked: CHECKED,
        confirmed: true,
      },
      sees: {
        text: 'Gmail, Google Calendar and Google Drive, once you connect them yourself; available on every plan, including Free. By default it asks before sending, replying or forwarding email.',
        source: 'https://support.claude.com/en/articles/10166901-use-google-workspace-connectors',
        checked: CHECKED,
        confirmed: true,
      },
      training: {
        text: 'Free, Pro and Max have a setting for this: Settings, then Privacy, then "Help Improve our AI models". Anthropic asks new users to choose when they sign up. Team and Enterprise plans: no training by default.',
        source: 'https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings',
        checked: CHECKED,
        confirmed: true,
        more: ['https://www.anthropic.com/news/updates-to-our-consumer-terms', 'https://claude.com/pricing'],
      },
    },
  },
];

/** Every fact, flattened, for the "last checked" date and the data test. */
export const allFacts = (tools: AiTool[] = AI_TOOLS) =>
  tools.flatMap((t) => FACT_ORDER.map((key) => ({ tool: t, key, fact: t.facts[key] })));

/** The oldest `checked` date in the data: the page's "last checked" date. */
export function lastChecked(tools: AiTool[] = AI_TOOLS): string {
  return allFacts(tools)
    .map((f) => f.fact.checked)
    .sort()[0];
}

export const toolById = (id: ToolId) => AI_TOOLS.find((t) => t.id === id)!;
