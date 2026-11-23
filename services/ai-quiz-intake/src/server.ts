import { SQL } from 'bun';
import { createHandler } from './app';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = new SQL(url);

const handle = createHandler({
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
