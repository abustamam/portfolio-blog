// Presets and tap-to-add Check lines for the prompt builder on /ai-guides/job-search/.
// One invented person and one invented posting run through all four, and the
// page labels them as an illustration. Nobody real is named; the hiring manager
// is a placeholder (PERSON-1). The person's own name and contact details are
// left out on purpose: the page tells readers to redact them from a copy of
// their résumé before they upload it.
import type { PromptPreset } from '../../utils/promptBuilder';

/** Where most people start: upload the résumé file and type this. The page shows it first. */
export const MAKE_IT_BETTER = 'Make my résumé better.';

/** The posting, as the reader would paste it: only the lines that matter. */
const POSTING =
  'The posting (key lines): Greet patients and run the front desk. Schedule appointments in a shared calendar. Answer phones and email. Keep patient records accurate. Experience with Google Sheets or similar is a plus.';

/** Before there is a posting: job titles to search for, and the words postings use. The reader searches the boards. */
export const FIND_TITLES: PromptPreset = {
  id: 'find-titles',
  label: 'Find job titles to search for',
  situation:
    'I am going back to work after five years at home with my children. I want an office job, but I am not sure which job titles to type into the job boards.',
  task:
    'Suggest six to eight job titles I could search for, based on my experience below. For each title, list the keywords that postings for that title often use. Do not look up or list open jobs. I will search the job boards myself.',
  input:
    'My experience: office assistant at a dental practice from 2015 to 2019, answering phones, booking appointments and keeping patient files in order. Volunteer coordinator at a weekend school since 2021, where I build the monthly volunteer rota in Google Sheets for about 30 families.',
  format:
    'A table with three columns: job title, keywords postings use, and the part of my experience that fits it.',
  check:
    'After the table, say which titles are a stretch for me and why.',
};

export const TAILOR_RESUME: PromptPreset = {
  id: 'tailor-resume',
  label: 'Tailor my résumé',
  situation:
    'I am applying for one job: front desk coordinator at a community health clinic. I am going back to work after five years at home with my children. My résumé is attached. It is accurate, and I redacted my contact details and references from it.',
  task:
    'Make my résumé better for this one posting. Reorder and reword what is already there so the parts that match the posting come first. Do not add any experience, skill, qualification, number or date that is not in my résumé.',
  input: POSTING,
  format:
    'Plain text, one page: a three-line summary at the top, then each role with three or four bullet points. Keep my dates and job titles exactly as they are.',
  check:
    'After the résumé, list anything in it that is not in my original: a skill, number, date, job title or claim. If there is nothing, say so.',
};

export const COVER_LETTER: PromptPreset = {
  id: 'cover-letter',
  label: 'Write a cover letter',
  situation:
    'I am applying for front desk coordinator at a community health clinic. The hiring manager is PERSON-1. I want a cover letter that sounds like me, not like a template.',
  task:
    'Arrange my notes below into a short cover letter. Use my facts and my words wherever you can. Your job is the order and the structure, not new content.',
  input:
    'Why this job: I like being the first person people talk to, and the clinic is close to my home. What I bring: four years at the front desk of a dental practice, answering phones and booking appointments. These days I build the monthly volunteer rota for a weekend school in Google Sheets. The gap: I spent five years at home with my children and I am ready to come back. One thing from the posting I can do on day one: schedule appointments in a shared calendar.',
  format:
    'Under 200 words, three short paragraphs, plain words. No stock opening such as "I am writing to express my interest", and no words I did not use, such as "passionate" or "thrilled".',
  check:
    'After the letter, list every claim in it that is not in my notes. Then list any phrase that sounds like a template, so I can rewrite it in my own words.',
};

export const INTERVIEW_PRACTICE: PromptPreset = {
  id: 'interview-practice',
  label: 'Practice for the interview',
  situation:
    'I have an interview for front desk coordinator at a community health clinic. I am going back to work after five years at home with my children.',
  task:
    'Interview me for this job. Ask one question at a time and wait for my answer. After each answer, ask one follow-up question the way a real interviewer would, then tell me in two or three sentences what was clear and what was vague.',
  input: POSTING,
  format:
    'Five questions in total, including one about the gap in my work history. Keep each question short. At the end, a short list: my two strongest answers and the one to practice again.',
  check:
    'Base your feedback only on what I actually said. Tell me when you are guessing what the employer wants.',
};

export const JOB_SEARCH_PRESETS: PromptPreset[] = [FIND_TITLES, TAILOR_RESUME, COVER_LETTER, INTERVIEW_PRACTICE];

/** Tap-to-add Check lines for job-search prompts. */
export const JOB_SEARCH_CHECK_LINES: string[] = [
  'List anything in the result that is not in my original.',
  'Keep every date, job title and employer name exactly as I gave them.',
  'Tell me when you are guessing what the employer wants.',
  'Ask me up to three questions first if anything is unclear.',
];

/** The tracker's columns, in order: the page's table and the CSV header both come from here. */
export const TRACKER_COLUMNS: { name: string; note: string }[] = [
  { name: 'Date applied', note: 'The day you sent it.' },
  { name: 'Company', note: 'Who the job is with.' },
  { name: 'Job title', note: 'As written in the posting.' },
  { name: 'Link to posting', note: 'Postings get taken down, so save a copy of the text too.' },
  { name: 'Version sent', note: 'The file names of the résumé and cover letter you sent.' },
  { name: 'Status', note: 'Applied, interview, offer, no reply, or not this time.' },
  { name: 'Next step', note: 'What you are waiting for, or what you need to do.' },
  { name: 'Next step date', note: 'When to follow up if you hear nothing.' },
  { name: 'Notes', note: 'Anything you want to remember for the interview.' },
];
