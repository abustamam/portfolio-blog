// Data for the free guide /ai-guides/projects/: what each app calls its saved
// space for one ongoing job, whether the free plan has it, where to find it,
// how chats and memory work inside it, and how it counts against your usage.
//
// Every fact was read on the company's own page on its `checked` date and
// links that page as `source`. Nothing here is from memory or a third-party
// article. When the company's page did not say, `confirmed` is false and the
// page shows "Check the company's page" with the link instead of a claim.
//
// Re-check every quarter: open each `source`, update `text` and `checked`.
// The page's "last checked" date is the oldest `checked` in this file.
import type { Fact, ToolId } from './aiTools';

export { UNCONFIRMED, type Fact } from './aiTools';

export type ProjectKey = 'called' | 'free' | 'where' | 'memory' | 'usage';

export const PROJECT_LABELS: Record<ProjectKey, string> = {
  called: 'What it is called',
  free: 'On the free plan?',
  where: 'Where to find it',
  memory: 'Chats and memory',
  usage: 'How it counts against your usage',
};

export const PROJECT_ORDER: ProjectKey[] = ['called', 'free', 'where', 'memory', 'usage'];

export interface ProjectApp {
  id: ToolId;
  name: string;
  facts: Record<ProjectKey, Fact>;
}

const CHECKED = '2026-11-25';

const OPENAI = 'https://help.openai.com/en/articles/10169521-projects-in-chatgpt';
const GEMINI_NOTEBOOKS = 'https://support.google.com/gemini/answer/16972047?hl=en';
const GEMINI_GEMS = 'https://support.google.com/gemini/answer/18560919?hl=en';
const COPILOT_TROUBLESHOOT = 'https://support.microsoft.com/en-us/microsoft-365-copilot/troubleshoot-content-copilot-app';
const COPILOT_FAQ = 'https://support.microsoft.com/en-us/microsoft-365-copilot/frequently-asked-questions-about-microsoft-365-copilot-notebooks';
const CLAUDE_WHAT = 'https://support.claude.com/en/articles/9517075-what-are-projects';
const CLAUDE_MANAGE = 'https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects';
const CLAUDE_USAGE = 'https://support.claude.com/en/articles/9797557-usage-limit-best-practices';

const fact = (text: string, source: string, confirmed: boolean): Fact => ({ text, source, checked: CHECKED, confirmed });
const unknown = (source: string): Fact => fact('(not stated)', source, false);

export const PROJECT_APPS: ProjectApp[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    facts: {
      called: fact('Projects', OPENAI, true),
      free: fact('Yes, on every qualifying ChatGPT plan. Free gets 5 files per project, Go and Plus 25, Pro 40.', OPENAI, true),
      where: fact('Sidebar, then New project. On the phone: the + icon, or Explore, then Projects.', OPENAI, true),
      memory: fact(
        'By default a project’s chats can use your saved memory and each other. “Project-only” memory keeps it to that project’s own chats.',
        OPENAI,
        true,
      ),
      usage: fact('Credits and usage charges apply to project chats “the same as they do to regular chats”.', OPENAI, true),
    },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    facts: {
      called: fact('Notebooks', GEMINI_NOTEBOOKS, true),
      free: unknown(GEMINI_NOTEBOOKS),
      where: fact('Menu at the top left, then All notebooks (web and phone app).', GEMINI_NOTEBOOKS, true),
      memory: fact(
        'Notebooks remember “your sources, instructions, and ongoing discussions”. Some notebook features need History turned on.',
        GEMINI_NOTEBOOKS,
        true,
      ),
      usage: unknown(GEMINI_NOTEBOOKS),
    },
  },
  {
    id: 'copilot',
    name: 'Copilot',
    facts: {
      called: fact('Notebooks. Projects in the Copilot app were “renamed to Notebooks”.', COPILOT_TROUBLESHOOT, true),
      free: fact(
        'For Microsoft 365 Personal, Family, Premium and Pro subscribers. The page does not mention a free account.',
        COPILOT_FAQ,
        true,
      ),
      where: fact('Notebooks, in the left navigation pane of the Copilot app.', COPILOT_TROUBLESHOOT, true),
      memory: unknown(COPILOT_FAQ),
      usage: unknown(COPILOT_FAQ),
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    facts: {
      called: fact('Projects', CLAUDE_WHAT, true),
      free: fact('Yes. Free accounts can create up to five projects.', CLAUDE_WHAT, true),
      where: fact('Click Projects on the left side, or go to claude.ai/projects, then + New Project (upper right).', CLAUDE_MANAGE, true),
      memory: fact(
        'Context is not shared across chats in a project unless it is added to the project’s knowledge. Each project has its own memory; turn off “Use account memory” on the project’s page to keep it fully separate.',
        CLAUDE_MANAGE,
        true,
      ),
      usage: fact(
        'Project content “is cached and counts less against your limits when reused”. After a long break, your first message counts it in full again.',
        CLAUDE_USAGE,
        true,
      ),
    },
  },
];

/** The Gems-to-skills notice, shown as one sentence under the table. */
export const GEMS_NOTICE: Fact = fact(
  'Gemini used to call these Gems. They became read-only on November 17, 2026 and are removed from Gemini on December 17, 2026. Skills, reusable instructions, replace them.',
  GEMINI_GEMS,
  true,
);

/** Every fact the page shows. */
export const allProjectFacts = (): Fact[] => [...PROJECT_APPS.flatMap((a) => PROJECT_ORDER.map((k) => a.facts[k])), GEMS_NOTICE];

/** The page's "last checked" date: the oldest `checked` of any fact it shows. */
export const oldestChecked = (): string =>
  allProjectFacts()
    .map((f) => f.checked)
    .sort()[0];
