import { SQL } from 'bun';
import { createHandler } from './app';
import { createTelegramNotifier } from './notify';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = new SQL(url);

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = process.env;
const notify = token && chatId ? createTelegramNotifier({ token, chatId }) : undefined;
console.log(JSON.stringify({ msg: 'notifications', telegram: Boolean(notify) }));

const handle = createHandler({
  notify,
  insert: async (row, userAgent) => {
    await sql`
      insert into responses (track, score, privacy_gap, weekly_task, name, contact, answers, user_agent)
      values (${row.track}, ${row.score}, ${row.privacyGap}, ${row.weeklyTask}, ${row.name}, ${row.contact},
              ${row.answers}::jsonb, ${userAgent})`;
  },
  ping: async () => {
    await sql`select 1`;
  },
  limit: Number(process.env.RATE_LIMIT ?? 10),
});

const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: handle });
console.log(JSON.stringify({ msg: 'listening', port: server.port }));
