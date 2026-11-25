// "One weekly task, by profession" (/ai-guides/examples/, #78).
//
// Every card is a constructed illustration built from practice cases, not a
// participant's result. People are placeholders (PERSON-1). There are no
// time-saved figures: a page that teaches spotting invented numbers must not
// invent any. A test fails if card text pairs a number with hours, minutes
// saved or a percentage.
//
// Cards show the result, not the build: the task, the prompt, what you check,
// and how the week goes before and after. How to get the task working on a
// real file, and the repeatable version, are taught in the paid training.
//
// `participant` is reserved for real write-ups after cohort 1, each published
// only with that person's written OK. It is unset on every card until then.
import type { Field } from '../../utils/startHere';
import { PROMPT_FIELDS, type PromptParts, type PromptPreset } from '../../utils/promptBuilder';

export interface ExampleCard extends PromptParts {
  /** Stable id; also the preset id the builder is filled from. */
  id: string;
  /** One of the site's field values (src/utils/startHere.ts FIELDS). */
  field: Field;
  /** The filter button and card label: "I'm a…" */
  label: string;
  /** The weekly task in one sentence. */
  summary: string;
  /** What you check yourself before the result is used. */
  youCheck: string;
  /** How the task goes without AI. */
  before: string;
  /** How the task goes with the prompt and the check. */
  after: string;
  /** Reserved: a real write-up, published only with written permission. */
  participant?: { name: string; permissionDate: string };
}

