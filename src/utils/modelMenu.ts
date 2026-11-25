// "Read my menu" on /ai-guides/which-model/: pure functions over the model
// data, imported by the page's script and by its tests. Nothing here touches
// the network, storage or the URL.
import type { AiModel, Size, Vendor } from '../consts/guides/aiModels';

export type Account = 'free' | 'paid' | 'work';
export type Task = 'quick' | 'long' | 'hard' | 'code';

export const ACCOUNTS: readonly { id: Account; label: string }[] = [
  { id: 'free', label: 'Free personal account' },
  { id: 'paid', label: 'Paid personal plan' },
  { id: 'work', label: 'Work or school account' },
];

export const TASKS: readonly { id: Task; label: string }[] = [
  { id: 'quick', label: 'A quick question or a rewrite' },
  { id: 'long', label: 'A long document or a spreadsheet' },
  { id: 'hard', label: 'A hard problem with several steps' },
  { id: 'code', label: 'Code' },
];

export const SIZE_LABELS: Record<Size, string> = {
  small: 'Small and fast',
  everyday: 'Everyday',
  large: 'Large',
  other: 'Setting or mode',
};

export const EMPLOYER_LINE =
  'Use what your employer allows. A work account has its own menu, and your employer decides what is on it.';

/** What to look for first, in order, for each task. "thinking" means a thinking level or mode. */
type Want = Size | 'thinking';
const WANTS: Record<Task, readonly Want[]> = {
  quick: ['small', 'everyday'],
  long: ['everyday', 'large'],
  hard: ['thinking', 'large', 'everyday'],
  code: ['thinking', 'large', 'everyday'],
};

/** The reason, by task and by what kind of option was picked. */
function reason(task: Task, pick: AiModel): string {
  const kind: Want = pick.thinking ? 'thinking' : pick.size;
  if (task === 'quick') {
    return kind === 'small'
      ? 'A quick job does not need a bigger model: the small one answers sooner and uses less of your limit.'
      : 'For a quick job the everyday option is plenty; a bigger one would only make you wait.';
  }
  if (task === 'long') {
    return kind === 'large'
      ? 'The large option is made for long, detailed material, so expect it to be slower.'
      : 'The everyday option handles most documents and spreadsheets; step up only if it misses things.';
  }
  const what = task === 'code' ? 'Code' : 'A problem with several steps';
  if (kind === 'thinking') return `${what} goes better when the app takes time to work it through before answering.`;
  if (kind === 'large') return `${what} is a good use of the large option, though it is slower and uses more of your limit.`;
  return 'This is the closest fit your plan includes.';
}

const matches = (m: AiModel, want: Want) => (want === 'thinking' ? !!m.thinking : m.size === want && !m.thinking);

/** How available an option is for this account: 0 best, null when not offered or not stated. */
function availability(m: AiModel, account: Account): number | null {
  const a = account === 'free' ? m.freePlan : m.paidPlan;
  if (a === 'yes') return 0;
  if (a === 'limited') return 1;
  if (a === 'some') return 2;
  return null; // 'no' or 'unclear'
}

/** The options this vendor's menu shows, in the order the data lists them. */
export function menuFor(models: readonly AiModel[], vendor: Vendor): AiModel[] {
  return models.filter((m) => m.vendor === vendor);
}

function best(menu: readonly AiModel[], account: Account, wants: readonly Want[], only?: (n: number) => boolean) {
  let pick: AiModel | undefined;
  let key = Infinity;
  menu.forEach((m, i) => {
    const a = availability(m, account);
    if (a === null || (only && !only(a))) return;
    const w = wants.findIndex((want) => matches(m, want));
    if (w < 0) return;
    const k = w * 1000 + a * 100 + i;
    if (k < key) [pick, key] = [m, k];
  });
  return pick;
}

export interface Recommendation {
  /** The option to highlight; always one of this vendor's options. */
  pick: AiModel;
  /** What to use if the pick is not in the reader's menu. */
  fallback?: AiModel;
  /** Lines to show, in order. A work account's first line is always EMPLOYER_LINE. */
  lines: string[];
}

/** One option in this vendor's menu for this account and task, with the reason. */
export function recommend(models: readonly AiModel[], vendor: Vendor, account: Account, task: Task): Recommendation {
  const menu = menuFor(models, vendor);
  if (menu.length === 0) throw new Error(`No options for ${vendor}`);
  const wants = WANTS[task];
  const pick =
    best(menu, account, wants) ??
    best(menu, account, ['everyday', 'other']) ??
    menu.find((m) => m.size === 'everyday') ??
    menu[0];

  const pickAvail = availability(pick, account);
  const fallback =
    pickAvail !== 0
      ? best(menu.filter((m) => m !== pick), account, [...wants, 'everyday', 'other'], (a) => a === 0)
      : undefined;

  const lines: string[] = [];
  if (account === 'work') lines.push(EMPLOYER_LINE);
  lines.push(`Pick ${pick.name}. ${reason(task, pick)}`);
  if (pickAvail === 1) lines.push(`Your plan may include ${pick.name} only some of the time.`);
  if (pickAvail === 2) lines.push(`Only some paid plans include ${pick.name}.`);
  if (fallback) lines.push(`If ${pick.name} is not in your menu, use ${fallback.name}.`);
  if ((task === 'hard' || task === 'code') && !pick.thinking && pick.size !== 'large') {
    // No thinking option or large model confirmed for this plan. Point to a thinking
    // mode the vendor's page does not confirm either way, without promising it.
    const unconfirmed = menu.find((m) => m.thinking && (account === 'free' ? m.freePlan : m.paidPlan) === 'unclear');
    lines.push(
      unconfirmed
        ? `If your menu shows ${unconfirmed.name}, try that instead.`
        : 'If the menu has a thinking or effort setting, raise it for this.',
    );
  }
  return { pick, fallback, lines };
}

/** The oldest `checked` date in the data: the page's "last checked" date. */
export function oldestChecked(models: readonly AiModel[]): string {
  return models.reduce((min, m) => (m.checked < min ? m.checked : min), models[0].checked);
}

/** "2026-11-24" → "November 24, 2026". */
export function formatChecked(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export const FREE_LABELS: Record<AiModel['freePlan'], string> = {
  yes: 'Yes',
  limited: 'Limited',
  no: 'No',
  unclear: 'Not stated',
};
