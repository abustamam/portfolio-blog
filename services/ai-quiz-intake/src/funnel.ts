// The weekly funnel digest (#109): four counts from data that already exists,
// sent as one Telegram message. No tracker, no cookies, nothing new stored.
//
//   1. Page views   nginx access lines for /ai-guides/*, /ai-quiz/, /ai-training/, read from Loki
//   2. Quiz done    rows in `responses`, by track
//   3. Reserve      Stripe Checkout Sessions created on each track's payment links
//   4. Paid         the same sessions with payment_status: paid
//
// Counts only: no IPs, names or emails reach the message, and nothing here
// writes anywhere. Run by src/digest.ts; see docs/ai-quiz-setup.md.

// ── Bots and link previews ────────────────────────────────────────────────

/**
 * Link previews, crawlers and scripted clients. WhatsApp, Telegram and the rest
 * fetch a page every time a link is posted, and deploy checks and agents use
 * curl, so unfiltered counts are mostly not people. Each token is matched
 * case-insensitively anywhere in the user agent. Kept specific on purpose:
 * in-app browsers (Instagram, Facebook's FBAN/FBAV, Telegram's web view) are
 * people and must not match.
 */
const BOT_TOKENS = [
  'bot', // Googlebot, bingbot, TelegramBot, Twitterbot, Discordbot, Slackbot, LinkedInBot, Applebot, ...
  'crawl',
  'spider',
  'slurp',
  'whatsapp', // WhatsApp/2.x link preview; WhatsApp opens links in the phone's browser, so a person never has it
  'facebookexternalhit', // Facebook, Messenger, Instagram and iMessage previews
  'facebot',
  'embedly',
  'preview', // Google-PageRenderer, Skype's SkypeUriPreview, Bing preview, ...
  'headless', // HeadlessChrome: Playwright and agent test runs
  'lighthouse',
  'curl/',
  'wget/',
  'python-',
  'python/',
  'go-http-client',
  'node-fetch',
  'undici',
  'axios/',
  'okhttp',
  'java/',
  'apache-httpclient',
  'libwww',
  'httpie',
  'bun/',
  'deno/',
  'uptime',
  'monitor',
  'scrapy',
];

/** True for link previews, crawlers, scripts and empty user agents. */
export function isBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim().toLowerCase();
  if (ua === '' || ua === '-') return true;
  // Every mainstream browser sends a Mozilla/... token; a UA without one is a tool.
  if (!ua.includes('mozilla/')) return true;
  return BOT_TOKENS.some((t) => ua.includes(t));
}

// ── nginx access lines ────────────────────────────────────────────────────

export interface AccessLine {
  method: string;
  path: string;
  status: number;
  userAgent: string;
  /** X-Forwarded-For, as nginx logged it. Used only to drop excluded addresses; never kept. */
  forwardedFor: string;
  remoteAddr: string;
}

// nginx's default `main` format, which the portfolio-blog image uses:
// $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" "$http_x_forwarded_for"
const COMBINED =
  /^(\S+) \S+ \S+ \[[^\]]*\] "(\S+) (\S+)[^"]*" (\d{3}) \S+ "(?:[^"\\]|\\.)*" "((?:[^"\\]|\\.)*)"(?: "((?:[^"\\]|\\.)*)")?/;

/** Parses one log line. Accepts the raw nginx line or Docker's JSON wrapper ({"log": "..."}). */
export function parseAccessLine(line: string): AccessLine | null {
  let raw = line.trim();
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { log?: unknown };
      if (typeof j.log === 'string') raw = j.log.trim();
    } catch {
      return null;
    }
  }
  const m = COMBINED.exec(raw);
  if (!m) return null;
  return {
    remoteAddr: m[1],
    method: m[2],
    path: m[3],
    status: Number(m[4]),
    userAgent: m[5],
    forwardedFor: m[6] ?? '',
  };
}

export type Page = 'guides-hub' | 'guide' | 'quiz' | 'training';

/**
 * Which funnel page a request path is, or null. Query strings are ignored,
 * and `/ai-quiz` counts the same as `/ai-quiz/`. Assets (anything with a dot
 * in the last segment) and other /ai-* pages (cohort handouts, the
 * post-deposit page) are not funnel steps.
 */
