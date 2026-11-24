// Turns an untrusted /api/ai-quiz/intake POST body (the cohort 1 pre-session
// form at /ai-cohort/intake) into a row to store. The page renders its choices
// from INTAKE_OPTIONS, so the whitelist below and the form can't drift apart.
// No imports: the page and the service both load this file.

export const INTAKE_OPTIONS = {
  timeTaken: [
    { value: 'under-30m', label: 'Under 30 minutes' },
    { value: '30-60m', label: '30–60 minutes' },
    { value: '1-2h', label: '1–2 hours' },
    { value: '2h-plus', label: 'More than 2 hours' },
  ],
  inputs: [
    { value: 'spreadsheet', label: 'Spreadsheets' },
    { value: 'documents', label: 'Documents or PDFs' },
    { value: 'email', label: 'Email' },
    { value: 'logs', label: 'Logs or records' },
    { value: 'forms', label: 'Form responses' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'other', label: 'Something else' },
  ],
  tools: [
    { value: 'gemini-free', label: 'Gemini (free)' },
    { value: 'gemini-paid', label: 'Gemini (paid)' },
    { value: 'chatgpt-free', label: 'ChatGPT (free)' },
    { value: 'chatgpt-paid', label: 'ChatGPT (paid)' },
    { value: 'copilot-personal', label: 'Microsoft Copilot (personal)' },
    { value: 'copilot-work', label: 'Microsoft Copilot (through work)' },
    { value: 'claude', label: 'Claude' },
    { value: 'none', label: 'None yet' },
  ],
  workRestricts: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'not-sure', label: 'Not sure' },
  ],
  // Self-picked. Same tracks as the quiz (src/utils/aiQuiz.ts TRACKS).
  track: [
    { value: 'foundations', label: 'Foundations', hint: 'Prompts with real context, checking what comes back, and what to keep out of AI tools.' },
    { value: 'applied', label: 'Applied', hint: 'Pointing AI at your spreadsheets, documents and email, and turning a task into a repeatable workflow.' },
    { value: 'builder', label: 'Builder', hint: 'Connecting AI to your tools and chaining steps into an automation that runs end to end.' },
  ],
} as const;

type Values<K extends keyof typeof INTAKE_OPTIONS> = (typeof INTAKE_OPTIONS)[K][number]['value'];
export type IntakeTrack = Values<'track'>;
export type TimeTaken = Values<'timeTaken'>;

export const INTAKE_LIMITS = { name: 120, contact: 160, weeklyTask: 600, privateConcerns: 400 } as const;

export interface IntakeRow {
  name: string;
  contact: string;
  weeklyTask: string;
  timeTaken: TimeTaken;
  inputs: string[];
  tools: string[];
  workRestricts: string | null;
  track: IntakeTrack;
  privateConcerns: string | null;
  recordingConsent: true;
}

export type ParsedIntake =
  | { kind: 'ok'; row: IntakeRow }
  | { kind: 'spam' }
  | { kind: 'invalid'; error: string };

const allowed = (k: keyof typeof INTAKE_OPTIONS) => new Set<string>(INTAKE_OPTIONS[k].map((o) => o.value));
const CHOICES = {
  timeTaken: allowed('timeTaken'),
  inputs: allowed('inputs'),
  tools: allowed('tools'),
  workRestricts: allowed('workRestricts'),
  track: allowed('track'),
};

const text = (v: unknown, k: string, max: number): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw new Error(`expected text for ${k}`);
  const s = v.trim();
  if (s.length > max) throw new Error(`${k} longer than ${max}`);
  return s || null;
};

const one = (v: unknown, k: keyof typeof CHOICES): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !CHOICES[k].has(v)) throw new Error(`bad value for ${k}`);
  return v;
};

const many = (v: unknown, k: keyof typeof CHOICES): string[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > CHOICES[k].size) throw new Error(`bad list for ${k}`);
  if (!v.every((x) => typeof x === 'string' && CHOICES[k].has(x))) throw new Error(`bad value in ${k}`);
  return [...new Set(v as string[])];
};

export function parseIntake(raw: unknown): ParsedIntake {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'invalid', error: 'body must be an object' };
  const b = raw as Record<string, unknown>;

  // Honeypot: people never see the "website" field, bots fill it.
  if (typeof b.website === 'string' && b.website.trim() !== '') return { kind: 'spam' };

  try {
    const name = text(b.name, 'name', INTAKE_LIMITS.name);
    if (!name) throw new Error('missing name');
    const contact = text(b.contact, 'contact', INTAKE_LIMITS.contact);
    if (!contact) throw new Error('missing contact');
    const weeklyTask = text(b.weeklyTask, 'weeklyTask', INTAKE_LIMITS.weeklyTask);
    if (!weeklyTask) throw new Error('missing weeklyTask');

    const timeTaken = one(b.timeTaken, 'timeTaken');
    if (!timeTaken) throw new Error('missing timeTaken');
    const track = one(b.track, 'track');
    if (!track) throw new Error('missing track');

    const tools = many(b.tools, 'tools');
    if (tools.includes('none') && tools.length > 1) throw new Error('"none" cannot be combined with other tools');

    if (b.recordingConsent !== true) throw new Error('recording consent is required');

    return {
      kind: 'ok',
      row: {
        name,
        contact,
        weeklyTask,
        timeTaken: timeTaken as TimeTaken,
        inputs: many(b.inputs, 'inputs'),
        tools,
        workRestricts: one(b.workRestricts, 'workRestricts'),
        track: track as IntakeTrack,
        privateConcerns: text(b.privateConcerns, 'privateConcerns', INTAKE_LIMITS.privateConcerns),
        recordingConsent: true,
      },
    };
  } catch (err) {
    return { kind: 'invalid', error: (err as Error).message };
  }
}
