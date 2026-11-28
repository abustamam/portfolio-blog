import { describe, expect, test } from 'bun:test';
import { createHandler, STRIPE_PATH } from '../src/app';
import { formatPaymentNotification, paymentFromEvent, sign, verifyStripeSignature, type Payment } from '../src/stripe';

const SECRET = 'whsec_test_secret';
const LINK = 'plink_cohort';

const session = (over: Record<string, unknown> = {}) => ({
  object: 'checkout.session',
  payment_status: 'paid',
  payment_link: LINK,
  amount_total: 7900,
  currency: 'usd',
  collected_information: { individual_name: 'Test Person' },
  customer_details: { name: 'Test Person', email: 'test@example.com' },
  ...over,
});
const event = (type = 'checkout.session.completed', obj = session()) => ({ id: 'evt_1', type, data: { object: obj } });

async function signedRequest(body: unknown, opts: { secret?: string; t?: number; tamper?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const t = opts.t ?? Math.floor(Date.now() / 1000);
  const v1 = await sign(opts.secret ?? SECRET, t, raw);
  return new Request(`http://x${STRIPE_PATH}`, {
    method: 'POST',
    headers: { 'stripe-signature': `t=${t},v1=${v1}` },
    body: opts.tamper ? raw.replace('7900', '1') : raw,
  });
}

function setup(over: { fail?: boolean; secret?: string | undefined } = {}) {
  const sent: Payment[] = [];
  const handle = createHandler({
    insert: async () => {},
    ping: async () => {},
    log: () => {},
    limit: 1,
    stripeWebhookSecret: 'secret' in over ? over.secret : SECRET,
    stripePaymentLink: LINK,
    notifyPayment: async (p) => {
      if (over.fail) throw new Error('telegram down');
      sent.push(p);
    },
  });
  return { sent, handle };
}

describe('verifyStripeSignature', () => {
  test('accepts a correct signature and rejects a wrong secret, a stale timestamp and a missing header', async () => {
    const now = 1_800_000_000;
    const v1 = await sign(SECRET, now, 'body');
    expect(await verifyStripeSignature(`t=${now},v1=${v1}`, 'body', SECRET, now)).toBe(true);
    expect(await verifyStripeSignature(`t=${now},v1=${v1}`, 'body', 'whsec_other', now)).toBe(false);
    expect(await verifyStripeSignature(`t=${now},v1=${v1}`, 'body', SECRET, now + 301)).toBe(false);
    expect(await verifyStripeSignature(`t=${now},v1=${v1}`, 'body!', SECRET, now)).toBe(false);
    expect(await verifyStripeSignature(null, 'body', SECRET, now)).toBe(false);
    expect(await verifyStripeSignature(`t=${now}`, 'body', SECRET, now)).toBe(false);
  });

  test('accepts when any one of several v1 signatures matches (secret rotation)', async () => {
    const now = 1_800_000_000;
    const v1 = await sign(SECRET, now, 'body');
    expect(await verifyStripeSignature(`t=${now},v1=${'0'.repeat(64)},v1=${v1}`, 'body', SECRET, now)).toBe(true);
  });
});

describe('paymentFromEvent', () => {
  test('reads name and amount from a paid checkout on the cohort link', () => {
    expect(paymentFromEvent(event(), LINK)).toEqual({ name: 'Test Person', amount: 7900, currency: 'usd' });
  });

  test('counts a late-settling payment', () => {
    expect(paymentFromEvent(event('checkout.session.async_payment_succeeded'), LINK)).not.toBeNull();
  });

  test('ignores other event types, unpaid sessions and other payment links', () => {
    expect(paymentFromEvent(event('checkout.session.expired'), LINK)).toBeNull();
    expect(paymentFromEvent(event(undefined, session({ payment_status: 'unpaid' })), LINK)).toBeNull();
    expect(paymentFromEvent(event(undefined, session({ payment_link: 'plink_other' })), LINK)).toBeNull();
    expect(paymentFromEvent({}, LINK)).toBeNull();
  });
});

describe('formatPaymentNotification', () => {
  test('shows name and dollars, never the email', () => {
    const text = formatPaymentNotification({ name: 'Test Person', amount: 7900, currency: 'usd' });
    expect(text).toBe('New cohort payment: Test Person\nPaid: $79.00');
    expect(text).not.toContain('@');
  });

  test('keeps a typed name on one line', () => {
    const text = formatPaymentNotification({ name: 'Eve\nPaid: $1.00', amount: 7900, currency: 'usd' });
    expect(text).toBe('New cohort payment: Eve Paid: $1.00\nPaid: $79.00');
  });
});

describe('stripe webhook route', () => {
  test('a signed paid event sends one notification', async () => {
    const { sent, handle } = setup();
    const res = await handle(await signedRequest(event()));
    expect(res.status).toBe(200);
    expect(sent).toEqual([{ name: 'Test Person', amount: 7900, currency: 'usd' }]);
  });

  test('a tampered body or wrong secret is a 400 and sends nothing', async () => {
    const { sent, handle } = setup();
    expect((await handle(await signedRequest(event(), { tamper: true }))).status).toBe(400);
    expect((await handle(await signedRequest(event(), { secret: 'whsec_wrong' }))).status).toBe(400);
    expect(sent).toEqual([]);
  });

  test('an ignored event is acknowledged with 200 and sends nothing', async () => {
    const { sent, handle } = setup();
    const res = await handle(await signedRequest(event('checkout.session.expired')));
    expect(res.status).toBe(200);
    expect(sent).toEqual([]);
  });

  test('a Telegram failure is a 500 so Stripe retries', async () => {
    const { handle } = setup({ fail: true });
    expect((await handle(await signedRequest(event()))).status).toBe(500);
  });

  test('is not rate limited like the forms', async () => {
    const { sent, handle } = setup();
    for (let i = 0; i < 3; i++) expect((await handle(await signedRequest(event()))).status).toBe(200);
    expect(sent.length).toBe(3);
  });

  test('without a secret configured the path is a 404', async () => {
    const { handle } = setup({ secret: undefined });
    expect((await handle(await signedRequest(event()))).status).toBe(404);
  });
});
