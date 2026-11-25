import { describe, expect, test } from 'bun:test';
import { createHandler, TRACKS_PATH } from '../src/app';
import { formatPaymentNotification, paymentFromEvent } from '../src/stripe';
import { countsAsDeposit, createTrackCounter, linkToTrack, parseTrackLinks } from '../src/tracks';

const paid = (refunded = false) => ({
  payment_status: 'paid',
  payment_intent: { latest_charge: { refunded } },
});

/** A fake Stripe that answers checkout session lists per payment link. */
function fakeStripe(byLink: Record<string, unknown[]>, opts: { fail?: boolean } = {}) {
  const urls: string[] = [];
  const auth: string[] = [];
  const f = (async (url: string, init: RequestInit) => {
    urls.push(url);
    auth.push(String((init.headers as Record<string, string>).Authorization));
    if (opts.fail) return new Response('{}', { status: 500 });
    const link = new URL(url).searchParams.get('payment_link')!;
    return new Response(JSON.stringify({ data: byLink[link] ?? [] }));
  }) as typeof fetch;
  return { f, urls, auth };
}

describe('parseTrackLinks', () => {
  test('reads tracks and their links, skipping junk', () => {
    expect(parseTrackLinks('everyday=plink_a, plink_b; connect=plink_c;build=;=plink_x;bad=sk_live_1')).toEqual({
      everyday: ['plink_a', 'plink_b'],
      connect: ['plink_c'],
    });
    expect(parseTrackLinks(undefined)).toEqual({});
    expect(linkToTrack({ everyday: ['plink_a', 'plink_b'], connect: ['plink_c'] })).toEqual({
      plink_a: 'everyday',
      plink_b: 'everyday',
      plink_c: 'connect',
    });
  });
});

describe('countsAsDeposit', () => {
  test('counts paid checkouts and drops refunded or unpaid ones', () => {
    expect(countsAsDeposit(paid())).toBe(true);
    expect(countsAsDeposit(paid(true))).toBe(false);
    expect(countsAsDeposit({ payment_status: 'unpaid' })).toBe(false);
    expect(countsAsDeposit({ payment_status: 'paid', payment_intent: 'pi_123' })).toBe(true);
  });
});

describe('createTrackCounter', () => {
  test('sums each track across its links, ignoring refunds, with the key as a bearer token', async () => {
    const { f, urls, auth } = fakeStripe({ plink_full: [paid(), paid(true)], plink_dep: [paid(), paid()], plink_c: [] });
    const count = createTrackCounter({
      apiKey: 'rk_test_1',
      tracks: { everyday: ['plink_full', 'plink_dep'], connect: ['plink_c'] },
      fetch: f,
    });
    expect(await count()).toEqual({ everyday: 3, connect: 0 });
    expect(auth.every((a) => a === 'Bearer rk_test_1')).toBe(true);
    const q = new URL(urls[0]).searchParams;
    expect(q.get('status')).toBe('complete');
    expect(q.getAll('expand[]')).toEqual(['data.payment_intent.latest_charge']);
  });

  test('reuses a count within the TTL, refreshes after it, and serves stale data if Stripe fails', async () => {
    let t = 0;
    const data: Record<string, unknown[]> = { plink_a: [paid()] };
    let fail = false;
    const calls: string[] = [];
    const f = (async (url: string) => {
      calls.push(url);
      if (fail) return new Response('{}', { status: 500 });
      return new Response(JSON.stringify({ data: data.plink_a }));
    }) as typeof fetch;
    const count = createTrackCounter({ apiKey: 'k', tracks: { build: ['plink_a'] }, fetch: f, ttlMs: 1000, now: () => t });
    expect(await count()).toEqual({ build: 1 });
    data.plink_a = [paid(), paid()];
    t = 500;
    expect(await count()).toEqual({ build: 1 });
    expect(calls).toHaveLength(1);
    t = 1500;
    expect(await count()).toEqual({ build: 2 });
    fail = true;
    t = 3000;
    expect(await count()).toEqual({ build: 2 });
  });

  test('throws when Stripe fails and nothing is cached', async () => {
    const { f } = fakeStripe({}, { fail: true });
    const count = createTrackCounter({ apiKey: 'k', tracks: { build: ['plink_a'] }, fetch: f });
    await expect(count()).rejects.toThrow('stripe 500');
  });
});

describe('tracks endpoint', () => {
  const base = { insert: async () => {}, ping: async () => {}, log: () => {} };

  test('returns the counts, rejects other methods, and is a 404 without a counter', async () => {
    const handle = createHandler({ ...base, countTracks: async () => ({ everyday: 1, connect: 0 }) });
    const res = await handle(new Request(`http://x${TRACKS_PATH}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, counts: { everyday: 1, connect: 0 } });
    expect((await handle(new Request(`http://x${TRACKS_PATH}`, { method: 'POST', body: '{}' }))).status).toBe(405);
    expect((await createHandler(base)(new Request(`http://x${TRACKS_PATH}`))).status).toBe(404);
  });

  test('is a 503 without leaking the error when counting fails', async () => {
    const logs: string[] = [];
    const handle = createHandler({
      ...base,
      log: (m) => void logs.push(m),
      countTracks: async () => {
        throw new Error('stripe 401 rk_live_secret');
      },
    });
    const res = await handle(new Request(`http://x${TRACKS_PATH}`));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('rk_live');
    expect(logs).toContain('tracks count failed');
  });
});

describe('webhook with track links', () => {
  const ev = (link: string) => ({
    type: 'checkout.session.completed',
    data: {
      object: {
        object: 'checkout.session',
        payment_status: 'paid',
        payment_link: link,
        amount_total: 2500,
        currency: 'usd',
        collected_information: { individual_name: 'Test Person' },
      },
    },
  });
  const links = { plink_full: 'everyday', plink_c: 'connect' };

  test('accepts any track link, names the track, and ignores other links', () => {
    expect(paymentFromEvent(ev('plink_c'), links)).toEqual({ name: 'Test Person', amount: 2500, currency: 'usd', track: 'connect' });
    expect(paymentFromEvent(ev('plink_other'), links)).toBeNull();
    expect(paymentFromEvent(ev('toString'), links)).toBeNull();
  });

  test('the message names the track', () => {
    expect(formatPaymentNotification({ name: 'B', amount: 2500, currency: 'usd', track: 'connect' })).toBe(
      'New cohort payment: B\nPaid: $25.00\nTrack: connect',
    );
  });
});
