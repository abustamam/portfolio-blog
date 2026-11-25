import { describe, expect, test } from 'bun:test';
import {
  countPageViews,
  countReserves,
  fetchLokiLines,
  formatDigest,
  isBot,
  pageOf,
  parseAccessLine,
  parseIpList,
  section,
  type PageViews,
} from '../src/funnel';

// Real user agents. Previews: what each app sends when a link is posted.
const PREVIEWS = {
  whatsapp: 'WhatsApp/2.23.20.0',
  whatsappAndroid: 'WhatsApp/2.24.1.79 A',
  telegram: 'TelegramBot (like TwitterBot)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  // iMessage's link preview: a Safari UA with the preview tokens appended.
  imessage:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
  slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  twitter: 'Twitterbot/1.0',
  linkedin: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  skype: 'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5 skype-url-preview@microsoft.com',
  google: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bing: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  applebot:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  curl: 'curl/8.5.0',
  wget: 'Wget/1.21.4',
  python: 'python-requests/2.31.0',
  go: 'Go-http-client/2.0',
  node: 'node',
  headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.6778.33 Safari/537.36',
  empty: '-',
};

// People, including in-app browsers, which must not be filtered.
const PEOPLE = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  desktopFirefox: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  desktopEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  instagramInApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone14,5; iOS 17_5; en_US; en; scale=3.00; 1170x2532; 614140340)',
  facebookInApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.38.109;FBBV/614383870;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
};

/** An nginx `main` format line, as the portfolio-blog container logs it. */
const line = (path: string, ua: string, o: { status?: number; method?: string; xff?: string; addr?: string } = {}) =>
  `${o.addr ?? '172.18.0.5'} - - [24/Nov/2026:10:00:00 +0000] "${o.method ?? 'GET'} ${path} HTTP/1.1" ${o.status ?? 200} 5120 "-" "${ua}" "${o.xff ?? '203.0.113.9'}"`;

describe('isBot', () => {
  for (const [name, ua] of Object.entries(PREVIEWS)) {
    test(`filters ${name}`, () => expect(isBot(ua)).toBe(true));
  }
  for (const [name, ua] of Object.entries(PEOPLE)) {
    test(`keeps ${name}`, () => expect(isBot(ua)).toBe(false));
  }
  test('filters a missing user agent', () => {
    expect(isBot(null)).toBe(true);
    expect(isBot('')).toBe(true);
  });
});

describe('parseAccessLine', () => {
  test('reads method, path, status, user agent and forwarded-for', () => {
    expect(parseAccessLine(line('/ai-quiz/?ref=wa', PEOPLE.iphoneSafari, { xff: '198.51.100.7, 172.70.1.1' }))).toEqual({
      remoteAddr: '172.18.0.5',
      method: 'GET',
      path: '/ai-quiz/?ref=wa',
      status: 200,
      userAgent: PEOPLE.iphoneSafari,
      forwardedFor: '198.51.100.7, 172.70.1.1',
    });
  });

  test("unwraps Docker's JSON log wrapper", () => {
    const wrapped = JSON.stringify({ log: `${line('/ai-training/', PEOPLE.desktopFirefox)}\n`, stream: 'stdout' });
    expect(parseAccessLine(wrapped)?.path).toBe('/ai-training/');
  });

  test('ignores lines that are not access lines', () => {
    expect(parseAccessLine('2026/11/24 10:00:00 [notice] 1#1: start worker processes')).toBeNull();
    expect(parseAccessLine('{not json')).toBeNull();
  });
});

describe('pageOf', () => {
  test('maps funnel pages, with or without the slash and query', () => {
    expect(pageOf('/ai-guides/')).toBe('guides-hub');
    expect(pageOf('/ai-guides')).toBe('guides-hub');
    expect(pageOf('/ai-guides/prompt/')).toBe('guide');
    expect(pageOf('/ai-guides/when-ai-is-wrong?x=1')).toBe('guide');
    expect(pageOf('/ai-quiz')).toBe('quiz');
    expect(pageOf('/ai-quiz/')).toBe('quiz');
    expect(pageOf('/ai-training/#everyday')).toBe('training');
  });

  test('skips assets and pages that are not funnel steps', () => {
    for (const p of ['/ai-guides/og.png', '/ai-quiz/x.js', '/ai-training/reserved/', '/ai-cohort/', '/ai-guides/a/b/', '/']) {
      expect(pageOf(p), p).toBeNull();
    }
  });
});

