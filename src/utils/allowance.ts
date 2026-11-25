// The arithmetic behind the allowance meter on /ai-guides/usage-limits/.
// Pure functions: the page's static bars, its script and its test all use
// these, so the three can never disagree. The numbers are made up to show
// proportions. No app publishes its limits this way.

export const ALLOWANCE = 100;

export type ActionId = 'short' | 'backAndForth' | 'pdf' | 'pdfQuestion';

export interface Action {
  id: ActionId;
  label: string;
  /** Units, before any switch is applied. */
  units: number;
}

export const ACTIONS: readonly Action[] = [
  { id: 'short', label: 'A short question in a new chat', units: 1 },
  { id: 'backAndForth', label: 'A ten-message back-and-forth', units: 8 },
  { id: 'pdf', label: 'Attach a 40-page PDF and ask one question', units: 15 },
  { id: 'pdfQuestion', label: 'Another question in the chat that holds the PDF', units: 6 },
];

/** Asking anything late in an already long chat adds this to each message. */
export const LONG_CHAT_SURCHARGE = 3;
export const LARGE_MODEL_FACTOR = 3;
export const THINKING_FACTOR = 2;

export interface Switches {
  large: boolean;
  thinking: boolean;
  /** The chat is already long: every message costs the surcharge on top. */
  longChat: boolean;
}

export const NO_SWITCHES: Switches = { large: false, thinking: false, longChat: false };

export const actionById = (id: ActionId): Action => ACTIONS.find((a) => a.id === id)!;

/** Units one action costs with the switches as they are. The surcharge is added first, then the switches multiply. */
export function costOf(units: number, sw: Switches = NO_SWITCHES): number {
  const base = units + (sw.longChat ? LONG_CHAT_SURCHARGE : 0);
  return base * (sw.large ? LARGE_MODEL_FACTOR : 1) * (sw.thinking ? THINKING_FACTOR : 1);
}

export interface SpendResult {
  /** Allowance left, never below 0. */
  remaining: number;
  /** What was actually taken (less than `cost` when the action ran into the limit). */
  charged: number;
  /** The full cost of the action. */
  cost: number;
  /** True when the action did not fit in what was left, so the limit message shows. */
  hitLimit: boolean;
}

/** Spend one action from what is left. An action that does not fit takes the rest and hits the limit. */
export function spend(remaining: number, units: number, sw: Switches = NO_SWITCHES): SpendResult {
  const cost = costOf(units, sw);
  if (remaining <= 0) return { remaining: 0, charged: 0, cost, hitLimit: true };
  const charged = Math.min(cost, remaining);
  const left = remaining - charged;
  return { remaining: left, charged, cost, hitLimit: cost > remaining };
}

/** The job on the page: attach a 40-page PDF and ask one question, then five further questions. */
export const JOB_FOLLOW_UPS = 5;
export const JOB: readonly ActionId[] = ['pdf', ...Array<ActionId>(JOB_FOLLOW_UPS).fill('pdfQuestion')];

export interface JobResult {
  /** What the whole job would cost with no limit. */
  total: number;
  /** What the allowance actually pays for: total, capped at the allowance. */
  spent: number;
  /** Cost of each message, in order. */
  steps: number[];
  /** Further questions finished before the limit (the PDF message is not counted). */
  followUpsDone: number;
  /** The message, counted from 1, that would pass the allowance; null if the job fits. */
  cutOffAtMessage: number | null;
  /** What was used when the last message that fit was done. */
  usedBeforeCutOff: number;
}

export function runJob(sw: Switches = NO_SWITCHES, allowance: number = ALLOWANCE): JobResult {
  const steps = JOB.map((id) => costOf(actionById(id).units, sw));
  const total = steps.reduce((a, b) => a + b, 0);
  let used = 0;
  let cutOffAtMessage: number | null = null;
  for (let i = 0; i < steps.length; i++) {
    if (used + steps[i] > allowance) {
      cutOffAtMessage = i + 1;
      break;
    }
    used += steps[i];
  }
  const done = cutOffAtMessage === null ? steps.length : cutOffAtMessage - 1;
  return {
    total,
    spent: Math.min(total, allowance),
    steps,
    followUpsDone: Math.max(0, done - 1),
    cutOffAtMessage,
    usedBeforeCutOff: used,
  };
}

export interface Scenario {
  id: 'new' | 'long' | 'large';
  label: string;
  note: string;
  switches: Switches;
}

/** The three bars of the static fallback: the same job done three ways. */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'new',
    label: 'In a new chat, everyday model',
    note: 'Each question costs the same.',
    switches: NO_SWITCHES,
  },
  {
    id: 'long',
    label: 'Late in a long chat',
    note: 'Every message, including the PDF, costs 3 more.',
    switches: { ...NO_SWITCHES, longChat: true },
  },
  {
    id: 'large',
    label: 'In a new chat, large model',
    note: 'Every message costs three times as much.',
    switches: { ...NO_SWITCHES, large: true },
  },
];

export const scenarioTotals = () => SCENARIOS.map((s) => ({ scenario: s, result: runJob(s.switches) }));
