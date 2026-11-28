// Tells the cohort runner a new response arrived. Optional: the service runs
// without it, and a failed notification never fails the submission.
import { OFFER_NAMES } from '../../../src/utils/aiQuiz';
import type { Row } from './validate';
import { INTAKE_OPTIONS, type IntakeRow } from './intake';
import type { WaitlistRow } from './waitlist';
import { oneLine } from './text';
import { formatPaymentNotification, type Payment } from './stripe';

const TRACK_NAMES = { foundations: 'Foundations', applied: 'Applied', builder: 'Builder' } as const;

/**
 * Plain text, no parse_mode, so nothing a respondent types can break the
 * formatting. Contact details stay out: they live only in the database.
 */
export function formatNotification(row: Row): string {
  const a = row.answers;
  const one = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '—');
  return [
    `New AI quiz response: ${oneLine(row.name ?? '(no name)')}`,
    // The track the result screen named, and the answer that picked it ("—" when they were not sure or not asked).
    `Recommended: ${OFFER_NAMES[row.recommend]} · Goal: ${one('goal')}`,
    `Level: ${TRACK_NAMES[row.track]} (score ${row.score}/15)${row.privacyGap ? ', privacy gap' : ''}`,
    `Payer: ${one('payer')} · Start: ${one('start')}`,
    `Task: ${oneLine(row.weeklyTask)}`,
    row.contact ? 'Left contact details: yes' : 'Left contact details: no',
  ].join('\n');
}

const TIME_LABELS: Record<string, string> = Object.fromEntries(INTAKE_OPTIONS.timeTaken.map((o) => [o.value, o.label]));
const INTAKE_TRACKS: Record<string, string> = Object.fromEntries(INTAKE_OPTIONS.track.map((o) => [o.value, o.label]));
const label = (k: 'platform' | 'account' | 'os' | 'coding', v?: string) =>
  v ? (INTAKE_OPTIONS[k] as readonly { value: string; label: string }[]).find((o) => o.value === v)?.label ?? v : null;

/** Same rules as formatNotification: plain text, and no contact details. */
export function formatIntakeNotification(row: IntakeRow): string {
  return [
    `New cohort intake: ${oneLine(row.name)}`,
    `Track: ${INTAKE_TRACKS[row.track] ?? row.track}`,
    `Time now: ${TIME_LABELS[row.timeTaken]}`,
    `Task: ${oneLine(row.weeklyTask)}`,
    ...setupLine(row.extras),
    ...(row.extras?.buildIdea ? [`Wants to build: ${oneLine(row.extras.buildIdea)}`] : []),
  ].join('\n');
}

function setupLine(x: IntakeRow['extras'] | undefined): string[] {
  const parts = [label('platform', x?.platform), label('account', x?.account), label('os', x?.os), label('coding', x?.coding)];
  const shown = parts.filter((p): p is string => Boolean(p));
  return shown.length ? [`Setup: ${shown.join(' · ')}`] : [];
}

/**
 * Same rules: plain text, and no contact details. The note is the person's own
 * words, so it stays in. A guides sign-up names the page it came from.
 */
export function formatWaitlistNotification(row: WaitlistRow): string {
  const head = row.source
    ? `New "tell me when the next cohort opens" signup from ${row.source}${row.name ? `: ${oneLine(row.name)}` : ''}`
    : `New cohort waitlist signup: ${row.name ? oneLine(row.name) : row.name}`;
  return [head, ...(row.note ? [`Note: ${oneLine(row.note)}`] : [])].join('\n');
}

interface TelegramOpts {
  token: string;
  chatId: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Sends one plain-text message per row, formatted by `format`. */
export function createTelegramSender<T>(opts: TelegramOpts, format: (row: T) => string): (row: T) => Promise<void> {
  const f = opts.fetch ?? fetch;
  return async (row) => {
    const res = await f(`https://api.telegram.org/bot${opts.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: opts.chatId, text: format(row), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    // Never include the URL in errors: it carries the bot token.
    if (!res.ok) throw new Error(`telegram sendMessage returned ${res.status}`);
  };
}

export function createTelegramNotifier(opts: TelegramOpts): (row: Row) => Promise<void> {
  return createTelegramSender(opts, formatNotification);
}

export function createIntakeNotifier(opts: TelegramOpts): (row: IntakeRow) => Promise<void> {
  return createTelegramSender(opts, formatIntakeNotification);
}

export function createWaitlistNotifier(opts: TelegramOpts): (row: WaitlistRow) => Promise<void> {
  return createTelegramSender(opts, formatWaitlistNotification);
}

export function createPaymentNotifier(opts: TelegramOpts): (p: Payment) => Promise<void> {
  return createTelegramSender(opts, formatPaymentNotification);
}
