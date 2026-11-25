// Example chips and tap-to-add Check lines for the prompt builder.
// All three examples are constructed illustrations; people are placeholders (PERSON-1).
import type { PromptPreset } from '../../utils/promptBuilder';

/** From "Good Check lines to borrow" in src/content/ai-partials/prompt.md.
 *  A test keeps the two lists identical. */
export const CHECK_LINES: string[] = [
  'List anything you had to guess or assume.',
  "Tell me where each fact came from. If you aren't sure, say so.",
  "Don't do the arithmetic yourself. Give me the spreadsheet formula instead.",
  'Ask me up to three questions first if anything is unclear.',
  'Point out anything in my input that looks wrong or inconsistent.',
];

export const PROMPT_EXAMPLES: PromptPreset[] = [
  {
    id: 'weekly-report',
    label: 'Weekly report',
    situation: 'I do sales for a small flooring company and send the owner a short update every Friday. She reads it on her phone between site visits.',
    task: "Turn my rough notes into this week's update.",
    input: "Notes: PERSON-1 signed for the kitchen floor. PERSON-2 wants a second quote with the cheaper tile. No reply from PERSON-3 since the site visit. I need a decision on whether we can discount PERSON-2's job.",
    format: 'Under 120 words. Plain language, one short paragraph, then a line that starts "Needs a decision:".',
    check: "List anything you had to guess, and don't add details I didn't give you.",
  },
  {
    id: 'difficult-email',
    label: 'Reply to a difficult email',
    situation: 'I manage a small office. A client, PERSON-1, wrote an upset email saying an invoice was wrong. I want to keep the relationship.',
    task: "Draft a calm reply that acknowledges the problem and says what I'll do next.",
    input: "PERSON-1's email says the invoice charged for a service they cancelled last month. I checked: the cancellation arrived, but the invoice had already gone out. I will send a corrected invoice by Friday.",
    format: 'Under 150 words. Polite and direct, no excuses, and no promises beyond the corrected invoice.',
    check: "Point out anything in my input that looks wrong or inconsistent, and don't add details I didn't give you.",
  },
  {
    id: 'meeting-summary',
    label: 'Meeting summary',
    situation: 'I took notes at a committee meeting. People who missed it will read the summary on their phones.',
    task: 'Summarize the meeting into decisions, open questions and who does what.',
    input: 'Notes: PERSON-1 will send the venue deposit. We agreed to move the event to the second Saturday. Not decided: who brings the sound system. PERSON-2 will ask the venue about parking.',
    format: 'Three short headings: Decisions, Still open, Next steps (with names). Under 150 words.',
    check: "Tell me where each fact came from. If you aren't sure, say so.",
  },
];
