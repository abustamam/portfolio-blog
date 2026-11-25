import { describe, expect, test } from 'bun:test';
import { createHandler, PATH, WHATSAPP_PATH } from '../src/app';
import { parseSubmission, type Row } from '../src/validate';
import { createRateLimiter } from '../src/rateLimit';

const valid = {
  frequency: 'daily',
  tools: ['claude', 'local'],
  wrongAnswer: 'reprompted-and-verified',
  prompt: 'rich',
  files: 'checked-output',
  connected: 'agents',
  weeklyTask: 'Pulling listing comps into a market report',
  neverPaste: ['personal-info', 'passwords'],
  format: 'either',
  start: 'within-month',
  payer: 'organization',
  followUp: ['team-workshop'],
  name: '',
  contact: '',
  website: '',
  track: 'foundations', // client claim, must be ignored
  score: 0,
};

function setup(limit = 10) {
  const rows: Row[] = [];
  const handle = createHandler({
    insert: async (r) => void rows.push(r),
    ping: async () => {},
    limit,
    log: () => {},
  });
  const post = (body: unknown, ip = '1.2.3.4') =>
    handle(
      new Request(`http://x${PATH}`, {
        method: 'POST',
        headers: { 'x-real-ip': ip },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  return { rows, handle, post };
}

describe('parseSubmission', () => {
  test('recomputes the track instead of trusting the client', () => {
    const p = parseSubmission(valid);
    expect(p.kind).toBe('ok');
    if (p.kind !== 'ok') return;
    expect(p.row.track).toBe('builder');
    expect(p.row.score).toBe(15);
    expect(p.row.answers.followUp).toEqual(['team-workshop']);
    expect(p.row.name).toBeNull();
    expect('track' in p.row.answers).toBe(false);
  });

  test('flags the honeypot as spam', () => {
    expect(parseSubmission({ ...valid, website: 'http://spam' }).kind).toBe('spam');
  });

  test.each([
    ['a value that is not a form token', { frequency: '=HYPERLINK("x")' }],
    ['a missing required answer', { prompt: '' }],
    ['an empty weekly task', { weeklyTask: '   ' }],
    ['an over-long weekly task', { weeklyTask: 'x'.repeat(601) }],
    ['a list that is not a list', { tools: 'claude' }],
    ['a non-string name', { name: 42 }],
  ])('rejects %s', (_, patch) => {
    expect(parseSubmission({ ...valid, ...patch }).kind).toBe('invalid');
  });
});

describe('handler', () => {
  test('stores a valid submission', async () => {
    const { rows, post } = setup();
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, track: 'builder' });
    expect(rows).toHaveLength(1);
  });

  test('answers bots with ok but stores nothing', async () => {
    const { rows, post } = setup();
    const res = await post({ ...valid, website: 'x' });
    expect(res.status).toBe(200);
    expect(rows).toHaveLength(0);
  });

  test('rejects bad JSON, bad fields, wrong method and oversized bodies', async () => {
    const { rows, post, handle } = setup();
    expect((await post('{nope')).status).toBe(400);
    expect((await post({ ...valid, connected: 'DROP TABLE' })).status).toBe(400);
    expect((await post({ ...valid, weeklyTask: 'x'.repeat(20_000) })).status).toBe(413);
    expect((await handle(new Request(`http://x${PATH}`))).status).toBe(405);
    expect((await handle(new Request('http://x/other', { method: 'POST' }))).status).toBe(404);
    expect(rows).toHaveLength(0);
  });

  test('rate-limits per IP', async () => {
    const { post } = setup(2);
    expect((await post(valid, 'a')).status).toBe(200);
    expect((await post(valid, 'a')).status).toBe(200);
    expect((await post(valid, 'a')).status).toBe(429);
    expect((await post(valid, 'b')).status).toBe(200);
  });

  test('returns 500 without leaking the error when the insert fails', async () => {
    const handle = createHandler({
      insert: async () => {
        throw new Error('password authentication failed for user ai_quiz');
      },
      ping: async () => {},
      log: () => {},
    });
    const res = await handle(new Request(`http://x${PATH}`, { method: 'POST', body: JSON.stringify(valid) }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('password');
  });

  test('health reports the database state', async () => {
    const up = createHandler({ insert: async () => {}, ping: async () => {} });
    const down = createHandler({ insert: async () => {}, ping: async () => { throw new Error('x'); } });
    expect((await up(new Request(`http://x${PATH}/health`))).status).toBe(200);
    expect((await down(new Request(`http://x${PATH}/health`))).status).toBe(503);
  });
});

test('rate limiter window resets', () => {
  let t = 0;
  const allow = createRateLimiter(1, 1000, () => t);
  expect(allow('k')).toBe(true);
  expect(allow('k')).toBe(false);
  t = 1000;
  expect(allow('k')).toBe(true);
});

describe('whatsapp redirect', () => {
  const number = '15550001111'; // a made-up number
  const get = (handle: (r: Request) => Promise<Response>, ip = '1.2.3.4', method = 'GET') =>
    handle(new Request(`http://x${WHATSAPP_PATH}`, { method, headers: { 'x-real-ip': ip } }));
  const make = (whatsappNumber?: string, whatsappLimit?: number) =>
    createHandler({ insert: async () => {}, ping: async () => {}, log: () => {}, whatsappNumber, whatsappLimit });

  test('redirects to the chat without putting the number in a body', async () => {
    const res = await get(make(number));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`https://wa.me/${number}`);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    expect(await res.text()).toBe('');
  });

  test('is a 404 when the number is unset or not digits-only', async () => {
    for (const n of [undefined, '', '+1 555 000 1111', '555-0001111', '123']) {
      expect((await get(make(n))).status).toBe(404);
    }
  });

  test('only GET and HEAD', async () => {
    expect((await get(make(number), '1.2.3.4', 'HEAD')).status).toBe(302);
    expect((await get(make(number), '1.2.3.4', 'POST')).status).toBe(405);
  });

  test('rate limits per IP, separately from the forms', async () => {
    const handle = make(number, 2);
    expect((await get(handle)).status).toBe(302);
    expect((await get(handle)).status).toBe(302);
    expect((await get(handle)).status).toBe(429);
    expect((await get(handle, '5.6.7.8')).status).toBe(302);
  });
});
