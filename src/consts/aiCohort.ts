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
  /** The public sign-up page, outside /ai-cohort/ so it's indexed. */
  training: '/ai-training/',
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
      { label: "What's safe to paste", href: COHORT_LINKS.neverPaste },
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


// The public /ai-training/ page: three tracks, each reserved with a $25
// deposit. A track launches at `launchAt` deposits and takes the next open
// slot, so tracks run back to back. Live counts come from GET TRACKS_ENDPOINT
// (the ai-quiz-intake service reads Stripe; see docs/ai-quiz-setup.md).
export const TRAINING = {
  deposit: '$25',
  launchAt: 5,
  maxSeats: 8,
  sessionLength: '90 minutes',
  slots: [
    { when: 'Mondays, January 11 – February 1, 2027', note: '6:30–8:00pm Pacific, for a track that launches by Monday, December 21' },
    { when: 'After Ramadan, late March 2027', note: 'for the next track to launch' },
    { when: 'May 2027', note: 'for the track after that' },
  ],
} as const;

/** Same-origin in production; dev builds have no backend, so the counters stay hidden. */
export const TRACKS_ENDPOINT: string =
  import.meta.env.PUBLIC_TRACKS_ENDPOINT ?? (import.meta.env.PROD ? '/api/ai-quiz/tracks' : '');

export interface Track {
  id: 'everyday' | 'connect' | 'build';
  name: string;
  price: string;
  /** $25 deposit Stripe payment link. */
  depositUrl: string;
  tagline: string;
  forYou: string[];
  sessions: { title: string; outcome: string }[];
  end: string;
  needs: string;
}

export const TRACKS: Track[] = [
  {
    id: 'everyday',
    name: 'Everyday AI',
    price: '$79',
    depositUrl: 'https://buy.stripe.com/eVq5kE5rI9W8cztc0zdAk03',
    tagline: 'AI for one task you already do every week. No code.',
    forYou: [
      'You use AI a little, or not at all yet.',
      'You lose time every week to a report, a spreadsheet, or the same emails.',
      "You're job hunting or returning to work, and want a skill you can name to employers.",
    ],
    sessions: SESSIONS.map((s) => ({ title: s.title, outcome: s.outcome })),
    end: 'One real weekly task that AI handles, a way to check its work, and a write-up so you can keep it running.',
    needs: "A laptop and any AI account (Gemini, ChatGPT, Copilot or Claude). Free is enough. No file of your own? I'll bring realistic samples for your field.",
  },
  {
    id: 'connect',
    name: 'Connect',
    price: '$99',
    depositUrl: 'https://buy.stripe.com/00w5kE9HYb0c0QL5CbdAk01',
    tagline: 'AI inside your email and calendar. No code.',
    forYou: [
      'You live in Gmail or Outlook, and replies and meeting requests eat your day.',
      'Your colleagues use Copilot or Gemini to draft replies and schedule meetings, and you want to catch up.',
      'You want routine steps done for you, with you approving what goes out.',
    ],
    sessions: [
      {
        title: 'Your accounts and the guardrails',
        outcome: 'Gemini (Google) or Copilot (Microsoft) turned on in your own account, with clear limits on what it can see and do.',
      },
      { title: 'Email', outcome: 'Drafted replies and thread summaries that you approve before anything is sent.' },
      { title: 'Calendar and meetings', outcome: 'Meeting requests, scheduling and follow-up notes handled by rules you set.' },
      {
        title: 'Chain it together, then demo',
        outcome: 'One no-code automation that runs your task end to end, with a human check where it matters.',
      },
    ],
    end: 'Your inbox and calendar doing more of the routine work, and a write-up of how it runs.',
    needs: 'A Google or Microsoft 365 account you use for work. Your employer may need to allow its AI features. On a personal account, Gemini in Gmail and Copilot in Outlook need a paid plan, from about $5 to $10 a month.',
  },
  {
    id: 'build',
    name: 'Build',
    price: '$149',
    depositUrl: 'https://buy.stripe.com/6oU4gA8DU2tG6b5aWvdAk02',
    tagline: 'Code with AI and build your own agents.',
    forYou: [
      'You want to get back into coding, or start, with AI doing the heavy lifting.',
      "You want automations that go further than your email's built-in AI.",
      "You're comfortable installing software. Coding experience helps but isn't required.",
    ],
    sessions: [
      {
        title: 'Code with AI',
        outcome: 'Something you built that runs, and the habits that stop AI-written code from quietly being wrong.',
      },
      { title: 'Connect AI to your tools', outcome: 'AI reading and acting on your email, Sheets, calendar or files, with limits on what it can touch.' },
      { title: 'Agents: multi-step work', outcome: 'An agent that gathers, decides and acts, and stops for your approval before anything goes out.' },
      {
        title: 'Run it for real, then demo',
        outcome: 'Your project running on a schedule or at a button press, with keys and costs kept safe.',
      },
    ],
    end: 'One working tool or agent you built yourself, and the judgement to know when to trust it.',
    needs: 'A laptop you can install software on. You may need a paid AI plan (about $20 a month) or a few dollars of API credit.',
  },
];

/** Every track includes these. */
export const INCLUDED = [
  `4 live sessions, ${TRAINING.sessionLength} each, on Google Meet`,
  `Up to ${TRAINING.maxSeats} people, so your own work gets looked at`,
  'Hands-on time on your own task in every session',
  'A private WhatsApp group with your cohort, for questions between sessions',
  'Weekly office hours',
  'Recordings of the teaching part of each session',
  'Templates and handouts to keep',
  'A one-page write-up of your finished workflow',
  'A check-in about a month later, to see that it is still working',
];
