// Rounds for the "Spot the mistake" game on /ai-guides/when-ai-is-wrong/.
//
// Every round here is an ILLUSTRATION: written by hand to show a real kind of
// mistake, not copied from any AI tool. None names a tool or vendor as having
// produced its answer, and the page says so above the first round. People are
// placeholders (PERSON-1); no real personal data.
//
// The `real` kind (an actual output, with the tool and the date) is reserved
// for cohort examples later and is unused now.

/** The five kinds of mistake the guide teaches, in the order the page covers them. */
export const MISTAKE_TYPES = [
  { id: 'invented', label: 'Invented numbers or facts', anchor: 'invented-numbers-or-facts' },
  { id: 'dropped', label: 'Dropped rows', anchor: 'dropped-rows' },
  { id: 'unread', label: "Summaries of things it didn't read", anchor: 'summaries-of-things-it-didnt-read' },
  { id: 'sources', label: 'Made-up sources', anchor: 'made-up-sources' },
  { id: 'arithmetic', label: 'Wrong arithmetic', anchor: 'wrong-arithmetic' },
] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number]['id'];

/** What the reader compares the answer against: a short table or a short passage. */
export type RoundSource =
  | { kind: 'table'; caption: string; headers: string[]; rows: string[][] }
  | { kind: 'passage'; caption: string; paragraphs: string[] };

/** One tappable piece of the answer. Exactly one per round has `wrong: true`. */
export interface AnswerPart {
  text: string;
  wrong?: true;
}

interface RoundBase {
  id: string;
  type: MistakeType;
  /** What was asked, in the reader's words. */
  ask: string;
  source: RoundSource;
  /** The answer, split into the parts the reader can tap. */
  parts: AnswerPart[];
  /** Shown after the right tap: what is wrong with that part. */
  explanation: string;
  /** Shown after the right tap: the quick check that catches it. */
  check: string;
}

/** Written by hand to show a kind of mistake. Never names a tool. */
export interface IllustrationRound extends RoundBase {
  kind: 'illustration';
  tool?: never;
  date?: never;
}

/** Reserved: a real output from a named tool on a given date. Unused for now. */
export interface RealRound extends RoundBase {
  kind: 'real';
  tool: string;
  /** ISO date the output was produced, e.g. 2027-01-15. */
  date: string;
}

export type MistakeRound = IllustrationRound | RealRound;

