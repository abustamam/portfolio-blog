import { parseSubmission, type Row } from './validate';
import { createRateLimiter } from './rateLimit';

export const PATH = '/api/ai-quiz';
const MAX_BODY = 16 * 1024;

export interface Deps {
  insert: (row: Row, userAgent: string | null) => Promise<void>;
  ping: () => Promise<void>;
  /** Requests per IP per window. */
  limit?: number;
  windowMs?: number;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
  /** Called after a row is saved. Not awaited; a failure is logged, never returned. */
  notify?: (row: Row) => Promise<void>;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export function createHandler(deps: Deps) {
  const allow = createRateLimiter(deps.limit ?? 10, deps.windowMs ?? 60 * 60 * 1000);
  const log = deps.log ?? ((m, e) => console.log(JSON.stringify({ msg: m, ...e })));

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === `${PATH}/health` && req.method === 'GET') {
      try {
        await deps.ping();
        return json(200, { ok: true, service: 'ai-quiz-intake' });
      } catch {
        return json(503, { ok: false, error: 'database unavailable' });
      }
    }

    if (url.pathname !== PATH) return json(404, { ok: false, error: 'not found' });
    if (req.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' });

    // Caddy sets X-Real-IP from Cf-Connecting-Ip (see docs/ai-quiz-setup.md).
    const ip = req.headers.get('x-real-ip') ?? 'unknown';
    if (!allow(ip)) return json(429, { ok: false, error: 'too many submissions, try again later' });

    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > MAX_BODY) return json(413, { ok: false, error: 'too large' });
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'too large' });

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { ok: false, error: 'invalid JSON' });
    }

    const parsed = parseSubmission(body);
    // Pretend success to bots so they don't adapt.
    if (parsed.kind === 'spam') return json(200, { ok: true });
    if (parsed.kind === 'invalid') return json(400, { ok: false, error: parsed.error });

    try {
      await deps.insert(parsed.row, req.headers.get('user-agent')?.slice(0, 300) ?? null);
    } catch (err) {
      log('insert failed', { error: String(err) });
      return json(500, { ok: false, error: 'could not save' });
    }
    log('saved', { track: parsed.row.track });
    if (deps.notify) {
      deps.notify(parsed.row).catch((err) => log('notify failed', { error: String(err) }));
    }
    return json(200, { ok: true, track: parsed.row.track });
  };
}
