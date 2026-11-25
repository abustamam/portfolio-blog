// Data for the next-word stepper on /ai-guides/what-is-ai/.
// The percentages are made up for illustration. They were not measured from
// a real model, and the page says so under the visual.

export interface Candidate {
  word: string;
  percent: number;
}

export interface Step {
  candidates: Candidate[];
  /** The word added to the sentence at this step. */
  picked: string;
  /** Shown instead of the generic line when set. */
  caption?: string;
}

export const START = 'I left my umbrella at home, so I got';

export const STEPS: Step[] = [
  {
    candidates: [
      { word: 'wet', percent: 62 },
      { word: 'soaked', percent: 21 },
      { word: 'caught', percent: 9 },
      { word: 'a', percent: 5 },
    ],
    picked: 'wet',
  },
  {
    candidates: [
      { word: 'on', percent: 44 },
      { word: 'walking', percent: 23 },
      { word: '.', percent: 18 },
      { word: 'and', percent: 9 },
    ],
    picked: 'on',
  },
  {
    candidates: [
      { word: 'the', percent: 71 },
      { word: 'my', percent: 22 },
      { word: 'our', percent: 4 },
    ],
    picked: 'the',
  },
  {
    candidates: [
      { word: 'way', percent: 58 },
      { word: 'walk', percent: 24 },
      { word: 'bus', percent: 9 },
      { word: 'train', percent: 5 },
    ],
    picked: 'way',
  },
  {
    candidates: [
      { word: 'to', percent: 49 },
      { word: 'home', percent: 38 },
      { word: 'back', percent: 8 },
    ],
    picked: 'home',
    caption:
      'It did not take the most likely word. It picked the second one. It does not always take the top choice, which is why the same question can get a different answer twice.',
  },
  {
    candidates: [
      { word: '.', percent: 83 },
      { word: 'again', percent: 9 },
      { word: 'today', percent: 5 },
    ],
    picked: '.',
  },
];

/** The steps the no-JavaScript version shows, counting from 1. */
export const STATIC_STEPS = [1, 3, 6] as const;

export const ILLUSTRATION_NOTE =
  'The percentages are made up for illustration. They were not measured from a real model.';

/** Add a word to a sentence. A full stop attaches to the word before it. */
export function addWord(sentence: string, word: string): string {
  return /^[.,!?;:]$/.test(word) ? sentence + word : `${sentence} ${word}`;
}

/** The sentence after `step` words have been added (0 = just the start). */
export function sentenceAt(step: number, steps: Step[] = STEPS, start: string = START): string {
  return steps.slice(0, step).reduce((s, st) => addWord(s, st.picked), start);
}

/** The share of probability not on any listed word. */
export function otherPercent(step: Step): number {
  return 100 - step.candidates.reduce((sum, c) => sum + c.percent, 0);
}

/** True when the picked word is not the most likely candidate. */
export function skipsTop(step: Step): boolean {
  const top = [...step.candidates].sort((a, b) => b.percent - a.percent)[0];
  return top.word !== step.picked;
}

// Second figure: one question, as search results beside a chat answer.
// Every title and name is invented.
export const SEARCH_QUESTION = 'What time does the pharmacy on Main Street close?';

export const SEARCH_RESULTS: { title: string; site: string }[] = [
  { title: 'Main Street Pharmacy: store hours and holiday schedule', site: 'mainstreetpharmacy.example' },
  { title: 'Pharmacies open late near Main Street', site: 'townguide.example' },
  { title: 'Main Street Pharmacy reviews', site: 'localreviews.example' },
];

export const CHAT_ANSWER = 'The pharmacy on Main Street closes at 9 p.m. on weekdays and 6 p.m. on Saturdays.';
