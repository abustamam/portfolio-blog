// The options in each AI app's model menu, for /ai-guides/which-model/.
//
// Every name and fact here was read on the vendor's own page on the `checked`
// date (the `source` URL). Nothing is from memory. A model that could not be
// confirmed on a vendor page is left out; a retired model is removed, not
// marked. The quarterly re-check is an edit to this file only.
//
// `size` is this guide's classification, based on how the vendor itself
// describes the option (quoted in the PR that added or changed the entry):
//   small    — the vendor calls it its fastest or lightest option
//   everyday — the vendor pitches it for everyday or general work
//   large    — the vendor pitches it for complex, difficult or hardest work
//   other    — a setting or mode rather than a size: a thinking level, an
//              automatic picker, a study or search mode

export type Vendor = 'Claude' | 'ChatGPT' | 'Gemini' | 'Copilot';
export type Size = 'small' | 'everyday' | 'large' | 'other';
/** yes: included. limited: included with tighter limits or only some of the time. no: paid plans only. unclear: the vendor's page does not say. */
export type FreePlan = 'yes' | 'limited' | 'no' | 'unclear';
/** yes: every personal paid plan. some: only some paid plans (or at extra cost). unclear: the vendor's page does not say. */
export type PaidPlan = 'yes' | 'some' | 'no' | 'unclear';

export interface AiModel {
  vendor: Vendor;
  /** As the app's menu shows it. */
  name: string;
  size: Size;
  /** A "thinking" level or mode: the app takes longer to work through the problem first. */
  thinking?: boolean;
  freePlan: FreePlan;
  paidPlan: PaidPlan;
  /** One line: when to pick it. */
  pickWhen: string;
  /** The vendor's own page the facts were read from. */
  source: string;
  /** ISO date the source was read. */
  checked: string;
}

export const VENDORS: readonly Vendor[] = ['ChatGPT', 'Gemini', 'Copilot', 'Claude'];

/** The domains that count as "the vendor's own site" for each vendor. */
export const VENDOR_DOMAINS: Record<Vendor, readonly string[]> = {
  Claude: ['anthropic.com', 'claude.com'],
  ChatGPT: ['openai.com'],
  Gemini: ['google.com'],
  Copilot: ['microsoft.com'],
};

const CHECKED = '2026-11-24';

const OPENAI = 'https://help.openai.com/en/articles/11909943-gpt-6-models-and-usage';
const GEMINI = 'https://support.google.com/gemini/answer/18648722?hl=en';
const COPILOT = 'https://support.microsoft.com/en-us/microsoft-copilot/conversation-modes-in-microsoft-copilot';

