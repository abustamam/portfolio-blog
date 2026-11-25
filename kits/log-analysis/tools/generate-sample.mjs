// Writes the synthetic sample log for the log-analysis kit, plus the list of
// every fake private value seeded into it (seeded-pii.json). The test reads
// that list, so it knows what must not survive the scrub without trusting the
// scrub's own regexes. Deterministic: the same run always writes the same file.
//
//   node kits/log-analysis/tools/generate-sample.mjs
//
// Everything here is invented. Emails use the reserved example.* domains, IPs
// the documentation ranges (RFC 5737), and card numbers are the public test
// numbers payment providers publish. Not in the zip: it is how the sample was
// made, not part of the hand-off.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('../', import.meta.url));

// Small seeded PRNG (mulberry32) so the file is reproducible.
let seed = 20261103;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rand() * a.length)];
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const chars = (n, set = 'abcdefghijklmnopqrstuvwxyz0123456789') =>
  Array.from({ length: n }, () => set[Math.floor(rand() * set.length)]).join('');

const seeded = new Set();
const s = (v) => (seeded.add(v), v);

// The cast: invented customers, each with an email, user ID and client IP.
const FIRST = ['jane', 'omar', 'li', 'maria', 'sam', 'priya', 'noah', 'ava', 'yusuf', 'grace'];
const LAST = ['doe', 'roe', 'park', 'silva', 'lee', 'khan', 'smith', 'nguyen', 'ali', 'brown'];
const DOMAINS = ['example.com', 'example.net', 'example.org'];
const NETS = ['203.0.113', '198.51.100', '192.0.2'];
const users = FIRST.map((f, i) => ({
  id: `usr_${chars(8)}`,
  email: `${f}.${LAST[i]}@${DOMAINS[i % 3]}`,
  ip: `${NETS[i % 3]}.${int(10, 250)}`,
}));
const CARDS = ['4111 1111 1111 1111', '5555-5555-5555-4444', '4012888888881881', '378282246310005'];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const jwt = () => `eyJhbGciOiJIUzI1NiJ9.eyJ${chars(40, B64)}.${chars(43, B64)}`;
const DB_HOST = '10.0.3.12';

// Clock: 09:00 to about 11:00 UTC on one day, a deploy at 10:00.
let ms = Date.UTC(2026, 10, 3, 9, 0, 0);
const tick = (lo = 20, hi = 80) => (ms += int(lo, hi) * 1000 + int(0, 999));
const ts = () => new Date(ms).toISOString();
const reqId = () => `req-${chars(8, '0123456789abcdef')}`;

const lines = [];
const log = (level, source, msg) => lines.push(`${ts()} ${level.padEnd(5)} [${source}] ${msg}`);

const ROUTES = [
  ['GET', '/api/products', 200],
  ['GET', '/api/products/{id}', 200],
  ['GET', '/api/cart', 200],
  ['POST', '/api/cart/items', 201],
  ['GET', '/api/orders', 200],
  ['GET', '/health', 200],
];

function request(u) {
  const [m, path, status] = pick(ROUTES);
  const p = path.replace('{id}', String(int(100, 999)));
  log('INFO', 'http', `${reqId()} ${m} ${p} ${status} ${int(8, 240)}ms user=${s(u.id)} ip=${s(u.ip)}`);
}

function authDebug(u) {
  log('DEBUG', 'auth', `${reqId()} validating Authorization: Bearer ${s(jwt())} for user=${s(u.id)}`);
}

function signup(u) {
  log('INFO', 'accounts', `${reqId()} new signup email=${s(u.email)} user=${s(u.id)} ip=${s(u.ip)}`);
}

function passwordReset(u) {
  log('INFO', 'accounts', `${reqId()} password reset email sent to ${s(u.email)}`);
}

