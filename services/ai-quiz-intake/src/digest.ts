// Sends the weekly funnel digest (#109) once and exits. Run weekly on the box:
//
//   docker exec ai-quiz-intake bun services/ai-quiz-intake/src/digest.ts
//
// `--dry-run` prints the message instead of sending it. Exit code 1 when any
// section was unavailable or Telegram failed, so a cron log shows it.
// Setup and the env it reads: docs/ai-quiz-setup.md, "Weekly funnel digest".
import { SQL } from 'bun';
import { countPageViews, countReserves, fetchLokiLines, formatDigest, parseIpList, section } from './funnel';
import { createTelegramSender } from './notify';
import { parseTrackLinks } from './tracks';

const DAY = 24 * 60 * 60 * 1000;
const dryRun = process.argv.includes('--dry-run');
const env = process.env;

const endMs = Date.now();
const startMs = endMs - 7 * DAY;

const views = await section(async () => {
  if (!env.LOKI_URL) throw new Error('LOKI_URL is not set');
  const lines = await fetchLokiLines({ url: env.LOKI_URL }, startMs, endMs);
  return countPageViews(lines, parseIpList(env.DIGEST_EXCLUDE_IPS));
});

const quiz = await section(async () => {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const sql = new SQL(env.DATABASE_URL);
  try {
    // Needs only `grant select (track, submitted_at) on responses to ai_quiz`:
    // the role still cannot read names, contacts or answers.
    const rows: { track: string; n: number }[] = await sql`
      select track, count(*)::int as n from responses
      where submitted_at >= ${new Date(startMs)} and submitted_at < ${new Date(endMs)}
      group by track`;
    return Object.fromEntries(rows.map((r) => [r.track, r.n]));
  } finally {
    await sql.close();
  }
});

const reserves = await section(async () => {
  const tracks = parseTrackLinks(env.STRIPE_TRACKS);
  if (!Object.keys(tracks).length) throw new Error('STRIPE_TRACKS is not set');
  if (!env.STRIPE_API_KEY) throw new Error('STRIPE_API_KEY is not set');
  return countReserves({ apiKey: env.STRIPE_API_KEY, tracks }, startMs, endMs);
});

const text = formatDigest({ startMs, endMs, views, quiz, reserves });
const allOk = views.ok && quiz.ok && reserves.ok;

if (dryRun) {
  console.log(text);
  process.exit(allOk ? 0 : 1);
}

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;
if (!token || !chatId) {
  console.error(JSON.stringify({ msg: 'digest not sent', error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required' }));
  console.log(text);
  process.exit(1);
}
try {
  await createTelegramSender<string>({ token, chatId }, (t) => t)(text);
} catch (err) {
  console.error(JSON.stringify({ msg: 'digest not sent', error: String(err) }));
  process.exit(1);
}
// Counts only, so it is safe to log.
console.log(JSON.stringify({ msg: 'digest sent', views: views.ok, quiz: quiz.ok, reserves: reserves.ok }));
process.exit(allOk ? 0 : 1);