export const AI_MODELS: readonly AiModel[] = [
  // ChatGPT: the menu is a thinking slider (Instant, Medium, High, Extra High,
  // Pro) under "Latest" (or "GPT-6" / "GPT-6.2"), plus a separate GPT-5.6 Sol
  // option. Free and Go get Instant and Think; Medium and High start at Plus; Extra
  // High and Pro need Pro, Business or Enterprise.
  // Medium comes before Think so a paid reader is offered Medium first.
  {
    vendor: 'ChatGPT', name: 'Instant', size: 'everyday', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Most everyday questions, rewrites and short drafts.',
    source: OPENAI, checked: CHECKED,
  },
  {
    vendor: 'ChatGPT', name: 'Medium', size: 'other', thinking: true, freePlan: 'no', paidPlan: 'some',
    pickWhen: 'A problem with several steps, numbers or a plan to work out.',
    source: OPENAI, checked: CHECKED,
  },
  {
    vendor: 'ChatGPT', name: 'High', size: 'other', thinking: true, freePlan: 'no', paidPlan: 'some',
    pickWhen: 'When Medium gave a shallow or wrong answer and you can wait longer.',
    source: OPENAI, checked: CHECKED,
  },
  {
    vendor: 'ChatGPT', name: 'Extra High', size: 'other', thinking: true, freePlan: 'no', paidPlan: 'some',
    pickWhen: 'Rarely: the hardest problems, when High was not enough.',
    source: OPENAI, checked: CHECKED,
  },
  {
    vendor: 'ChatGPT', name: 'Pro', size: 'large', freePlan: 'no', paidPlan: 'some',
    pickWhen: 'Difficult, long-running work on the plans that include it.',
    source: OPENAI, checked: CHECKED,
  },
  {
    vendor: 'ChatGPT', name: 'GPT-5.6 Sol', size: 'large', freePlan: 'no', paidPlan: 'some',
    pickWhen: 'Only if you want to stay on the older GPT-5.6 family for complex work.',
    source: OPENAI, checked: CHECKED,
  },
  {
    vendor: 'ChatGPT', name: 'Think', size: 'other', thinking: true, freePlan: 'yes', paidPlan: 'some',
    pickWhen: 'On the Free or Go plan, when a question has several steps or numbers.',
    source: OPENAI, checked: CHECKED,
  },

  // Gemini: Auto, then three models. Thinking level (Low, Medium, High) is a
  // separate choice once you pick a model yourself.
  {
    vendor: 'Gemini', name: 'Auto', size: 'other', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Leave it here unless the answer is wrong or shallow; it picks for you.',
    source: GEMINI, checked: CHECKED,
  },
  {
    vendor: 'Gemini', name: 'Hydrogen', size: 'everyday', freePlan: 'limited', paidPlan: 'yes',
    pickWhen: 'Everyday questions, writing and summaries.',
    source: GEMINI, checked: CHECKED,
  },
  {
    vendor: 'Gemini', name: 'Neon', size: 'large', freePlan: 'no', paidPlan: 'some',
    pickWhen: 'Deeper analysis and complex, multi-step work.',
    source: GEMINI, checked: CHECKED,
  },
  {
    vendor: 'Gemini', name: 'Carbon', size: 'large', freePlan: 'no', paidPlan: 'some',
    pickWhen: 'The hardest long problems and advanced coding, on the top plan.',
    source: GEMINI, checked: CHECKED,
  },

  // Copilot (personal Microsoft account): conversation modes.
  {
    vendor: 'Copilot', name: 'Quick response', size: 'small', freePlan: 'unclear', paidPlan: 'unclear',
    pickWhen: 'A simple question where you want the answer straight away.',
    source: COPILOT, checked: CHECKED,
  },
  {
    vendor: 'Copilot', name: 'Smart', size: 'everyday', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Most things: it answers quickly or thinks longer as the task needs.',
    source: COPILOT, checked: CHECKED,
  },
  {
    vendor: 'Copilot', name: 'Think Deeper', size: 'other', thinking: true, freePlan: 'unclear', paidPlan: 'unclear',
    pickWhen: 'A decision or problem with several sides to weigh.',
    source: COPILOT, checked: CHECKED,
  },
  {
    vendor: 'Copilot', name: 'Study and learn', size: 'other', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Learning a topic: it explains and quizzes you rather than handing over the answer.',
    source: COPILOT, checked: CHECKED,
  },
  {
    vendor: 'Copilot', name: 'Search', size: 'other', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Current events and facts you want checked against the web.',
    source: COPILOT, checked: CHECKED,
  },

  // Claude: four current models. Effort is a setting in the same menu. Thinking
  // cannot be turned off on these four; only older models show the switch. "More models" holds older versions, not listed here.
  {
    vendor: 'Claude', name: 'Haiku 5.5', size: 'small', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Quick, simple jobs: a short answer, a summary, a tidy-up.',
    source: 'https://www.anthropic.com/claude/haiku', checked: CHECKED,
  },
  {
    vendor: 'Claude', name: 'Sonnet 5.5', size: 'everyday', freePlan: 'yes', paidPlan: 'yes',
    pickWhen: 'Most everyday work: writing, documents, analysis and code.',
    source: 'https://www.anthropic.com/claude/sonnet', checked: CHECKED,
  },
  {
    vendor: 'Claude', name: 'Opus 5.5', size: 'large', freePlan: 'no', paidPlan: 'yes',
    pickWhen: 'Complex work: long documents, careful analysis, bigger coding jobs.',
    source: 'https://www.anthropic.com/claude/opus', checked: CHECKED,
  },
  {
    vendor: 'Claude', name: 'Fable 5.2', size: 'large', freePlan: 'no', paidPlan: 'some',
    pickWhen: 'The hardest technical problems, on plans that include it.',
    source: 'https://www.anthropic.com/claude/fable', checked: CHECKED,
  },
];