// Recurring error: the payment gateway times out, all morning.
function paymentTimeout(u) {
  const r = reqId();
  log('INFO', 'http', `${r} POST /api/checkout user=${s(u.id)} ip=${s(u.ip)}`);
  tick(30, 31);
  log('ERROR', 'payments', `${r} PaymentGatewayTimeout: no response from gateway after 30000ms user=${s(u.id)}`);
  log('INFO', 'http', `${r} POST /api/checkout 504 30012ms`);
}

// A bad habit worth catching: a card number written to the log.
function cardDeclined(u) {
  log('WARN', 'payments', `${reqId()} card declined card=${s(pick(CARDS))} user=${s(u.id)} email=${s(u.email)}`);
}

function exportCall(u) {
  const key = s(`demo_key_${chars(24)}`);
  log('INFO', 'http', `${reqId()} GET /api/reports/export?format=csv&api_key=${key} 200 ${int(300, 900)}ms ip=${s(u.ip)}`);
}

// After the 10:00 deploy: a new null reference in order totals, with a trace.
function nullRef(u) {
  const r = reqId();
  log('ERROR', 'orders', `${r} Unhandled exception in GET /api/orders/{id}/total user=${s(u.id)}`);
  lines.push('System.NullReferenceException: Object reference not set to an instance of an object.');
  lines.push('   at Shop.Orders.OrderService.GetTotal(Order order) in /src/Shop/Orders/OrderService.cs:line 88');
  lines.push('   at Shop.Orders.OrdersController.Total(Int32 id) in /src/Shop/Orders/OrdersController.cs:line 41');
  lines.push('   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.Execute(Object controller)');
  log('INFO', 'http', `${r} GET /api/orders/${int(1000, 9999)}/total 500 ${int(12, 40)}ms`);
}

// One-off spike: the database connection pool runs dry for about five minutes.
function poolSpike() {
  log('WARN', 'db', `connection pool at 18/20 host=${s(DB_HOST)}`);
  for (let i = 0; i < 14; i++) {
    tick(2, 25);
    const u = pick(users);
    log('ERROR', 'db', `${reqId()} TimeoutException: could not get a connection from the pool within 5000ms (max=20) user=${s(u.id)}`);
  }
  lines.push('System.TimeoutException: Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool.');
  lines.push('   at Shop.Data.Db.OpenAsync() in /src/Shop/Data/Db.cs:line 23');
  lines.push('   at Shop.Products.ProductRepository.ListAsync() in /src/Shop/Products/ProductRepository.cs:line 57');
  tick(30, 60);
  log('INFO', 'db', `connection pool recovered 6/20 host=${s(DB_HOST)}`);
}

log('INFO', 'app', 'shop-api 2.13.4 started env=production');
log('INFO', 'db', `connected host=${s(DB_HOST)} pool=20`);

const deployAt = Date.UTC(2026, 10, 3, 10, 0, 0);
const spikeAt = Date.UTC(2026, 10, 3, 10, 35, 0);
let deployed = false;
let spiked = false;

while (lines.length < 196) {
  tick();
  if (!deployed && ms >= deployAt) {
    log('INFO', 'deploy', 'rolling out shop-api 2.14.0');
    log('INFO', 'app', 'shop-api 2.14.0 started env=production');
    deployed = true;
    continue;
  }
  if (!spiked && ms >= spikeAt) {
    poolSpike();
    spiked = true;
    continue;
  }
  const u = pick(users);
  const r = rand();
  if (r < 0.55) request(u);
  else if (r < 0.64) authDebug(u);
  else if (r < 0.74) paymentTimeout(u);
  else if (r < 0.79) cardDeclined(u);
  else if (r < 0.84) signup(u);
  else if (r < 0.88) passwordReset(u);
  else if (r < 0.91) exportCall(u);
  else if (deployed && r < 0.99) nullRef(u);
  else request(u);
}

writeFileSync(`${KIT}sample-logs/app.log`, lines.join('\n') + '\n');
writeFileSync(`${KIT}tools/seeded-pii.json`, JSON.stringify([...seeded].sort(), null, 2) + '\n');
console.log(`app.log: ${lines.length} lines, ${seeded.size} seeded values`);
