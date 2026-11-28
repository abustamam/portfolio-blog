// Stripe webhook for the cohort payment link: verifies the signature and turns
// a completed, paid checkout into a short Telegram message. No Stripe SDK and
// no API key: the event body carries everything the message needs.
import { oneLine } from './text';

/** Stripe's default tolerance for the signed timestamp. */
const TOLERANCE_S = 5 * 60;

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time compare of two hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sign(secret: string, timestamp: number, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`)));
}

/**
 * Checks a `Stripe-Signature` header (`t=<unix>,v1=<hex>[,v1=...]`) against the
 * raw body, as Stripe documents: HMAC-SHA256 of `${t}.${body}` with the
 * endpoint's signing secret, and a timestamp within five minutes.
 */
export async function verifyStripeSignature(
  header: string | null,
  payload: string,
  secret: string,
  nowS = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!header) return false;
  let t = NaN;
  const sigs: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k === 't') t = Number(v);
    else if (k === 'v1' && v) sigs.push(v);
  }
  if (!Number.isFinite(t) || sigs.length === 0) return false;
  if (Math.abs(nowS - t) > TOLERANCE_S) return false;
  const expected = await sign(secret, t, payload);
  return sigs.some((s) => safeEqual(s, expected));
}

export interface Payment {
  name: string;
  /** Smallest currency unit, as Stripe sends it. */
  amount: number;
  currency: string;
  /** Which track the payment link belongs to, when links are mapped to tracks. */
  track?: string;
}

/** Events that mean money arrived. Cash App and similar can settle later, via the async event. */
const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

/**
 * The payment in a verified event, or null for anything else: other event
 * types, unpaid sessions, and payment links outside `links`. `links` is one
 * payment link id, or a map of payment link id → track name (the payment then
 * carries its track). Unset = any paid checkout.
 */
export function paymentFromEvent(event: unknown, links?: string | Record<string, string>): Payment | null {
  const e = event as { type?: string; data?: { object?: Record<string, any> } };
  if (!e?.type || !PAID_EVENTS.has(e.type)) return null;
  const s = e.data?.object;
  if (!s || s.object !== 'checkout.session' || s.payment_status !== 'paid') return null;
  if (typeof links === 'string' && s.payment_link !== links) return null;
  if (links && typeof links === 'object' && !Object.hasOwn(links, s.payment_link)) return null;
  const name = s.collected_information?.individual_name ?? s.customer_details?.name ?? '(no name)';
  const p: Payment = { name: String(name), amount: Number(s.amount_total ?? 0), currency: String(s.currency ?? 'usd') };
  if (links && typeof links === 'object') p.track = links[s.payment_link];
  return p;
}

/** Plain text like the other notifications. The email and address stay in Stripe. */
export function formatPaymentNotification(p: Payment): string {
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency.toUpperCase() }).format(
    p.amount / 100,
  );
  return [`New cohort payment: ${oneLine(p.name)}`, `Paid: ${money}`, ...(p.track ? [`Track: ${p.track}`] : [])].join('\n');
}
