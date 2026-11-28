import { describe, expect, test } from 'bun:test';
import { createHandler, INTAKE_PATH, PATH } from '../src/app';
import { INTAKE_OPTIONS, parseIntake, type IntakeRow } from '../src/intake';
import { createIntakeNotifier, formatIntakeNotification } from '../src/notify';
import type { Row } from '../src/validate';

const valid = {
  name: 'Test Person',
  contact: '+1 916 555 0100',
  weeklyTask: 'Every week I turn the sign-up sheet into a schedule using Sheets, it takes an hour, and done means reminders went out.',
  timeTaken: '1-2h',
  inputs: ['spreadsheet', 'email'],
  tools: ['gemini-free', 'chatgpt-paid'],
  workRestricts: 'not-sure',
  track: 'everyday',
  privateConcerns: 'Volunteer phone numbers',
  recordingConsent: true,
  website: '',
};

const connectAnswers = { platform: 'microsoft', account: 'work' };
const buildAnswers = { os: 'mac', coding: 'some', buildIdea: 'A bot that sorts my inbox' };

describe('track-specific questions', () => {
  test('Connect requires platform and account, and keeps them', () => {
    expect(parseIntake({ ...valid, track: 'connect' })).toEqual({ kind: 'invalid', error: 'missing platform' });
    expect(parseIntake({ ...valid, track: 'connect', platform: 'google' })).toEqual({ kind: 'invalid', error: 'missing account' });
    const p = parseIntake({ ...valid, track: 'connect', ...connectAnswers });
    expect(p.kind === 'ok' && p.row.extras).toEqual(connectAnswers);
  });

  test('Build requires OS and coding experience; the idea is optional and capped', () => {
    expect(parseIntake({ ...valid, track: 'build', os: 'mac' })).toEqual({ kind: 'invalid', error: 'missing coding' });
    const p = parseIntake({ ...valid, track: 'build', ...buildAnswers });
    expect(p.kind === 'ok' && p.row.extras).toEqual(buildAnswers);
    const { buildIdea, ...noIdea } = buildAnswers;
    const q = parseIntake({ ...valid, track: 'build', ...noIdea });
    expect(q.kind === 'ok' && q.row.extras).toEqual(noIdea);
    expect(parseIntake({ ...valid, track: 'build', ...buildAnswers, buildIdea: 'x'.repeat(401) })).toEqual({
      kind: 'invalid',
      error: 'buildIdea longer than 400',
    });
  });

  test("rejects unknown values, and drops another track's answers", () => {
    expect(parseIntake({ ...valid, track: 'connect', ...connectAnswers, platform: 'yahoo' })).toEqual({
      kind: 'invalid',
      error: 'bad value for platform',
    });
    const p = parseIntake({ ...valid, ...connectAnswers, ...buildAnswers });
    expect(p.kind === 'ok' && p.row.extras).toEqual({});
  });

  test('rejects the old quiz track names', () => {
    expect(parseIntake({ ...valid, track: 'applied' })).toEqual({ kind: 'invalid', error: 'bad value for track' });
  });
});

