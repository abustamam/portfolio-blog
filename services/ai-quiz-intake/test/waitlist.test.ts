import { describe, expect, test } from 'bun:test';
import { createHandler, INTAKE_PATH, PATH, WAITLIST_PATH } from '../src/app';
import { parseWaitlist, type WaitlistRow } from '../src/waitlist';
import { createWaitlistNotifier, formatWaitlistNotification } from '../src/notify';
import type { IntakeRow } from '../src/intake';

const valid = { name: 'Test Person', contact: '+1 916 555 0100', note: 'Weeknights work best', website: '' };

function setup(limit = 10) {
  const rows: WaitlistRow[] = [];
  const intakeRows: IntakeRow[] = [];
  const notified: WaitlistRow[] = [];
  const handle = createHandler({
    insert: async () => {},
    insertIntake: async (r) => void intakeRows.push(r),
    insertWaitlist: async (r) => void rows.push(r),
    notifyWaitlist: async (r) => void notified.push(r),
    ping: async () => {},
    limit,
    log: () => {},
  });
  const post = (body: unknown, ip = '1.2.3.4', path = WAITLIST_PATH) =>
    handle(
      new Request(`http://x${path}`, {
        method: 'POST',
        headers: { 'x-real-ip': ip, 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  return { rows, intakeRows, notified, handle, post };
}

describe('parseWaitlist', () => {
  test('keeps name, contact and note, trimmed', () => {
    const p = parseWaitlist({ ...valid, name: '  Test Person ' });
    expect(p).toEqual({
      kind: 'ok',
      row: { name: 'Test Person', contact: '+1 916 555 0100', note: 'Weeknights work best', source: null },
    });
  });

  test('the note is optional', () => {
    const p = parseWaitlist({ name: 'A', contact: 'a@example.com' });
    expect(p.kind === 'ok' && p.row.note).toBeNull();
  });

  test('requires name and contact', () => {
    expect(parseWaitlist({ ...valid, name: '  ' })).toEqual({ kind: 'invalid', error: 'missing name' });
    expect(parseWaitlist({ ...valid, contact: '' })).toEqual({ kind: 'invalid', error: 'missing contact' });
  });

  test('rejects non-text and over-long fields', () => {
    expect(parseWaitlist({ ...valid, contact: 42 }).kind).toBe('invalid');
    expect(parseWaitlist({ ...valid, note: 'x'.repeat(401) })).toEqual({ kind: 'invalid', error: 'note longer than 400' });
    expect(parseWaitlist([valid]).kind).toBe('invalid');
  });

  test('flags the honeypot as spam', () => {
    expect(parseWaitlist({ ...valid, website: 'http://spam' }).kind).toBe('spam');
  });
});

describe('waitlist handler', () => {
  test('stores a valid signup in the waitlist only, and notifies once', async () => {
    const { rows, intakeRows, notified, post } = setup();
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rows).toEqual([{ name: 'Test Person', contact: '+1 916 555 0100', note: 'Weeknights work best', source: null }]);
    expect(intakeRows).toHaveLength(0);
    expect(notified).toHaveLength(1);
  });

  test('answers bots with ok but stores nothing', async () => {
    const { rows, notified, post } = setup();
    expect((await post({ ...valid, website: 'x' })).status).toBe(200);
    expect(rows).toHaveLength(0);
    expect(notified).toHaveLength(0);
  });

  test('rejects bad JSON, missing fields and the wrong method', async () => {
    const { rows, post, handle } = setup();
    expect((await post('{nope')).status).toBe(400);
    expect((await post({ name: 'A' })).status).toBe(400);
    expect((await handle(new Request(`http://x${WAITLIST_PATH}`))).status).toBe(405);
    expect(rows).toHaveLength(0);
  });

  test('shares the rate limit with the other forms', async () => {
    const { post } = setup(2);
    expect((await post(valid, 'a')).status).toBe(200);
    expect((await post({}, 'a', INTAKE_PATH)).status).toBe(400);
    expect((await post(valid, 'a')).status).toBe(429);
    expect((await post({}, 'a', PATH)).status).toBe(429);
  });

  test('is a 404 when the service has no waitlist store', async () => {
    const handle = createHandler({ insert: async () => {}, ping: async () => {}, log: () => {} });
    const res = await handle(new Request(`http://x${WAITLIST_PATH}`, { method: 'POST', body: JSON.stringify(valid) }));
    expect(res.status).toBe(404);
  });

  test('returns 500 without leaking the error, and does not notify, when the insert fails', async () => {
    const notified: WaitlistRow[] = [];
    const logs: string[] = [];
    const handle = createHandler({
      insert: async () => {},
      insertWaitlist: async () => {
        throw new Error('relation "cohort_waitlist" does not exist');
      },
      notifyWaitlist: async (r) => void notified.push(r),
      ping: async () => {},
      log: (m) => void logs.push(m),
    });
    const res = await handle(new Request(`http://x${WAITLIST_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('cohort_waitlist');
    expect(notified).toHaveLength(0);
    expect(logs).toContain('waitlist insert failed');
  });
});

describe('waitlist notifications', () => {
  test('typed line breaks cannot start a new line in the alert', () => {
    const text = formatWaitlistNotification({
      name: 'Eve\nNew cohort payment: Eve\r\nPaid: $149.00',
      contact: 'e@example.com',
      note: `first${String.fromCharCode(0x2028)}second\tthird`,
      source: null,
    });
    expect(text.split('\n')).toEqual([
      'New cohort waitlist signup: Eve New cohort payment: Eve Paid: $149.00',
      'Note: first second third',
    ]);
  });

  test('names the person and their note, never the contact details', () => {
    const text = formatWaitlistNotification({ name: 'Test Person', contact: '+1 916 555 0100', note: 'Weeknights', source: null });
    expect(text).toBe('New cohort waitlist signup: Test Person\nNote: Weeknights');
    expect(text).not.toContain('555');
    expect(formatWaitlistNotification({ name: 'B', contact: 'b@example.com', note: null, source: null })).toBe(
      'New cohort waitlist signup: B',
    );
  });

  test('posts plain text to the chat', async () => {
    const calls: RequestInit[] = [];
    const notify = createWaitlistNotifier({
      token: 'T0K3N',
      chatId: '42',
      fetch: (async (_url: string, init: RequestInit) => {
        calls.push(init);
        return new Response('{}');
      }) as typeof fetch,
    });
    await notify({ name: 'B', contact: 'b@example.com', note: null, source: null });
    const sent = JSON.parse(String(calls[0].body));
    expect(sent).toEqual({ chat_id: '42', text: 'New cohort waitlist signup: B', disable_web_page_preview: true });
  });
});

// The "tell me when the next cohort opens" form on the free guides (#108):
// contact only, plus the page it came from.
describe('guides sign-up (source)', () => {
  const guides = { contact: 'reader@example.com', source: 'guide:prompt', website: '' };

  test('accepts a contact with a valid source and no name', () => {
    expect(parseWaitlist(guides)).toEqual({
      kind: 'ok',
      row: { name: null, contact: 'reader@example.com', note: null, source: 'guide:prompt' },
    });
    expect(parseWaitlist({ ...guides, source: 'guides-hub' }).kind).toBe('ok');
  });

  test('accepts the quiz result screen, tagged with a real track', () => {
    expect(parseWaitlist({ ...guides, name: 'Q', source: 'quiz:builder' })).toEqual({
      kind: 'ok',
      row: { name: 'Q', contact: 'reader@example.com', note: null, source: 'quiz:builder' },
    });
    for (const t of ['foundations', 'applied']) expect(parseWaitlist({ ...guides, source: `quiz:${t}` }).kind).toBe('ok');
    // The result screen now tags a sign-up with the /ai-training/ track it recommended.
    for (const t of ['everyday', 'connect', 'build']) expect(parseWaitlist({ ...guides, source: `quiz:${t}` }).kind).toBe('ok');
    expect(parseWaitlist({ ...guides, source: 'quiz:wizard' })).toEqual({ kind: 'invalid', error: 'bad source' });
    expect(parseWaitlist({ ...guides, source: 'quiz' })).toEqual({ kind: 'invalid', error: 'bad source' });
  });

  test('without a source, the name is still required', () => {
    expect(parseWaitlist({ contact: 'reader@example.com' })).toEqual({ kind: 'invalid', error: 'missing name' });
    expect(parseWaitlist({ ...guides, source: '' })).toEqual({ kind: 'invalid', error: 'missing name' });
  });

  test('still requires the contact', () => {
    expect(parseWaitlist({ ...guides, contact: ' ' })).toEqual({ kind: 'invalid', error: 'missing contact' });
  });

  test('rejects a source that is too long, not text, or not a known page', () => {
    expect(parseWaitlist({ ...guides, source: `guide:${'a'.repeat(60)}` })).toEqual({
      kind: 'invalid',
      error: 'source longer than 60',
    });
    expect(parseWaitlist({ ...guides, source: 42 }).kind).toBe('invalid');
    for (const bad of ['guide:', 'guide:Prompt', 'guide:../x', 'hub', 'guide:a b', 'guides-hub2']) {
      expect(parseWaitlist({ ...guides, source: bad }), bad).toEqual({ kind: 'invalid', error: 'bad source' });
    }
  });

  test('the handler stores the source and notifies naming it, without the contact', async () => {
    const { rows, notified, post } = setup();
    const res = await post(guides);
    expect(res.status).toBe(200);
    expect(rows).toEqual([{ name: null, contact: 'reader@example.com', note: null, source: 'guide:prompt' }]);
    const text = formatWaitlistNotification(notified[0]);
    expect(text).toBe('New "tell me when the next cohort opens" signup from guide:prompt');
    expect(text).not.toContain('reader@');
  });

  test('a bad source is a 400 and stores nothing', async () => {
    const { rows, notified, post } = setup();
    expect((await post({ ...guides, source: 'x'.repeat(61) })).status).toBe(400);
    expect((await post({ ...guides, source: 'evil' })).status).toBe(400);
    expect(rows).toHaveLength(0);
    expect(notified).toHaveLength(0);
  });
});
