// The one script behind every <Term> on a page (see Term.astro). Terms are
// plain links in the HTML; this adds a single shared definition card.
//
// Open: pointer hover and keyboard focus, or a tap on a phone. Close: leaving,
// a tap elsewhere, Escape, or focus moving away. The card is moved to sit
// right after its word in the DOM, so Tab goes word, then "More on this".

const TRIGGER = 'a.term[data-term]';
// A term in any of these is not marked: the script turns it back into text.
const EXCLUDED = 'h1, h2, h3, h4, h5, h6, button, summary, code, pre, [data-no-term]';
const CLOSE_DELAY_MS = 140;
const TOUCH_WINDOW_MS = 700;
const GAP = 6;
const MARGIN = 8;

export function initTermPopover(doc: Document = document): void {
  const win = doc.defaultView!;

  // Terms in excluded contexts are plain text.
  for (const el of doc.querySelectorAll<HTMLElement>(TRIGGER)) {
    if (el.closest(EXCLUDED)) el.replaceWith(...Array.from(el.childNodes));
  }
  const triggers = Array.from(doc.querySelectorAll<HTMLAnchorElement>(TRIGGER));
  if (triggers.length === 0) return;

  // The definition now lives in the card; keep the native tooltip from doubling it.
  for (const t of triggers) t.removeAttribute('title');

  const card = doc.createElement('span');
  card.id = 'term-card';
  card.className = 'term-card';
  card.setAttribute('role', 'note');
  card.hidden = true;
  const name = doc.createElement('span');
  name.className = 'term-card__term';
  const short = doc.createElement('span');
  short.className = 'term-card__short';
  const more = doc.createElement('a');
  more.className = 'term-card__more';
  more.textContent = 'More on this';
  card.append(name, short, more);

  let current: HTMLAnchorElement | null = null;
  let closeTimer: number | undefined;
  let touchAt = -Infinity;
  let refocusing = false;
  const touching = () => win.performance.now() - touchAt < TOUCH_WINDOW_MS;

  function place(): void {
    if (!current) return;
    const rects = Array.from(current.getClientRects());
    if (rects.length === 0) return;
    const first = rects[0];
    const last = rects[rects.length - 1];
    const vw = doc.documentElement.clientWidth;
    const vh = win.innerHeight;
    // Measure at the origin of the containing block, then move by the difference.
    card.style.left = '0px';
    card.style.top = '0px';
    const home = card.getBoundingClientRect();
    const w = home.width;
    const h = home.height;
    const spaceBelow = vh - last.bottom - GAP - MARGIN;
    const spaceAbove = first.top - GAP - MARGIN;
    const below = h <= spaceBelow || spaceBelow >= spaceAbove;
    const top = below ? last.bottom + GAP : first.top - GAP - h;
    const anchor = below ? last : first;
    const left = Math.min(Math.max(anchor.left, MARGIN), Math.max(MARGIN, vw - MARGIN - w));
    card.style.left = `${left - home.left}px`;
    card.style.top = `${top - home.top}px`;
    card.dataset.side = below ? 'below' : 'above';
  }

  function open(t: HTMLAnchorElement): void {
    win.clearTimeout(closeTimer);
    if (current === t && !card.hidden) return;
    close();
    current = t;
    name.textContent = t.dataset.termName ?? t.textContent ?? '';
    short.textContent = t.dataset.termShort ?? '';
    more.setAttribute('href', t.getAttribute('href') ?? '');
    t.after(card);
    card.hidden = false;
    t.setAttribute('aria-describedby', card.id);
    t.setAttribute('aria-expanded', 'true');
    place();
  }

  function close(): void {
    win.clearTimeout(closeTimer);
    if (!current) return;
    current.removeAttribute('aria-describedby');
    current.setAttribute('aria-expanded', 'false');
    current = null;
    card.hidden = true;
  }

  const scheduleClose = () => {
    win.clearTimeout(closeTimer);
    closeTimer = win.setTimeout(close, CLOSE_DELAY_MS);
  };

  const triggerOf = (n: EventTarget | null) => (n instanceof Element ? (n.closest(TRIGGER) as HTMLAnchorElement | null) : null);
  const inCard = (n: EventTarget | null) => n instanceof Node && card.contains(n);

  for (const t of triggers) t.setAttribute('aria-expanded', 'false');

  doc.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') touchAt = win.performance.now();
    if (!inCard(e.target) && !triggerOf(e.target)) close();
  });

  // Hover (mouse only; a touch screen fakes it before the tap).
  doc.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = triggerOf(e.target);
    if (t) open(t);
    else if (inCard(e.target)) win.clearTimeout(closeTimer);
  });
  doc.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || !current) return;
    const to = e.relatedTarget;
    if ((triggerOf(e.target) || inCard(e.target)) && !inCard(to) && triggerOf(to) !== current) scheduleClose();
  });

  // Keyboard: focus opens; focus leaving the word and the card closes.
  doc.addEventListener('focusin', (e) => {
    const t = triggerOf(e.target);
    if (t && !touching() && !refocusing) open(t);
    else if (!t && !inCard(e.target)) close();
  });
  doc.addEventListener('focusout', (e) => {
    const to = e.relatedTarget;
    if (!current || inCard(to) || to === current) return;
    if (triggerOf(e.target) === current || inCard(e.target)) close();
  });

  // A pointer click on a word opens or closes the card instead of leaving the
  // page; the card's link does the leaving. Enter on the keyboard (detail 0)
  // follows the link as usual.
  doc.addEventListener('click', (e) => {
    const t = triggerOf(e.target);
    if (!t || e.detail === 0) return;
    e.preventDefault();
    if (touching() && current === t && !card.hidden) close();
    else open(t);
  });

  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !current) return;
    const t = current;
    const hadFocus = inCard(doc.activeElement);
    close();
    if (hadFocus) {
      refocusing = true;
      t.focus({ preventScroll: true });
      refocusing = false;
    }
  });

  win.addEventListener('resize', place);
}

if (typeof document !== 'undefined') initTermPopover();