export const MISTAKE_ROUNDS: MistakeRound[] = [
  {
    id: 'hall-deposit',
    kind: 'illustration',
    type: 'invented',
    ask: 'Using our hall booking policy: if I cancel, do I get my deposit back?',
    source: {
      kind: 'passage',
      caption: 'Community hall booking policy',
      paragraphs: [
        'A booking is confirmed when we receive the booking form and a $50 deposit.',
        'If you cancel at least 7 days before your booking, we refund the deposit in full. If you cancel later than that, the deposit is not refunded.',
        'The hall must be left clean and locked. Keys go back to PERSON-1 by noon the next day.',
      ],
    },
    parts: [
      { text: 'The deposit is $50.' },
      { text: 'Cancel at least 7 days before and you get all of it back.' },
      { text: 'Cancel later than that and you still get half of it back.', wrong: true },
      { text: 'Return the keys to PERSON-1 by noon the next day.' },
    ],
    explanation:
      'The policy says a late cancellation is not refunded at all. "Half back" is not in the text anywhere: the answer made it up, and said it just as confidently as the true parts.',
    check: 'For each claim, put your finger on the sentence in the source that says it. If you can\'t find the sentence, treat the claim as invented.',
  },
  {
    id: 'march-donations',
    kind: 'illustration',
    type: 'dropped',
    ask: 'From this donations sheet, list everyone who gave in March.',
    source: {
      kind: 'table',
      caption: 'Donations sheet',
      headers: ['Donor', 'Month', 'Amount'],
      rows: [
        ['PERSON-1', 'March', '$40'],
        ['PERSON-2', 'February', '$20'],
        ['PERSON-3', 'March', '$25'],
        ['PERSON-4', 'April', '$75'],
        ['PERSON-5', 'March', '$60'],
        ['PERSON-6', 'March', '$100'],
        ['PERSON-7', 'February', '$30'],
      ],
    },
    parts: [
      { text: 'PERSON-1: $40' },
      { text: 'PERSON-3: $25' },
      { text: 'PERSON-6: $100' },
      { text: "That's everyone who gave in March.", wrong: true },
    ],
    explanation:
      'Four rows say March, but the list has three names. PERSON-5 ($60) was dropped, and nothing in the answer says a row was skipped. Every name on the list is right, which is what makes it easy to miss.',
    check: 'Count the matching rows yourself (filter or sort the sheet by month) and compare that count with the number of names in the answer.',
  },
  {
    id: 'committee-notes',
    kind: 'illustration',
    type: 'unread',
    ask: 'Summarise these committee meeting notes in a few lines.',
    source: {
      kind: 'passage',
      caption: 'Committee meeting notes',
      paragraphs: [
        'The bake sale raised $412. PERSON-2 thanked everyone who baked.',
        'We discussed moving the weekend class to the larger hall on Oak Street. Most members liked the idea, but the cost is not known yet.',
        'Decision: postponed to next month. PERSON-3 will get two more quotes before then.',
        'Next meeting: 3 March, 7 pm.',
      ],
    },
    parts: [
      { text: 'The bake sale raised $412.' },
      { text: 'The committee agreed to move the weekend class to the Oak Street hall.', wrong: true },
      { text: 'PERSON-3 will get two more quotes.' },
      { text: 'Next meeting: 3 March, 7 pm.' },
    ],
    explanation:
      'The notes say the decision was postponed. The summary turned "most members liked the idea" into "the committee agreed", as if it had stopped reading before the line that says Decision.',
    check: 'For each line of a summary, find the line in the original it came from. Read the decisions and the end of the document yourself; a missed decision changes what the summary means.',
  },
  {
    id: 'handbook-checks',
    kind: 'illustration',
    type: 'sources',
    ask: 'Where does our volunteer handbook say people need a background check? Give me the section.',
    source: {
      kind: 'table',
      caption: 'Volunteer handbook: contents',
      headers: ['Section', 'Title', 'Page'],
      rows: [
        ['1', 'Welcome', '1'],
        ['2', 'Shifts and sign-up', '3'],
        ['3', 'Safety and first aid', '5'],
        ['4', 'Working with children', '8'],
        ['4.1', 'Background checks', '8'],
        ['5', 'Expenses', '11'],
      ],
    },
    parts: [
      { text: 'Anyone working with children needs a background check before their first shift.' },
      { text: 'It is in section 4.1, "Background checks", on page 8.' },
      { text: "It is also required by the city's Volunteer Safety Act of 2019.", wrong: true },
    ],
    explanation:
      'The handbook names no law, and nothing in the question gave one. The "Volunteer Safety Act of 2019" has the shape of a real source, a name and a year, but nothing shows it exists.',
    check: 'Open every source an answer names. If you can\'t find it in the document or with a search, treat it as made up, and take it out before you pass the answer on.',
  },
  {
    id: 'volunteer-hours',
    kind: 'illustration',
    type: 'arithmetic',
    ask: 'How many volunteer hours did we have this month, in total?',
    source: {
      kind: 'table',
      caption: 'Volunteer rota: hours this month',
      headers: ['Volunteer', 'Hours'],
      rows: [
        ['PERSON-1', '6'],
        ['PERSON-2', '4'],
        ['PERSON-3', '8'],
        ['PERSON-4', '3'],
        ['PERSON-5', '5'],
        ['PERSON-6', '7'],
      ],
    },
    parts: [
      { text: 'Six people volunteered this month.' },
      { text: 'PERSON-3 gave the most time: 8 hours.' },
      { text: 'Together that comes to 31 hours.', wrong: true },
    ],
    explanation: '6 + 4 + 8 + 3 + 5 + 7 is 33, not 31. A total that is close to right looks right, so nobody adds it up again.',
    check: 'Redo any total that matters with a calculator or the sheet\'s own SUM. Asking the same chat "are you sure?" is not a check.',
  },
];