describe('countPageViews', () => {
  test('counts people per page and reports the filtered number', () => {
    const lines = [
      line('/ai-guides/', PEOPLE.iphoneSafari),
      line('/ai-guides/prompt/', PEOPLE.androidChrome),
      line('/ai-guides/never-paste/', PEOPLE.instagramInApp),
      line('/ai-quiz', PEOPLE.desktopFirefox, { status: 304 }),
      line('/ai-training/', PEOPLE.facebookInApp),
      // Previews and tools on funnel pages: filtered.
      line('/ai-quiz/', PREVIEWS.whatsapp),
      line('/ai-quiz/', PREVIEWS.telegram),
      line('/ai-training/', PREVIEWS.imessage),
      line('/ai-guides/', PREVIEWS.curl),
      // Not counted at all: not a page view, failed, or not a funnel page.
      line('/ai-quiz/', PEOPLE.iphoneSafari, { method: 'HEAD' }),
      line('/ai-guides/nope/', PEOPLE.iphoneSafari, { status: 404 }),
      line('/ai-training/', PEOPLE.iphoneSafari, { status: 301 }),
      line('/ai-cohort/', PEOPLE.iphoneSafari),
      line('/ai-guides/card.png', PEOPLE.iphoneSafari),
      'garbage',
    ];
    expect(countPageViews(lines)).toEqual({ 'guides-hub': 1, guide: 2, quiz: 1, training: 1, filtered: 4, excluded: 0 });
  });

  test('drops excluded addresses (owner visits) by remote address or forwarded-for', () => {
    const own = parseIpList(' 198.51.100.7 , ');
    const lines = [
      line('/ai-quiz/', PEOPLE.iphoneSafari, { xff: '198.51.100.7' }),
      line('/ai-quiz/', PEOPLE.iphoneSafari, { xff: '10.0.0.1, 198.51.100.7' }),
      line('/ai-quiz/', PEOPLE.iphoneSafari, { addr: '198.51.100.7', xff: '-' }),
      line('/ai-quiz/', PEOPLE.iphoneSafari, { xff: '203.0.113.9' }),
    ];
    const v = countPageViews(lines, own);
    expect(v.quiz).toBe(1);
    expect(v.excluded).toBe(3);
  });
});

describe('fetchLokiLines', () => {
  test('pages forward from the newest timestamp until a short page', async () => {
    const calls: URLSearchParams[] = [];
    const pages = [
      [
        ['1000000000000000002', 'b'],
        ['1000000000000000001', 'a'],
      ],
      [['1000000000000000003', 'c']],
    ];
    const f = (async (url: string) => {
      const u = new URL(url);
      expect(u.pathname).toBe('/loki/api/v1/query_range');
      calls.push(u.searchParams);
      return new Response(JSON.stringify({ data: { result: [{ stream: {}, values: pages[calls.length - 1] }] } }));
    }) as typeof fetch;
    const lines = await fetchLokiLines({ url: 'http://loki:3100/', fetch: f, pageSize: 2 }, 1_000_000_000_000, 1_000_000_001_000);
    expect(lines).toEqual(['a', 'b', 'c']);
    expect(calls[0].get('query')).toBe('{container="portfolio-blog"} |~ "GET /ai-(guides|quiz|training)"');
    expect(calls[0].get('start')).toBe('1000000000000000000');
    expect(calls[0].get('direction')).toBe('forward');
    expect(calls[1].get('start')).toBe('1000000000000000003');
  });

  test('throws on an error status', async () => {
    const f = (async () => new Response('', { status: 502 })) as unknown as typeof fetch;
    await expect(fetchLokiLines({ url: 'http://loki:3100', fetch: f }, 0, 1)).rejects.toThrow('loki returned 502');
  });
});