function setup(limit = 10) {
  const rows: IntakeRow[] = [];
  const quizRows: Row[] = [];
  const notified: IntakeRow[] = [];
  const handle = createHandler({
    insert: async (r) => void quizRows.push(r),
    insertIntake: async (r) => void rows.push(r),
    notifyIntake: async (r) => void notified.push(r),
    ping: async () => {},
    limit,
    log: () => {},
  });
  const post = (body: unknown, ip = '1.2.3.4', path = INTAKE_PATH) =>
    handle(
      new Request(`http://x${path}`, {
        method: 'POST',
        headers: { 'x-real-ip': ip, 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  return { rows, quizRows, notified, handle, post };
}

describe('parseIntake', () => {
  test('accepts a complete form and keeps every field', () => {
    const p = parseIntake(valid);
    expect(p.kind).toBe('ok');
    if (p.kind !== 'ok') return;
    expect(p.row).toEqual({
      name: 'Test Person',
      contact: '+1 916 555 0100',
      weeklyTask: valid.weeklyTask,
      timeTaken: '1-2h',
      inputs: ['spreadsheet', 'email'],
      tools: ['gemini-free', 'chatgpt-paid'],
      workRestricts: 'not-sure',
      track: 'everyday',
      privateConcerns: 'Volunteer phone numbers',
      recordingConsent: true,
      extras: {},
    });
  });

  test('optional fields can be left out', () => {
    const { inputs, tools, workRestricts, privateConcerns, ...required } = valid;
    const p = parseIntake(required);
    expect(p.kind).toBe('ok');
    if (p.kind !== 'ok') return;
    expect(p.row.inputs).toEqual([]);
    expect(p.row.tools).toEqual([]);
    expect(p.row.workRestricts).toBeNull();
    expect(p.row.privateConcerns).toBeNull();
  });

  test('flags the honeypot as spam', () => {
    expect(parseIntake({ ...valid, website: 'http://spam' }).kind).toBe('spam');
  });

  test.each([
    ['a missing name', { name: '' }, 'missing name'],
    ['a blank name', { name: '   ' }, 'missing name'],
    ['an over-long name', { name: 'x'.repeat(121) }, 'name longer than 120'],
    ['a missing contact', { contact: undefined }, 'missing contact'],
    ['an over-long contact', { contact: 'x'.repeat(161) }, 'contact longer than 160'],
    ['a missing task', { weeklyTask: '' }, 'missing weeklyTask'],
    ['an over-long task', { weeklyTask: 'x'.repeat(601) }, 'weeklyTask longer than 600'],
    ['a non-string task', { weeklyTask: 42 }, 'expected text for weeklyTask'],
    ['a missing time taken', { timeTaken: '' }, 'missing timeTaken'],
    ['an unknown time taken', { timeTaken: '3h' }, 'bad value for timeTaken'],
    ['a missing track', { track: undefined }, 'missing track'],
    ['an unknown track', { track: 'expert' }, 'bad value for track'],
    ['a token that looks right but is not on the form', { inputs: ['spreadsheet', 'database'] }, 'bad value in inputs'],
    ['an unknown tool', { tools: ['claude', 'grok'] }, 'bad value in tools'],
    ['a formula in a choice', { workRestricts: '=HYPERLINK("x")' }, 'bad value for workRestricts'],
    ['a list that is not a list', { tools: 'claude' }, 'bad list for tools'],
    ['a list longer than the options', { inputs: Array(8).fill('email') }, 'bad list for inputs'],
    ['"none" with another tool', { tools: ['none', 'claude'] }, '"none" cannot be combined with other tools'],
    ['an over-long private note', { privateConcerns: 'x'.repeat(401) }, 'privateConcerns longer than 400'],
    ['no recording consent', { recordingConsent: false }, 'recording consent is required'],
    ['a consent that is truthy but not true', { recordingConsent: 'yes' }, 'recording consent is required'],
  ])('rejects %s', (_, patch, error) => {
    expect(parseIntake({ ...valid, ...patch })).toEqual({ kind: 'invalid', error });
  });

  test('rejects a body that is not an object', () => {
    expect(parseIntake([valid]).kind).toBe('invalid');
    expect(parseIntake(null).kind).toBe('invalid');
  });

  test('every option the page renders is accepted', () => {
    for (const o of INTAKE_OPTIONS.timeTaken) expect(parseIntake({ ...valid, timeTaken: o.value }).kind).toBe('ok');
    const extrasFor = { everyday: {}, connect: connectAnswers, build: buildAnswers };
    for (const o of INTAKE_OPTIONS.track) expect(parseIntake({ ...valid, track: o.value, ...extrasFor[o.value] }).kind).toBe('ok');
    for (const k of ['platform', 'account'] as const)
      for (const o of INTAKE_OPTIONS[k]) expect(parseIntake({ ...valid, ...connectAnswers, track: 'connect', [k]: o.value }).kind).toBe('ok');
    for (const k of ['os', 'coding'] as const)
      for (const o of INTAKE_OPTIONS[k]) expect(parseIntake({ ...valid, ...buildAnswers, track: 'build', [k]: o.value }).kind).toBe('ok');
    for (const o of INTAKE_OPTIONS.workRestricts) expect(parseIntake({ ...valid, workRestricts: o.value }).kind).toBe('ok');
    expect(parseIntake({ ...valid, inputs: INTAKE_OPTIONS.inputs.map((o) => o.value) }).kind).toBe('ok');
    const tools = INTAKE_OPTIONS.tools.map((o) => o.value).filter((v) => v !== 'none');
    expect(parseIntake({ ...valid, tools }).kind).toBe('ok');
  });
});

describe('intake handler', () => {
  test('stores a valid submission and notifies once', async () => {
    const { rows, quizRows, notified, post } = setup();
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].contact).toBe('+1 916 555 0100');
    expect(quizRows).toHaveLength(0);
    expect(notified).toHaveLength(1);
  });

  test('answers bots with ok but stores nothing', async () => {
    const { rows, notified, post } = setup();
    const res = await post({ ...valid, website: 'x' });
    expect(res.status).toBe(200);
    expect(rows).toHaveLength(0);
    expect(notified).toHaveLength(0);
  });

  test('rejects bad JSON, an unknown token, missing consent, wrong method and oversized bodies', async () => {
    const { rows, notified, post, handle } = setup();
    expect((await post('{nope')).status).toBe(400);
    const unknown = await post({ ...valid, track: 'DROP TABLE' });
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({ ok: false, error: 'bad value for track' });
    expect((await post({ ...valid, recordingConsent: false })).status).toBe(400);
    expect((await post({ ...valid, privateConcerns: 'x'.repeat(20_000) })).status).toBe(413);
    expect((await handle(new Request(`http://x${INTAKE_PATH}`))).status).toBe(405);
    expect((await handle(new Request(`http://x${INTAKE_PATH}/more`, { method: 'POST' }))).status).toBe(404);
    expect(rows).toHaveLength(0);
    expect(notified).toHaveLength(0);
  });

  test('shares the rate limit with the quiz', async () => {
    const { post } = setup(2);
    expect((await post(valid, 'a')).status).toBe(200);
    expect((await post({}, 'a', PATH)).status).toBe(400); // a quiz request uses up the same budget
    expect((await post(valid, 'a')).status).toBe(429);
    expect((await post(valid, 'b')).status).toBe(200);
  });

  test('is a 404 when the service has no intake store', async () => {
    const handle = createHandler({ insert: async () => {}, ping: async () => {}, log: () => {} });
    const res = await handle(new Request(`http://x${INTAKE_PATH}`, { method: 'POST', body: JSON.stringify(valid) }));
    expect(res.status).toBe(404);
  });

  test('returns 500 without leaking the error, and does not notify, when the insert fails', async () => {
    const notified: IntakeRow[] = [];
    const handle = createHandler({
      insert: async () => {},
      insertIntake: async () => {
        throw new Error('permission denied for table cohort_intake');
      },
      notifyIntake: async (r) => void notified.push(r),
      ping: async () => {},
      log: () => {},
    });
    const res = await handle(new Request(`http://x${INTAKE_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('permission');
    expect(notified).toHaveLength(0);
  });

  test('a failing notification still returns 200 and is logged', async () => {
    const logs: string[] = [];
    const handle = createHandler({
      insert: async () => {}, insertIntake: async () => {}, ping: async () => {}, log: (m) => void logs.push(m),
      notifyIntake: async () => { throw new Error('telegram down'); },
    });
    const res = await handle(new Request(`http://x${INTAKE_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) }));
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 0));
    expect(logs).toContain('intake notify failed');
  });
});

describe('intake notifications', () => {
  const row = (() => {
    const p = parseIntake(valid);
    if (p.kind !== 'ok') throw new Error('fixture invalid');
    return p.row;
  })();

  test('names the person, track, time taken and task, and leaves contact and private notes out', () => {
    const text = formatIntakeNotification(row);
    expect(text).toBe(
      ['New cohort intake: Test Person', 'Track: Everyday AI', 'Time now: 1–2 hours', `Task: ${valid.weeklyTask}`].join('\n'),
    );
    expect(text).not.toContain('555');
    expect(text).not.toContain('Volunteer phone numbers');
  });

  test('keeps a typed name, task and build idea on their own lines', () => {
    const text = formatIntakeNotification({
      ...row,
      name: 'Eve\nTrack: Build',
      weeklyTask: 'one\ntwo',
      extras: { ...row.extras, buildIdea: 'a bot\nPaid: $149.00' },
    });
    expect(text.split('\n')).toEqual([
      'New cohort intake: Eve Track: Build',
      'Track: Everyday AI',
      'Time now: 1–2 hours',
      'Task: one two',
      'Wants to build: a bot Paid: $149.00',
    ]);
  });

  test('adds the setup and build idea for the technical tracks', () => {
    const p = parseIntake({ ...valid, track: 'build', ...buildAnswers });
    if (p.kind !== 'ok') throw new Error('fixture invalid');
    expect(formatIntakeNotification(p.row)).toContain('Track: Build');
    expect(formatIntakeNotification(p.row)).toContain("Setup: Mac · I've written a little, or used to");
    expect(formatIntakeNotification(p.row)).toContain('Wants to build: A bot that sorts my inbox');
    const c = parseIntake({ ...valid, track: 'connect', ...connectAnswers });
    if (c.kind !== 'ok') throw new Error('fixture invalid');
    expect(formatIntakeNotification(c.row)).toContain('Setup: Microsoft 365 (Outlook, Teams) · A work account');
  });

  test('posts plain text to the chat', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const notify = createIntakeNotifier({
      token: 'T0K3N', chatId: '42',
      fetch: (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{}'); }) as typeof fetch,
    });
    await notify(row);
    expect(calls).toHaveLength(1);
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.chat_id).toBe('42');
    expect(sent.text).toBe(formatIntakeNotification(row));
    expect('parse_mode' in sent).toBe(false);
  });
});
