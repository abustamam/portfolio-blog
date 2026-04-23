// Shared posts dataset + icons. Solo consultancy — single author.

const AUTHOR = {
  name: 'Rasheed Bustamam',
  handle: 'rasheed',
  shortBio: 'Independent software consultant.',
  longBio: 'I am a one-person software consultancy based in California. This is my notebook — writing on the craft and the decisions behind the code.',
  since: 2019,
  location: 'California',
};

const POSTS = [
  {
    slug: 'distributed-locks-without-tears',
    title: 'Distributed locks without tears',
    dek: 'I replaced a client\u2019s homegrown Redis lock with fencing tokens and stopped getting paged at 3am. The full migration diary.',
    date: '2026-04-14', readMin: 14, words: 3120,
    tag: 'Distributed Systems', kind: 'Teardown',
  },
  {
    slug: 'the-case-for-boring-postgres',
    title: 'The case for boring Postgres',
    dek: 'Every client wants to reach for a vector DB on day one. Most of them need a GIN index, a materialized view, and to go home.',
    date: '2026-04-02', readMin: 9, words: 2040,
    tag: 'Databases', kind: 'Essay',
  },
  {
    slug: 'rewriting-a-monolith-we-inherited',
    title: 'Rewriting a monolith, in public',
    dek: 'A 180-day retrospective on taking a 12-year-old Rails app and shipping a strangler migration without a single customer-visible regression.',
    date: '2026-03-21', readMin: 22, words: 5180,
    tag: 'Case Study', kind: 'Case Study',
  },
  {
    slug: 'latency-is-a-feature',
    title: 'Latency is a feature, not a budget',
    dek: 'p99 tail latency shaped the UX of a trading dashboard I rebuilt. I treated 40ms as a design constraint, not an SRE metric.',
    date: '2026-03-09', readMin: 11, words: 2480,
    tag: 'Performance', kind: 'Essay',
  },
  {
    slug: 'what-i-learned-shipping-on-bare-metal',
    title: 'What I learned shipping on bare metal',
    dek: 'Cloud bills caught up with a client and we moved their inference layer to colocated hardware. Six months in: the numbers and the bruises.',
    date: '2026-02-24', readMin: 16, words: 3740,
    tag: 'Infrastructure', kind: 'Case Study',
  },
  {
    slug: 'the-engineering-interview-we-regret',
    title: 'The five-round interview loop I regret building',
    dek: 'I designed this loop for a client in 2019. A postmortem on what it optimized for, what it quietly punished, and what replaced it.',
    date: '2026-02-10', readMin: 8, words: 1820,
    tag: 'Craft', kind: 'Essay',
  },
  {
    slug: 'type-safety-across-the-wire',
    title: 'Type safety across the wire, without a framework',
    dek: 'Five hundred lines of code generation gave a client end-to-end types from Postgres through Go through the browser. No tRPC, no gRPC.',
    date: '2026-01-28', readMin: 13, words: 2960,
    tag: 'Architecture', kind: 'Teardown',
  },
  {
    slug: 'observability-for-small-teams',
    title: 'Observability for teams of five',
    dek: 'You do not need a data platform. You need three dashboards, two alerts, and one runbook everyone can find in under a minute.',
    date: '2026-01-12', readMin: 7, words: 1540,
    tag: 'Operations', kind: 'Essay',
  },
  {
    slug: 'migrating-6tb-of-events',
    title: 'Migrating 6TB of events with zero downtime',
    dek: 'A client ran Kafka on self-managed EC2 for four years. Cutting over to MSK, live, took nine weeks and three coffee machines.',
    date: '2025-12-20', readMin: 18, words: 4290,
    tag: 'Case Study', kind: 'Case Study',
  },
  {
    slug: 'why-i-still-write-http-handlers-by-hand',
    title: 'Why I still write HTTP handlers by hand',
    dek: 'Frameworks buy you a weekend and cost you a year. A defense of the forty-line handler, the boring middleware, and the explicit router.',
    date: '2025-12-05', readMin: 10, words: 2200,
    tag: 'Craft', kind: 'Essay',
  },
];

POSTS.forEach(p => { p.author = AUTHOR.name; });

const TAGS = [
  { name: 'All', count: POSTS.length },
  { name: 'Distributed Systems', count: POSTS.filter(p=>p.tag==='Distributed Systems').length },
  { name: 'Architecture', count: POSTS.filter(p=>p.tag==='Architecture').length },
  { name: 'Performance', count: POSTS.filter(p=>p.tag==='Performance').length },
  { name: 'Infrastructure', count: POSTS.filter(p=>p.tag==='Infrastructure').length },
  { name: 'Databases', count: POSTS.filter(p=>p.tag==='Databases').length },
  { name: 'Operations', count: POSTS.filter(p=>p.tag==='Operations').length },
  { name: 'Case Study', count: POSTS.filter(p=>p.tag==='Case Study').length },
  { name: 'Craft', count: POSTS.filter(p=>p.tag==='Craft').length },
];

const POST_BODY = {
  toc: [
    { id: 'the-incident', label: 'The incident', depth: 1 },
    { id: 'what-we-had', label: 'What the client had', depth: 1 },
    { id: 'fencing-tokens', label: 'Fencing tokens, briefly', depth: 2 },
    { id: 'the-migration', label: 'The migration', depth: 1 },
    { id: 'step-1-shadow', label: 'Step 1 — Shadow reads', depth: 2 },
    { id: 'step-2-cutover', label: 'Step 2 — Cutover', depth: 2 },
    { id: 'step-3-cleanup', label: 'Step 3 — Cleanup', depth: 2 },
    { id: 'what-broke', label: 'What broke anyway', depth: 1 },
    { id: 'what-we-kept', label: 'What we kept', depth: 1 },
  ],
};

function BustamamMark({ size = 24, color = 'currentColor', weight = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="14" height="7.5" rx="1" stroke={color} strokeWidth={weight} />
      <rect x="7" y="13.5" width="14" height="7.5" rx="1" stroke={color} strokeWidth={weight} />
    </svg>
  );
}

function fmtDate(iso, { long = false } = {}) {
  const d = new Date(iso + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const longM = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return long
    ? `${longM[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')} ${d.getFullYear()}`;
}

Object.assign(window, { POSTS, TAGS, POST_BODY, AUTHOR, BustamamMark, fmtDate });