describe('countReserves', () => {
  test('counts sessions opened and paid per track, across links and pages, in the window', async () => {
    const urls: URL[] = [];
    const byLink: Record<string, { id: string; payment_status: string }[][]> = {
      plink_a: [
        [
          { id: 'cs_1', payment_status: 'paid' },
          { id: 'cs_2', payment_status: 'unpaid' },
        ],
        [{ id: 'cs_3', payment_status: 'paid' }],
      ],
      plink_b: [[{ id: 'cs_4', payment_status: 'unpaid' }]],
      plink_c: [[]],
    };
    const f = (async (url: string, init: RequestInit) => {
      const u = new URL(url);
      urls.push(u);
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer rk_test');
      const pages = byLink[u.searchParams.get('payment_link')!];
      const page = u.searchParams.get('starting_after') ? 1 : 0;
      return new Response(JSON.stringify({ data: pages[page], has_more: page < pages.length - 1 }));
    }) as typeof fetch;
    const counts = await countReserves(
      { apiKey: 'rk_test', tracks: { everyday: ['plink_a', 'plink_b'], connect: ['plink_c'] }, fetch: f },
      1_700_000_000_000,
      1_700_604_800_000,
    );
    expect(counts).toEqual({ everyday: { opened: 4, paid: 2 }, connect: { opened: 0, paid: 0 } });
    expect(urls[0].searchParams.get('created[gte]')).toBe('1700000000');
    expect(urls[0].searchParams.get('created[lt]')).toBe('1700604800');
    expect(urls.find((u) => u.searchParams.get('starting_after'))?.searchParams.get('starting_after')).toBe('cs_2');
  });

  test('a Stripe error never carries the key', async () => {
    const f = (async () => new Response('', { status: 401 })) as unknown as typeof fetch;
    const err = await countReserves({ apiKey: 'rk_secret', tracks: { build: ['plink_x'] }, fetch: f }, 0, 1).catch((e) => e);
    expect(String(err)).toBe('Error: stripe returned 401');
  });
});

describe('formatDigest', () => {
  const views: PageViews = { 'guides-hub': 5, guide: 11, quiz: 9, training: 4, filtered: 40, excluded: 2 };

  test('four counts, by track, and nothing personal', () => {
    const text = formatDigest({
      startMs: Date.UTC(2026, 10, 17),
      endMs: Date.UTC(2026, 10, 24),
      views: { ok: true, value: views },
      quiz: { ok: true, value: { foundations: 2, applied: 1, builder: 1 } },
      reserves: { ok: true, value: { everyday: { opened: 3, paid: 1 }, connect: { opened: 0, paid: 0 } } },
    });
    expect(text).toBe(
      [
        'Weekly funnel, 2026-11-17 to 2026-11-24',
        '',
        '1. Page views (people; bots and link previews removed)',
        'Guides hub 5 · Guide pages 11 · Quiz 9 · Training 4',
        'Filtered as bots/previews: 40 · Own visits excluded: 2',
        '',
        '2. Quiz finished, by result',
        '4 total · Everyday AI 3 (foundations 2, applied 1) · Connect or Build 1',
        '',
        '3. Reserve opened (Stripe checkouts started) and 4. Paid, by track',
        'Everyday AI: opened 3, paid 1',
        'Connect: opened 0, paid 0',
        '',
        'Small numbers: a change of a few from last week is noise.',
      ].join('\n'),
    );
    expect(text).not.toMatch(/\d+\.\d+\.\d+\.\d+|@/);
  });

  test('a failed source says unavailable instead of reading as zero', async () => {
    const quiz = await section<Record<string, number>>(async () => {
      throw new Error('permission denied for table responses');
    });
    const text = formatDigest({
      startMs: 0,
      endMs: 7 * 86_400_000,
      views: { ok: true, value: { ...views, excluded: 0 } },
      quiz,
      reserves: { ok: false, error: 'STRIPE_API_KEY is not set' },
    });
    expect(quiz.ok).toBe(false);
    expect(text).toContain('Unavailable: permission denied for table responses');
    expect(text).toContain('Unavailable: STRIPE_API_KEY is not set');
    expect(text).not.toContain('Own visits');
  });
});
