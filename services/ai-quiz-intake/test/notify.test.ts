import { describe, expect, test } from 'bun:test';
import { createHandler, PATH } from '../src/app';
import { createTelegramNotifier, formatNotification } from '../src/notify';
import { parseSubmission, type Row } from '../src/validate';

const body = {
  frequency: 'daily', tools: ['claude', 'api'], wrongAnswer: 'reprompted-and-verified', prompt: 'rich',
  files: 'checked-output', connected: 'automation', goal: 'inbox', weeklyTask: 'Event *management* <b>', neverPaste: ['passwords'],
  format: 'online', start: 'exploring', payer: 'unsure', price: 'under-100',
  name: 'Test Person', contact: 'test@example.com', website: '',
};
const row = (() => {
  const p = parseSubmission(body);
  if (p.kind !== 'ok') throw new Error('fixture invalid');
  return p.row;
})();

const post = (handle: (r: Request) => Promise<Response>, b: unknown = body) =>
  handle(new Request(`http://x${PATH}`, { method: 'POST', headers: { 'x-real-ip': '9.9.9.9' }, body: JSON.stringify(b) }));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('formatNotification', () => {
  test('names the person, recommended track, goal, level, score and task, and leaves contact details out', () => {
    const text = formatNotification(row);
    expect(text).toContain('New AI quiz response: Test Person');
    expect(text).toContain('Recommended: Connect · Goal: inbox');
    expect(text).toContain('Level: Builder (score 14/15), privacy gap');
    expect(text).toContain('Payer: unsure · Start: exploring');
    // The quiz no longer asks for a format or a price.
    expect(text).not.toContain('Format:');
    expect(text).not.toContain('Price:');
    expect(text).toContain('Task: Event *management* <b>');
    expect(text).toContain('Left contact details: yes');
    expect(text).not.toContain('test@example.com');
  });

  test('handles a response with no name', () => {
    expect(formatNotification({ ...row, name: null, contact: null })).toContain('(no name)');
  });
});

describe('handler notifications', () => {
  test('notifies once after a successful insert', async () => {
    const seen: Row[] = [];
    const handle = createHandler({ insert: async () => {}, ping: async () => {}, log: () => {}, notify: async (r) => void seen.push(r) });
    expect((await post(handle)).status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0].name).toBe('Test Person');
  });

  test('does not notify for spam, invalid bodies or a failed insert', async () => {
    const seen: Row[] = [];
    const notify = async (r: Row) => void seen.push(r);
    const ok = createHandler({ insert: async () => {}, ping: async () => {}, log: () => {}, notify });
    const broken = createHandler({ insert: async () => { throw new Error('db down'); }, ping: async () => {}, log: () => {}, notify });
    expect((await post(ok, { ...body, website: 'spam' })).status).toBe(200);
    expect((await post(ok, { ...body, prompt: '' })).status).toBe(400);
    expect((await post(broken)).status).toBe(500);
    expect(seen).toHaveLength(0);
  });

  test('a failing notification still returns 200 and is logged', async () => {
    const logs: string[] = [];
    const handle = createHandler({
      insert: async () => {}, ping: async () => {}, log: (m) => void logs.push(m),
      notify: async () => { throw new Error('telegram down'); },
    });
    expect((await post(handle)).status).toBe(200);
    await tick();
    expect(logs).toContain('notify failed');
  });
});

describe('createTelegramNotifier', () => {
  test('posts plain text to the chat', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const notify = createTelegramNotifier({
      token: 'T0K3N', chatId: '42',
      fetch: (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{}'); }) as typeof fetch,
    });
    await notify(row);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.telegram.org/botT0K3N/sendMessage');
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.chat_id).toBe('42');
    expect(sent.text).toBe(formatNotification(row));
    expect('parse_mode' in sent).toBe(false);
  });

  test('throws on a non-2xx reply without leaking the token', async () => {
    const notify = createTelegramNotifier({
      token: 'T0K3N', chatId: '42',
      fetch: (async () => new Response('nope', { status: 401 })) as typeof fetch,
    });
    const err = await notify(row).catch((e) => e as Error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('401');
    expect(err.message).not.toContain('T0K3N');
  });
});
