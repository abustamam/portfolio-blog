// Cohort 1 facts shared by the /ai-cohort/ pages. Update here, not in each page.
// Private things stay out: the Meet link goes in the calendar invite and the
// participants' WhatsApp group, and recordings live in a Drive folder shared
// only with participants (the link below is useless to anyone else).

export const COHORT = {
  time: '6:30–8:00pm Pacific',
  platform: 'Google Meet',
  intakeDue: 'Monday, January 4, 2027',
  refundUntil: 'the end of session 1',
  checkIn: 'around March 3, 2027',
  /** Drive folder shared only with participants' email addresses. */
  recordingsUrl: 'https://drive.google.com/drive/folders/1btjINh0oiCKC1kjEtZ0FBFJNupz-M2qN',
  /** Opens Google's "Make a copy" for the hand-off template (needs access via the participants' folder). */
  price: '$79',
  seats: 8,
  /** Stripe payment link; it stops itself after 8 payments and points to the waitlist. */
  payUrl: 'https://buy.stripe.com/4gM14o5rIfgsarlfcLdAk00',
  handoffCopyUrl: 'https://docs.google.com/document/d/15kLOVYA2NUcZx9cygiG1EEe0xXvSbxcXV-Xp257YW1c/copy',
} as const;

export interface CohortSession {
  n: number;
  date: string;
  title: string;
  /** What each person leaves with. */
  outcome: string;
  /** The one thing to try before the next session. */
  tryThis: string;
  handouts: { label: string; href: string }[];
  /** Fill in after the session: a link into the recordings folder. */
  recordingUrl?: string;
}

export const COHORT_LINKS = {
  home: '/ai-cohort/',
  intake: '/ai-cohort/intake/',
  /** Not in the cohort nav: it's for people who didn't get a seat. */
  waitlist: '/ai-cohort/waitlist/',
  prompt: '/ai-cohort/prompt/',
  neverPaste: '/ai-cohort/never-paste/',
  handoff: '/ai-cohort/hand-off/',
  /** Public sign-up pages, outside /ai-cohort/ so they're indexed. */
  signup: '/ai-cohort-1/',
  next: '/ai-cohort-2/',
} as const;

export const SESSIONS: CohortSession[] = [
  {
    n: 1,
    date: 'Monday, January 11',
    title: 'Your task and the habits',
    outcome: 'Your task written down, a prompt that works on it, and the list of what never to paste.',
    tryThis: "Run your prompt once on this week's real task, made safe first, and note one place it was wrong.",
    handouts: [
      { label: 'The five-part prompt', href: COHORT_LINKS.prompt },
      { label: 'Never paste these', href: COHORT_LINKS.neverPaste },
    ],
  },
  {
    n: 2,
    date: 'Monday, January 18',
    title: 'Your files',
    outcome: 'Your task run once on your own file, with a check you trust.',
    tryThis: "Run it again on next week's file, and time it against doing it by hand.",
    handouts: [{ label: 'Making a file safe', href: `${COHORT_LINKS.neverPaste}#make-a-file-safe-in-three-steps` }],
  },
  {
    n: 3,
    date: 'Monday, January 25',
    title: 'Make it repeatable',
    outcome: 'A version you can rerun next week without starting over.',
    tryThis: 'Use the repeatable version for your real weekly task once.',
    handouts: [],
  },
  {
    n: 4,
    date: 'Monday, February 1',
    title: 'Demo and hand-off',
    outcome: 'A short demo to the group and a one-page write-up of how your task now works.',
    tryThis: "Keep using it. I'll check in about a month later to see whether it's still working.",
    handouts: [{ label: 'The hand-off template', href: COHORT_LINKS.handoff }],
  },
];

// Cohort 2: two options, each runs only if it gets enough $25 deposits by the
// deadline. Count deposits on each Stripe link's completed payments.
export const COHORT2 = {
  deposit: '$25',
  minDeposits: 5,
  deadline: 'Friday, January 15, 2027',
  starts: 'late February 2027',
  format: '4 weekly evening sessions, 90 minutes each, on Google Meet',
} as const;

export interface Cohort2Option {
  id: 'connect' | 'build';
  name: string;
  price: string;
  /** $25 deposit Stripe payment link. */
  depositUrl: string;
  forWho: string;
  needs: string;
  sessions: { title: string; outcome: string }[];
  end: string;
}

export const COHORT2_OPTIONS: Cohort2Option[] = [
  {
    id: 'connect',
    name: 'Connect',
    price: '$99',
    depositUrl: 'https://buy.stripe.com/00w5kE9HYb0c0QL5CbdAk01',
    forWho:
      "AI working inside the tools you already use: email, calendar, Sheets and documents. Drafted replies, meeting requests handled, routine steps done for you. No code.",
    needs: 'A Google or Microsoft 365 account you use for work. Your employer may need to allow its AI features.',
    sessions: [
      {
        title: 'Your accounts and the guardrails',
        outcome:
          "Gemini (Google) or Copilot (Microsoft) turned on in your own account, and clear limits on what it can see and do.",
      },
      {
        title: 'Email',
        outcome: 'Drafted replies and thread summaries that you approve before anything is sent.',
      },
      {
        title: 'Calendar and meetings',
        outcome: 'Meeting requests, scheduling and follow-up notes handled by rules you set.',
      },
      {
        title: 'Chain it together, then demo',
        outcome: 'One no-code automation that runs your task end to end, with a human check where it matters.',
      },
    ],
    end: 'Your inbox and calendar doing more of the routine work, and a write-up of how it runs.',
  },
  {
    id: 'build',
    name: 'Build',
    price: '$149',
    depositUrl: 'https://buy.stripe.com/6oU4gA8DU2tG6b5aWvdAk02',
    forWho:
      'Coding with AI and building agents: small tools and automations you make yourself. Coding experience helps but isn\'t required.',
    needs:
      "A laptop you can install software on. You may need a paid AI plan (about $20 a month) or a few dollars of API credit.",
    sessions: [
      {
        title: 'Code with AI',
        outcome:
          'Something you built that runs, such as a script that cleans a spreadsheet, and the habits that stop AI code from quietly being wrong.',
      },
      {
        title: 'Connect AI to your tools',
        outcome: 'AI reading and acting on your email, Sheets, calendar or files, with limits on what it can touch.',
      },
      {
        title: 'Agents: multi-step work',
        outcome: 'An agent that gathers, decides and acts, and stops for your approval before anything goes out.',
      },
      {
        title: 'Run it for real, then demo',
        outcome:
          'Your project running on a schedule or at a button press, with keys and costs kept safe, and local vs cloud models weighed.',
      },
    ],
    end: 'One working tool or automation you built yourself, and the judgement to know when to trust it.',
  },
];
