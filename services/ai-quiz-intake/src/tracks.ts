// Live deposit counts for the /ai-training/ track cards. Each track has one or
// more Stripe payment links; a track's count is its paid, unrefunded checkouts.
// Read with a restricted key (Checkout Sessions, PaymentIntents, Charges: read).

/** Parses `everyday=plink_a,plink_b;connect=plink_c` into { everyday: [...], connect: [...] }. */
export function parseTrackLinks(spec: string | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of (spec ?? '').split(';')) {
    const [track, links] = part.split('=', 2).map((s) => s?.trim());
    if (!track || !links) continue;
    const ids = links.split(',').map((s) => s.trim()).filter((s) => s.startsWith('plink_'));
    if (ids.length) out[track] = ids;
  }
  return out;
}

/** plink id → track name, for labelling webhook payments. */
export function linkToTrack(tracks: Record<string, string[]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [track, ids] of Object.entries(tracks)) for (const id of ids) out[id] = track;
  return out;
}

interface Session {
  payment_status?: string;
  payment_intent?: { latest_charge?: { refunded?: boolean } | string | null } | string | null;
}

/** Paid and not fully refunded. A refunded deposit frees its place. */
export function countsAsDeposit(s: Session): boolean {
  if (s.payment_status !== 'paid') return false;
  const pi = s.payment_intent;
  const charge = pi && typeof pi === 'object' ? pi.latest_charge : null;
  return !(charge && typeof charge === 'object' && charge.refunded === true);
}

export interface CounterOpts {
  apiKey: string;
  tracks: Record<string, string[]>;
  fetch?: typeof fetch;
  /** How long a count is reused before Stripe is asked again. */
  ttlMs?: number;
  now?: () => number;
}

export function createTrackCounter(opts: CounterOpts): () => Promise<Record<string, number>> {
  const f = opts.fetch ?? fetch;
  const ttl = opts.ttlMs ?? 60_000;
  const now = opts.now ?? Date.now;
  let cached: { at: number; counts: Record<string, number> } | null = null;

  async function countLink(link: string): Promise<number> {
    const q = new URLSearchParams({ payment_link: link, status: 'complete', limit: '100' });
    q.append('expand[]', 'data.payment_intent.latest_charge');
    const res = await f(`https://api.stripe.com/v1/checkout/sessions?${q}`, {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
    });
    if (!res.ok) throw new Error(`stripe ${res.status}`);
    const body = (await res.json()) as { data?: Session[] };
    return (body.data ?? []).filter(countsAsDeposit).length;
  }

  return async function counts() {
    if (cached && now() - cached.at < ttl) return cached.counts;
    try {
      const entries = await Promise.all(
        Object.entries(opts.tracks).map(async ([track, links]) => {
          const n = await Promise.all(links.map(countLink));
          return [track, n.reduce((a, b) => a + b, 0)] as const;
        }),
      );
      cached = { at: now(), counts: Object.fromEntries(entries) };
      return cached.counts;
    } catch (err) {
      // Stale beats nothing: the page only shows progress.
      if (cached) return cached.counts;
      throw err;
    }
  };
}