export function pageOf(path: string): Page | null {
  let p = path.split(/[?#]/, 1)[0];
  if (!p.endsWith('/')) {
    if (/\.[a-z0-9]+$/i.test(p)) return null;
    p += '/';
  }
  if (p === '/ai-guides/') return 'guides-hub';
  if (/^\/ai-guides\/[a-z0-9-]+\/$/.test(p)) return 'guide';
  if (p === '/ai-quiz/') return 'quiz';
  if (p === '/ai-training/') return 'training';
  return null;
}

export interface PageViews {
  'guides-hub': number;
  guide: number;
  quiz: number;
  training: number;
  /** Funnel-page requests dropped as bots or link previews. */
  filtered: number;
  /** Funnel-page requests dropped because they came from an excluded address. */
  excluded: number;
}

/**
 * Counts successful page loads (GET, 200 or 304) per funnel page. Requests
 * from `excludeIps` (the owner's own address, say) are dropped by comparing in
 * memory; no address is stored or returned.
 */
export function countPageViews(lines: Iterable<string>, excludeIps: ReadonlySet<string> = new Set()): PageViews {
  const out: PageViews = { 'guides-hub': 0, guide: 0, quiz: 0, training: 0, filtered: 0, excluded: 0 };
  for (const line of lines) {
    const a = parseAccessLine(line);
    if (!a || a.method !== 'GET' || (a.status !== 200 && a.status !== 304)) continue;
    const page = pageOf(a.path);
    if (!page) continue;
    if (excludeIps.size && fromExcluded(a, excludeIps)) {
      out.excluded += 1;
      continue;
    }
    if (isBot(a.userAgent)) {
      out.filtered += 1;
      continue;
    }
    out[page] += 1;
  }
  return out;
}

function fromExcluded(a: AccessLine, ips: ReadonlySet<string>): boolean {
  if (ips.has(a.remoteAddr)) return true;
  return a.forwardedFor.split(',').some((ip) => ips.has(ip.trim()));
}

/** `1.2.3.4, 5.6.7.8` → a set. Empty or unset → empty set. */
export function parseIpList(spec: string | undefined): Set<string> {
  return new Set((spec ?? '').split(',').map((s) => s.trim()).filter(Boolean));
}

// ── Loki ──────────────────────────────────────────────────────────────────

export const LOKI_QUERY = '{container="portfolio-blog"} |~ "GET /ai-(guides|quiz|training)"';

interface LokiOpts {
  url: string;
  fetch?: typeof fetch;
  /** Lines per request. Loki's default max_entries_limit_per_query is 5000. */
  pageSize?: number;
  /** Stop after this many requests, so a misbehaving Loki can't loop forever. */
  maxPages?: number;
}

/** Every log line matching LOKI_QUERY between start and end (ms), oldest first. */
export async function fetchLokiLines(opts: LokiOpts, startMs: number, endMs: number): Promise<string[]> {
  const f = opts.fetch ?? fetch;
  const pageSize = opts.pageSize ?? 5000;
  const maxPages = opts.maxPages ?? 200;
  const out: string[] = [];
  let start = BigInt(startMs) * 1_000_000n;
  const end = BigInt(endMs) * 1_000_000n;
  for (let i = 0; i < maxPages; i += 1) {
    const q = new URLSearchParams({
      query: LOKI_QUERY,
      start: String(start),
      end: String(end),
      limit: String(pageSize),
      direction: 'forward',
    });
    const res = await f(`${opts.url.replace(/\/$/, '')}/loki/api/v1/query_range?${q}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`loki returned ${res.status}`);
    const body = (await res.json()) as { data?: { result?: { values?: [string, string][] }[] } };
    const values = (body.data?.result ?? []).flatMap((s) => s.values ?? []);
    values.sort((a, b) => (BigInt(a[0]) < BigInt(b[0]) ? -1 : BigInt(a[0]) > BigInt(b[0]) ? 1 : 0));
    for (const [, line] of values) out.push(line);
    if (values.length < pageSize) return out;
    // Next page starts just after the newest line returned.
    start = BigInt(values[values.length - 1][0]) + 1n;
  }
  throw new Error(`loki: more than ${maxPages} pages`);
}

// ── Quiz ──────────────────────────────────────────────────────────────────

/** Quiz result names, as the quiz shows them (src/utils/aiQuiz.ts TRACKS). */
export const QUIZ_RESULT = { foundations: 'Everyday AI', applied: 'Everyday AI', builder: 'Connect or Build' } as const;

// ── Stripe ────────────────────────────────────────────────────────────────

export interface ReserveCounts {
  /** Checkout Sessions created (someone opened the payment link). */
  opened: number;
  /** Of those, paid. */
  paid: number;
}

interface StripeOpts {
  apiKey: string;
  tracks: Record<string, string[]>;
  fetch?: typeof fetch;
}

/** Per track: Checkout Sessions created on its payment links in [startMs, endMs), and how many are paid. */
export async function countReserves(opts: StripeOpts, startMs: number, endMs: number): Promise<Record<string, ReserveCounts>> {
  const f = opts.fetch ?? fetch;

  async function countLink(link: string): Promise<ReserveCounts> {
    const totals = { opened: 0, paid: 0 };
    let after: string | undefined;
    for (let i = 0; i < 50; i += 1) {
      const q = new URLSearchParams({
        payment_link: link,
        limit: '100',
        'created[gte]': String(Math.floor(startMs / 1000)),
        'created[lt]': String(Math.floor(endMs / 1000)),
      });
      if (after) q.set('starting_after', after);
      const res = await f(`https://api.stripe.com/v1/checkout/sessions?${q}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      // Never include the key or the URL in errors.
      if (!res.ok) throw new Error(`stripe returned ${res.status}`);
      const body = (await res.json()) as { data?: { id: string; payment_status?: string }[]; has_more?: boolean };
      const data = body.data ?? [];
      totals.opened += data.length;
      totals.paid += data.filter((s) => s.payment_status === 'paid').length;
      if (!body.has_more || !data.length) return totals;
      after = data[data.length - 1].id;
    }
    throw new Error('stripe: too many pages');
  }

  const entries = await Promise.all(
    Object.entries(opts.tracks).map(async ([track, links]) => {
      const per = await Promise.all(links.map(countLink));
      return [track, per.reduce((a, b) => ({ opened: a.opened + b.opened, paid: a.paid + b.paid }), { opened: 0, paid: 0 })] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ── The message ───────────────────────────────────────────────────────────

/** Each section is its counts, or the reason it could not be read. */
export type Section<T> = { ok: true; value: T } | { ok: false; error: string };

export interface Digest {
  startMs: number;
  endMs: number;
  views: Section<PageViews>;
  quiz: Section<Record<string, number>>;
  reserves: Section<Record<string, ReserveCounts>>;
}

const TRACK_LABEL: Record<string, string> = { everyday: 'Everyday AI', connect: 'Connect', build: 'Build' };
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Plain text, counts only. A section that failed says so, so a broken source
 * is visible in the message instead of reading as zero.
 */
export function formatDigest(d: Digest): string {
  const lines = [`Weekly funnel, ${day(d.startMs)} to ${day(d.endMs)}`];

  lines.push('', '1. Page views (people; bots and link previews removed)');
  if (d.views.ok) {
    const v = d.views.value;
    lines.push(
      `Guides hub ${v['guides-hub']} · Guide pages ${v.guide} · Quiz ${v.quiz} · Training ${v.training}`,
      `Filtered as bots/previews: ${v.filtered}${v.excluded ? ` · Own visits excluded: ${v.excluded}` : ''}`,
    );
  } else lines.push(`Unavailable: ${d.views.error}`);

  lines.push('', '2. Quiz finished, by result');
  if (d.quiz.ok) {
    const q = d.quiz.value;
    const total = Object.values(q).reduce((a, b) => a + b, 0);
    const everyday = (q.foundations ?? 0) + (q.applied ?? 0);
    lines.push(
      `${total} total · Everyday AI ${everyday} (foundations ${q.foundations ?? 0}, applied ${q.applied ?? 0}) · Connect or Build ${q.builder ?? 0}`,
    );
  } else lines.push(`Unavailable: ${d.quiz.error}`);

  lines.push('', '3. Reserve opened (Stripe checkouts started) and 4. Paid, by track');
  if (d.reserves.ok) {
    const r = Object.entries(d.reserves.value);
    if (!r.length) lines.push('No tracks configured (STRIPE_TRACKS)');
    for (const [track, c] of r) lines.push(`${TRACK_LABEL[track] ?? track}: opened ${c.opened}, paid ${c.paid}`);
  } else lines.push(`Unavailable: ${d.reserves.error}`);

  lines.push('', 'Small numbers: a change of a few from last week is noise.');
  return lines.join('\n');
}

/** Runs one section, turning a throw into a visible "unavailable". */
export async function section<T>(run: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (err) {
    return { ok: false, error: (err as Error).message || String(err) };
  }
}