export const EXAMPLE_CARDS: ExampleCard[] = [
  {
    id: 'teacher-note-home',
    field: 'teacher',
    label: 'Teacher',
    summary: "The Friday note home to families about the week in class and what's coming up.",
    situation:
      "I teach fourth grade. Every Friday I send families a short note about the week. Most parents read it on their phone, and some of them read English as a second language.",
    task: "Can you turn my notes into this week's note home?",
    input:
      "My notes: finished the fractions unit, quizzes come home Monday. Science museum trip next Thursday, permission slips due Tuesday. Please keep signing the reading log every night. Thank you to PERSON-1's family for the classroom plants.",
    format: 'Keep it under 150 words. Warm, short sentences, no school jargon. End with a short list of dates and what to bring.',
    check: "If you had to guess anything, like a date or a time I didn't give you, tell me. Don't add any events that aren't in my notes.",
    youCheck: 'Every date and deadline against the school calendar. Also make sure no child is named.',
    before:
      "Every Friday afternoon the note starts from a blank page. It's hard to keep it short and friendly, and now and then a deadline gets left out.",
    after:
      'You paste in your notes and get a draft in the usual shape. Once the dates are checked and a line or two sounds like you, it goes out.',
  },
  {
    id: 'bookkeeper-unmatched',
    field: 'bookkeeper',
    label: 'Bookkeeper',
    summary: "Turning the week's unmatched bank lines into one list of questions for the business owner.",
    situation:
      "I do the books for a few small businesses. Every week there are some bank lines that don't match a receipt or invoice, and I have to ask the owner what they were.",
    task: 'Write up the questions I need to send the owner, one per unmatched line.',
    input:
      "Here are the unmatched lines. I've swapped the names for placeholders. 3 Nov, card payment, HARDWARE-STORE-1, 84.20. 5 Nov, transfer out to PERSON-1, 400.00. 6 Nov, card payment, ONLINE-SHOP-1, 19.99, looks like a monthly subscription.",
    format: 'A numbered list the owner can answer with a word or a line each. Keep it friendly, no accounting terms.',
    check: "Copy every date and amount exactly as I gave it. Don't add anything up, and don't guess what a payment was for. Ask instead.",
    youCheck: 'Every date and amount on the list, line by line against the bank statement itself, before it goes to the owner.',
    before:
      'Each unmatched line becomes its own back-and-forth message, worded differently every week, and the answers trickle in.',
    after:
      'One list goes out at once, with the amounts already checked against the statement, and the owner can answer all of it in one reply.',
  },
  {
    id: 'office-admin-inbox',
    field: 'office-admin',
    label: 'Office admin',
    summary: 'Drafting replies to the routine questions that land in the shared inbox every week.',
    situation:
      'I run the front office at a community center. The shared inbox gets the same few questions every week: opening hours, booking a room, parking, canceling a class.',
    task: 'Draft a reply to each question below. Only use the facts in my office info.',
    input:
      'Office info: open Monday to Friday, 9 to 5, and Saturday mornings for classes only. Rooms are booked at the front desk and need a deposit. Free parking in the lot behind the building. Questions: PERSON-1 wants to know if they can book the hall on a Sunday. PERSON-2 is asking where to park for the Saturday class.',
    format: 'One short reply per question, under 80 words each. Friendly and plain.',
    check: "If my office info doesn't answer a question, say so. Don't guess. Also point out anything in what I gave you that doesn't add up.",
    youCheck: "Any question the AI said it couldn't answer, and every time and rule against the posted office information.",
    before:
      'The same answers get typed out by hand each time, and they drift. Two people on the desk give two different answers about the deposit.',
    after:
      "The replies all come from one sheet of office facts, so they match. Any question the facts don't cover comes back flagged for you to answer yourself.",
  },
  {
    id: 'volunteer-shift-reminder',
    field: 'volunteer-coordinator',
    label: 'Volunteer coordinator',
    summary: "Turning this week's sign-ups into a shift reminder and a list of the shifts that are still short.",
    situation:
      "I coordinate volunteers for a Saturday food pantry. Every Thursday I send a reminder to everyone on Saturday's shifts and ask for help where we're short.",
    task: 'Write the reminder and tell me which shifts are short.',
    input:
      'Shifts: setup needs 3 people, distribution needs 6, cleanup needs 2. Signed up so far: setup PERSON-1 and PERSON-2. Distribution PERSON-3, PERSON-4, PERSON-5, PERSON-6, PERSON-7. Cleanup: nobody yet.',
    format: 'A short message for the WhatsApp group, under 100 words. Then, separately, a list of which shifts are short and by how many.',
    check: "Show me your counting for each shift so I can check it. Don't add any names that aren't on my list.",
    youCheck: 'The short-shift list against the sign-up sheet itself, before you ask anyone for more help.',
    before:
      'The reminder gets written from scratch each week, and finding the gaps means scanning the sign-up sheet by eye.',
    after:
      'The reminder and the list of gaps come back together. You check the counts against the sheet, put the real names back if the message needs them, and post it.',
  },
  {
    id: 'job-seeker-cover-letter',
    field: 'job-seeker',
    label: 'Job seeker',
    summary: 'Rewriting the opening of your cover letter for each job you apply to this week.',
    situation:
      "I'm applying for office manager jobs. I have a general cover letter, but every posting asks for different things.",
    task: 'Rewrite the first paragraph of my cover letter for this posting. Only use experience I actually have.',
    input:
      'The posting asks for: scheduling for a busy team, handling vendor invoices, a calm phone manner. My experience: six years as a shift lead at a grocery store. I wrote the weekly staff schedule, checked supplier deliveries against their invoices, and took the calls at the service desk.',
    format: 'One paragraph, under 120 words. Plain and confident, no buzzwords.',
    check: "Don't claim any skill or result that isn't in my experience. Then list the parts of the posting my experience doesn't cover.",
    youCheck: "Every claim in the paragraph against what you've really done. If you couldn't say it out loud in an interview, take it out.",
    before:
      'The same general letter goes to every posting, or you start a new one from nothing each time.',
    after:
      'Each application opens with a paragraph written for that posting, and you know which requirements to be ready to talk about.',
  },
];

/** Every piece of card text a reader can see. */
export const cardText = (c: ExampleCard): string[] => [
  c.label, c.summary, ...PROMPT_FIELDS.map((f) => c[f]), c.youCheck, c.before, c.after,
];

/** A number paired with hours, minutes saved or a percentage: a time-saved claim. */
export const TIME_SAVED_FIGURE = /\d\s*(?:-\s*\d+\s*)?(?:hours?\b|hrs?\b|minutes?\s+saved|%|percent\b)/i;

/** The cards as presets for the PromptBuilder below them. */
export const toPresets = (cards: readonly ExampleCard[]): PromptPreset[] =>
  cards.map(({ id, label, situation, task, input, format, check }) => ({ id, label, situation, task, input, format, check }));

/**
 * Which cards show for a chosen field: only that field's card when there is
 * one, otherwise all of them (no choice, or a field with no card yet, such as
 * the hub's "other").
 */
export function visibleCardIds(cards: readonly ExampleCard[], field: string | null): string[] {
  const match = cards.filter((c) => c.field === field);
  return (match.length ? match : cards).map((c) => c.id);
}
