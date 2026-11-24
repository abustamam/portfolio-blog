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
