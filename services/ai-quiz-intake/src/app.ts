import { parseSubmission, type Row } from './validate';
import { parseIntake, type IntakeRow } from './intake';
import { parseWaitlist, type WaitlistRow } from './waitlist';
import { createRateLimiter } from './rateLimit';

export const PATH = '/api/ai-quiz';
/** The cohort pre-session form. Under PATH so the existing Caddy route covers it. */
export const INTAKE_PATH = `${PATH}/intake`;
/** The cohort waitlist, where the sold-out payment link points. Same Caddy route. */
export const WAITLIST_PATH = `${PATH}/waitlist`;
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
  /** Saves a cohort intake row. Without it, the intake path is a 404. */
  insertIntake?: (row: IntakeRow, userAgent: string | null) => Promise<void>;
  /** Like notify, for intake rows. */
  notifyIntake?: (row: IntakeRow) => Promise<void>;
  /** Saves a waitlist row. Without it, the waitlist path is a 404. */
  insertWaitlist?: (row: WaitlistRow, userAgent: string | null) => Promise<void>;
  /** Like notify, for waitlist rows. */
  notifyWaitlist?: (row: WaitlistRow) => Promise<void>;
}

type Parse<T> = (raw: unknown) => { kind: 'ok'; row: T } | { kind: 'spam' } | { kind: 'invalid'; error: string };

/** A secondary form under PATH: how to parse it, where to save it, and its log label. */
interface Form<T> {
  label: string;
  parse: Parse<T>;
  insert: (row: T, userAgent: string | null) => Promise<void>;
  notify?: (row: T) => Promise<void>;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export function createHandler(deps: Deps) {
  const allow = createRateLimiter(deps.limit ?? 10, deps.windowMs ?? 60 * 60 * 1000);
  const log = deps.log ?? ((m, e) => console.log(JSON.stringify({ msg: m, ...e })));

  // Each form exists only when the service was given somewhere to save it.
  const forms = new Map<string, Form<any>>();
  if (deps.insertIntake) {
    forms.set(INTAKE_PATH, { label: 'intake', parse: parseIntake, insert: deps.insertIntake, notify: deps.notifyIntake });
  }
  if (deps.insertWaitlist) {
    forms.set(WAITLIST_PATH, { label: 'waitlist', parse: parseWaitlist, insert: deps.insertWaitlist, notify: deps.notifyWaitlist });
  }

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

    const form = forms.get(url.pathname);
    if (url.pathname !== PATH && !form) return json(404, { ok: false, error: 'not found' });
    if (req.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' });

    // One limiter for every form. Caddy sets X-Real-IP from Cf-Connecting-Ip (see docs/ai-quiz-setup.md).
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

    const userAgent = req.headers.get('user-agent')?.slice(0, 300) ?? null;
    if (form) return save(form, body, userAgent);

    const parsed = parseSubmission(body);
    // Pretend success to bots so they don't adapt.
    if (parsed.kind === 'spam') return json(200, { ok: true });
    if (parsed.kind === 'invalid') return json(400, { ok: false, error: parsed.error });

    try {
      await deps.insert(parsed.row, userAgent);
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

  async function save<T>(form: Form<T>, body: unknown, userAgent: string | null): Promise<Response> {
    const parsed = form.parse(body);
    // Pretend success to bots so they don't adapt.
    if (parsed.kind === 'spam') return json(200, { ok: true });
    if (parsed.kind === 'invalid') return json(400, { ok: false, error: parsed.error });

    try {
      await form.insert(parsed.row, userAgent);
    } catch (err) {
      log(`${form.label} insert failed`, { error: String(err) });
      return json(500, { ok: false, error: 'could not save' });
    }
    log(`${form.label} saved`);
    if (form.notify) {
      form.notify(parsed.row).catch((err) => log(`${form.label} notify failed`, { error: String(err) }));
    }
    return json(200, { ok: true });
  }
}
