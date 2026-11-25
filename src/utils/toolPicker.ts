// The rules behind the "Tool picker" on /ai-guides/which-tool/.
// Pure: no DOM, no storage, no network. The component and the tests both
// import from here. Prices live in src/consts/guides/aiTools.ts, not here.

import type { ToolId } from '../consts/guides/aiTools';

export type Account = 'work' | 'personal';
export type Ecosystem = 'google' | 'microsoft' | 'neither';
export type Task = 'everyday' | 'inbox' | 'code';
export type Pay = 'yes' | 'no';

export interface Answers {
  account: Account;
  ecosystem: Ecosystem;
  task: Task;
  /** Not asked for a work account: the employer decides what is paid for. */
  pay?: Pay;
}

export type QuestionId = keyof Answers;

export interface Question {
  id: QuestionId;
  text: string;
  options: { value: string; label: string }[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'account',
    text: 'Is this for work or for you?',
    options: [
      { value: 'work', label: 'Work: I sign in with a work account' },
      { value: 'personal', label: 'Me: my own account' },
    ],
  },
  {
    id: 'ecosystem',
    text: 'Which email do you use for it?',
    options: [
      { value: 'google', label: 'Gmail or Google' },
      { value: 'microsoft', label: 'Outlook or Microsoft' },
      { value: 'neither', label: 'Something else, or not sure' },
    ],
  },
  {
    id: 'task',
    text: 'What do you want help with first?',
    options: [
      { value: 'everyday', label: 'Writing, questions, ideas' },
      { value: 'inbox', label: 'My email, calendar or files' },
      { value: 'code', label: 'Writing code' },
    ],
  },
  {
    id: 'pay',
    text: 'Would you pay about $20 a month?',
    options: [
      { value: 'no', label: 'No, free only' },
      { value: 'yes', label: 'Yes, if it helps' },
    ],
  },
];

/** The questions still to ask, given the answers so far. A work account skips "pay". */
export function questionsFor(answers: Partial<Answers>): Question[] {
  return QUESTIONS.filter((q) => !(q.id === 'pay' && answers.account === 'work'));
}

/** The next question to ask, or null when the answers are complete. */
export function nextQuestion(answers: Partial<Answers>): Question | null {
  return questionsFor(answers).find((q) => answers[q.id] === undefined) ?? null;
}

export const EMPLOYER_LINE = 'Use what your employer allows.';

export interface Recommendation {
  /** For a work account this is always EMPLOYER_LINE. */
  first: string;
  /** The app to start with, or null when the employer has to say. */
  tool: ToolId | null;
  /** True when the advice is to use the tool with the work account, never a personal one. */
  workAccount: boolean;
  /** One sentence. */
  reason: string;
  firstStep: string;
  /** Where the answers point to the hands-on training, if anywhere. */
  link?: { href: '/ai-training/#connect' | '/ai-training/#build'; label: string };
}

const NAMES: Record<ToolId, string> = { gemini: 'Gemini', chatgpt: 'ChatGPT', copilot: 'Copilot', claude: 'Claude' };

const CONNECT = { href: '/ai-training/#connect', label: 'The Connect track sets this up on your own inbox' } as const;
const BUILD = { href: '/ai-training/#build', label: 'The Build track takes this further' } as const;

const linkFor = (task: Task) => (task === 'inbox' ? CONNECT : task === 'code' ? BUILD : undefined);

function work(a: Answers): Recommendation {
  const link = linkFor(a.task);
  if (a.ecosystem === 'google') {
    return {
      first: EMPLOYER_LINE,
      tool: 'gemini',
      workAccount: true,
      reason: 'Most Google Workspace business plans include Gemini, and your company’s rules then cover what you put in it.',
      firstStep: 'Open gemini.google.com signed in with your work account. If it is not there, ask IT before using anything else.',
      link,
    };
  }
  if (a.ecosystem === 'microsoft') {
    return {
      first: EMPLOYER_LINE,
      tool: 'copilot',
      workAccount: true,
      reason: 'Copilot Chat comes at no additional cost with eligible Microsoft 365 work accounts, under your company’s protections.',
      firstStep: 'Sign in to Copilot with your work account, not a personal one. If it is not available, ask IT which tool is approved.',
      link,
    };
  }
  return {
    first: EMPLOYER_LINE,
    tool: null,
    workAccount: true,
    reason: 'Your employer decides which AI tools are allowed for work information.',
    firstStep: 'Ask IT or your manager which AI tool is approved. Until then, keep work files out of personal AI accounts.',
    link,
  };
}

function personal(a: Answers): Recommendation {
  const pay = a.pay === 'yes';
  const link = linkFor(a.task);
  const paidNote = pay ? ' If you hit the free limits every week, the paid plan in the table below is the next step.' : '';

  if (a.ecosystem === 'google') {
    return {
      first: 'Start with Gemini.',
      tool: 'gemini',
      workAccount: false,
      reason:
        a.task === 'inbox'
          ? 'It works with the Google Account you already have and can connect to your Gmail, Calendar and Drive.'
          : 'It is free with the Google Account you already have.',
      firstStep:
        (a.task === 'inbox'
          ? 'Open gemini.google.com, connect Google Workspace in Connected Apps, then ask about one email thread.'
          : 'Open gemini.google.com with your Google Account and ask it to help with one real task from this week.') + paidNote,
      link,
    };
  }
  if (a.ecosystem === 'microsoft') {
    return {
      first: 'Start with Copilot.',
      tool: 'copilot',
      workAccount: false,
      reason: pay
        ? 'It works with your Microsoft account, and Microsoft 365 Personal adds Copilot inside Word, Excel and Outlook.'
        : 'It has a free version and works with the Microsoft account you already have.',
      firstStep:
        (a.task === 'inbox'
          ? 'Open copilot.microsoft.com and look for Connectors to link Outlook.com or OneDrive. Microsoft describes this for Microsoft 365 plans.'
          : 'Open copilot.microsoft.com signed in with your Microsoft account and ask it to help with one real task from this week.') +
        paidNote,
      link,
    };
  }
  // Neither Google nor Microsoft: pick by task.
  const tool: ToolId = a.task === 'inbox' ? 'claude' : 'chatgpt';
  const reason =
    a.task === 'inbox'
      ? 'Its free plan can connect to Gmail, Google Calendar and Google Drive.'
      : a.task === 'code'
        ? 'Its free plan includes limited access to Codex, its coding tool.'
        : 'Its free plan allows unlimited text chats.';
  const site = tool === 'claude' ? 'claude.ai' : 'chatgpt.com';
  return {
    first: `Start with ${NAMES[tool]}.`,
    tool,
    workAccount: false,
    reason,
    firstStep: `Make a free account at ${site} and try it on one real task from this week.${paidNote}`,
    link,
  };
}

/** One recommendation for a complete set of answers. Work accounts always get EMPLOYER_LINE first. */
export function recommend(a: Answers): Recommendation {
  return a.account === 'work' ? work(a) : personal(a);
}

/** Every complete set of answers, for tests and for checking the copy. */
export function allAnswerSets(): Answers[] {
  const out: Answers[] = [];
  for (const account of ['work', 'personal'] as Account[])
    for (const ecosystem of ['google', 'microsoft', 'neither'] as Ecosystem[])
      for (const task of ['everyday', 'inbox', 'code'] as Task[]) {
        if (account === 'work') out.push({ account, ecosystem, task });
        else for (const pay of ['no', 'yes'] as Pay[]) out.push({ account, ecosystem, task, pay });
      }
  return out;
}
