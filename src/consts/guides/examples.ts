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
    summary: "Write the Friday note home to families about the class's week and what is coming up.",
    situation:
      'I teach a fourth-grade class. Every Friday I send families a short note about the week. Most parents read it on their phones, and some read English as a second language.',
    task: "Turn my notes into this week's note home.",
    input:
      "Notes: finished the fractions unit, quizzes come home Monday. Science museum trip next Thursday, permission slips due Tuesday. Please keep signing the reading log each night. Thank you to PERSON-1's family for the classroom plants.",
    format: 'Under 150 words. Warm, short sentences, no school jargon. End with a short list of dates and things to bring.',
    check: "List anything you had to guess, like a date or time I didn't give you. Don't add events that aren't in my notes.",
    youCheck: 'Every date and deadline against the school calendar, and that no child is named.',
    before:
      'The note is rewritten from a blank page every Friday afternoon. Keeping it short and friendly is hard, and a deadline sometimes gets left out.',
    after:
      'You paste your bullet notes and get a draft in the usual shape. You check the dates, change a line so it sounds like you, and send it.',
  },
  {
    id: 'bookkeeper-unmatched',
    field: 'bookkeeper',
    label: 'Bookkeeper',
    summary: "Turn the week's unmatched bank lines into one clear list of questions for the business owner.",
    situation:
      "I do the books for a few small businesses. Each week some bank lines don't match a receipt or an invoice, and I have to ask the owner what they were.",
    task: 'Write the questions I need to send the owner, one for each unmatched line.',
    input:
      'Unmatched lines, made safe: 3 Nov, card payment, HARDWARE-STORE-1, 84.20. 5 Nov, transfer out to PERSON-1, 400.00. 6 Nov, card payment, ONLINE-SHOP-1, 19.99, looks like a monthly subscription.',
    format: 'A numbered list the owner can answer in a word or a line each. Friendly, with no accounting terms.',
    check: "Copy each date and amount exactly as I gave it. Don't add up anything or guess what a payment was for; ask instead.",
    youCheck: 'Every date and amount in the list against the bank statement itself, line by line, before it goes to the owner.',
    before:
      'Each unmatched line turns into its own back-and-forth message, worded differently every week, and the answers trickle in.',
    after:
      'One clear list goes out at once, with the amounts checked against the statement. The owner answers everything in a single reply.',
  },
  {
    id: 'office-admin-inbox',
    field: 'office-admin',
    label: 'Office admin',
    summary: 'Draft replies to the same routine questions that land in the shared inbox every week.',
    situation:
      'I run the front office at a community center. The shared inbox gets the same few questions every week: opening hours, booking a room, parking, cancelling a class.',
    task: 'Draft a reply to each question below, using only the facts in my office information.',
    input:
      'Office information: open Monday to Friday, 9 to 5, and Saturday mornings for classes only. Rooms are booked at the front desk and need a deposit. Free parking in the lot behind the building. Questions: PERSON-1 asks if they can book the hall on a Sunday. PERSON-2 asks where to park for the Saturday class.',
    format: 'One short reply per question, under 80 words each. Friendly and plain.',
    check: "If my office information doesn't answer a question, say so instead of guessing. Point out anything in my input that looks inconsistent.",
    youCheck: 'Any reply the AI said it could not answer, and every time and rule against the posted office information.',
    before:
      'The same answers are typed again by hand, and they drift: two people on the desk give two different answers about the deposit.',
    after:
      'Replies come from one sheet of office facts, so they match. The questions the facts do not cover come back flagged for you to answer yourself.',
  },
  {
    id: 'volunteer-shift-reminder',
    field: 'volunteer-coordinator',
    label: 'Volunteer coordinator',
    summary: "Turn this week's sign-ups into a shift reminder and a list of the shifts that are still short.",
    situation:
      "I coordinate volunteers for a Saturday food pantry. Every Thursday I send a reminder to everyone on Saturday's shifts and ask for help where we are short.",
    task: 'Write the reminder message and tell me which shifts are short.',
    input:
      'Shifts: setup needs three people, distribution needs six, cleanup needs two. Signed up: setup PERSON-1 and PERSON-2. Distribution PERSON-3, PERSON-4, PERSON-5, PERSON-6 and PERSON-7. Cleanup: nobody yet.',
    format: 'A short group message for WhatsApp, under 100 words. Then, separately, a list of the shifts that are short and by how many.',
    check: "Show your counting for each shift so I can check it. Don't add any names that aren't in my list.",
    youCheck: 'The short-shift list against the sign-up sheet itself, before asking anyone for more help.',
    before:
      'The reminder is written from scratch each week, and finding the gaps means scanning the sign-up sheet by eye.',
    after:
      'The reminder and the list of gaps come back together. You check the counts against the sheet and post the message.',
  },
  {
    id: 'job-seeker-cover-letter',
    field: 'job-seeker',
    label: 'Job seeker',
    summary: 'Rewrite the opening of your cover letter for each job you apply to this week.',
    situation:
      'I am applying for office manager jobs. I have a general cover letter, but each posting asks for different things.',
    task: 'Rewrite the first paragraph of my cover letter for this posting, using only experience I actually have.',
    input:
      'The posting asks for: scheduling for a busy team, handling vendor invoices, a calm phone manner. My experience: ran the front desk at a busy dental office, kept the appointment book for several dentists, sent invoices to the billing service.',
    format: 'One paragraph, under 120 words. Plain and confident, no buzzwords.',
    check: "Don't claim any skill or result that isn't in my experience. List which parts of the posting my experience doesn't cover.",
    youCheck: "Every claim in the paragraph against what you have really done. Anything you couldn't say out loud in an interview comes out.",
    before:
      'The same general letter goes to every posting, or a new one is started from nothing each time.',
    after:
      'Each application opens with a paragraph that answers that posting, and you know which requirements to be ready to talk about.',
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
