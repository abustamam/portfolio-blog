// Tells the cohort runner a new response arrived. Optional: the service runs
// without it, and a failed notification never fails the submission.
import type { Row } from './validate';

const TRACK_NAMES = { foundations: 'Foundations', applied: 'Applied', builder: 'Builder' } as const;

/**
 * Plain text, no parse_mode, so nothing a respondent types can break the
 * formatting. Contact details stay out: they live only in the database.
 */
export function formatNotification(row: Row): string {
  const a = row.answers;
  const one = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '—');
  return [
    `New AI quiz response: ${row.name ?? '(no name)'}`,
    `Track: ${TRACK_NAMES[row.track]} (score ${row.score}/15)${row.privacyGap ? ', privacy gap' : ''}`,
    `Payer: ${one('payer')} · Start: ${one('start')} · Format: ${one('format')} · Price: ${one('price')}`,
    `Task: ${row.weeklyTask}`,
    row.contact ? 'Left contact details: yes' : 'Left contact details: no',
  ].join('\n');
}

export function createTelegramNotifier(opts: {
  token: string;
  chatId: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): (row: Row) => Promise<void> {
  const f = opts.fetch ?? fetch;
  return async (row) => {
    const res = await f(`https://api.telegram.org/bot${opts.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: opts.chatId, text: formatNotification(row), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    // Never include the URL in errors: it carries the bot token.
    if (!res.ok) throw new Error(`telegram sendMessage returned ${res.status}`);
  };
}
