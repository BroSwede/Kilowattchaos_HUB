// Kilowattchaos Hub: everything except the 3D viewer (viewer.js) and the zone pages (zones/).
import { loadZone, initGlossaryTips, closeDrawer, slug } from './zones/index.js';
import { api, session as S, isMentor } from './api.js';
import { setRoster, esc, drawer } from './zones/common.js';
import { buildSamples, SAMPLE_CREW, SAMPLE_MENTOR, isSample } from './sample.js';
import { openPrintRequest, enhanceHomePrintCard } from './print-request.js';
import { openDive, topicFor, DIVES, PART_FOR } from './dive/index.js';

// Who is signed in, and the team. Everything below can rely on it.
const BOOT = await api.me();
Object.assign(S, BOOT);
setRoster(BOOT.roster, BOOT.user);
const ME = BOOT.user;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const fmt = (n) => n.toLocaleString('en-US');
const safe = (store) => ({
  get(k) { try { return store().getItem(k); } catch (e) { return null; } },
  set(k, v) { try { store().setItem(k, v); } catch (e) { /* storage blocked */ } },
});
const local = safe(() => localStorage);
const session = safe(() => sessionStorage);
let viewer = null;

// ---------------------------------------------------------------- Robot avatars
const PEOPLE = new Proxy(Object.fromEntries([...SAMPLE_CREW, [SAMPLE_MENTOR, '#4F5049']].concat(BOOT.roster.map((r) => [r.name, r.color]))), { get: (t, k) => t[k] || '#9A968A' });
function bot(color) {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="${color}"/><path d="M20 12.5V8.8" stroke="#222624" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="7.6" r="2.2" fill="#222624"/><rect x="9.5" y="12.5" width="21" height="16" rx="6" fill="#222624"/><circle cx="15.6" cy="20.4" r="2.6" fill="#E8F542"/><circle cx="24.4" cy="20.4" r="2.6" fill="#E8F542"/><rect x="16.5" y="24.6" width="7" height="1.8" rx=".9" fill="#E8F542" opacity=".85"/></svg>`;
}
function paintBots(scope = document) { $$('[data-bot]', scope).forEach((el) => { el.innerHTML = bot(el.dataset.bot); }); }
paintBots();

// ---------------------------------------------------------------- Theme
const mqDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : mqDark.matches);
function syncTheme() {
  const d = isDark();
  $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-checked', String((b.dataset.themeSet === 'dark') === d)));
  if (viewer) viewer.setTheme(d);
}
const savedTheme = local.get('kwc-theme');
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
$$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
  root.dataset.theme = b.dataset.themeSet;
  local.set('kwc-theme', b.dataset.themeSet);
  syncTheme();
}));
mqDark.addEventListener('change', syncTheme);
syncTheme();

// ---------------------------------------------------------------- Motion tokens
function springEasing(k = 500, c = 38, m = 1) {
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m)), wd = w0 * Math.sqrt(1 - z * z);
  const x = (t) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  let T = 2;
  while (T > 0.05 && Math.abs(1 - x(T)) < 0.001) T -= 0.005;
  T += 0.005;
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push(+x((i / 40) * T).toFixed(4));
  pts[40] = 1;
  return { ease: `linear(${pts.join(', ')})`, ms: Math.round(T * 1000) };
}
const SPRING = springEasing();
const hasLinear = !!(window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)'));
if (hasLinear) {
  root.style.setProperty('--spring-ease', SPRING.ease);
  root.style.setProperty('--spring-dur', `${SPRING.ms}ms`);
}

// ---------------------------------------------------------------- Dates (season dates are real; meetings come from the Logbook calendar)
const KICKOFF = new Date(2026, 8, 12);
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const seasonWeek = (d = new Date()) => {
  const days = Math.round((dayStart(d) - KICKOFF) / 864e5);
  return days < 0 ? 0 : Math.floor(days / 7) + 1;
};
const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
function nextMeeting(now = new Date()) {
  for (let i = 0; i < 9; i++) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 15, 30);
    const end = new Date(start.getTime() + 2 * 3600e3);
    if ((start.getDay() === 2 || start.getDay() === 4) && end > now) return { start, end };
  }
  return null;
}
function greeting() {
  const h = new Date().getHours();
  return `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${ME.name}`;
}

// ---------------------------------------------------------------- Zones
const ZONES = [
  { id: 'home', name: 'Home', icon: 'home', subs: ['Dashboard', 'Shop TV', 'Customize'], q: "What's happening, and what's next?" },
  { id: 'robot', name: 'Robot', icon: 'bot', subs: ['3D Explorer', 'Versions', 'Subsystems', 'Specs and parts', 'AR and VR'], q: 'What does our robot look like now, and how did it get here?' },
  { id: 'build', name: 'Build', icon: 'wrench', subs: ['Ideas', 'Mechanism Lab', 'Print Shop', 'Parts and inventory'], q: 'How do we make it better, and can I get that part printed?' },
  { id: 'learn', name: 'Learn', icon: 'book', subs: ['Paths', 'FIRST and BIOBUZZ', 'Setup and FAQ', 'Build tips', 'AI agents', 'Glossary'], q: 'How do I do this, and what do the rules say?' },
  { id: 'code', name: 'Code', icon: 'code', subs: ['BioBuzz XR', 'Our code', 'Snippets', 'Challenges'], q: 'Where do I write code, and does it work?' },
  { id: 'crew', name: 'Crew', icon: 'users', subs: ['Chat', 'Inspiration', 'People', 'Feedback'], q: "What's the team talking about?" },
  { id: 'logbook', name: 'Logbook', icon: 'logbook', subs: ['Calendar', 'Sessions', 'Progress', 'Competitions', 'Portfolio'], q: 'What did we do, and when is the next thing?' },
];

// A pill group with a sliding indicator, used by the zone bar and the design-system demo.
function pillGroup(nav, items, onPick) {
  const ind = nav.querySelector('.zone-ind') || nav.appendChild(Object.assign(document.createElement('span'), { className: 'zone-ind' }));
  ind.setAttribute('aria-hidden', 'true');
  for (const z of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'zone';
    b.dataset.pick = z.id;
    b.title = z.name;
    b.innerHTML = `<span class="ic">${icon(z.icon, 'i sm')}</span><span class="lbl">${z.name}</span>`;
    b.addEventListener('click', () => onPick(z.id));
    nav.appendChild(b);
  }
  let placed = false;
  function place() {
    const a = nav.querySelector('.zone[aria-current="page"]');
    if (!a || !a.offsetWidth) return;
    if (!placed) ind.style.transition = 'none';
    ind.style.width = `${a.offsetWidth}px`;
    ind.style.top = `${a.offsetTop}px`;
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
    if (!placed) { void ind.offsetWidth; ind.style.transition = ''; placed = true; }
  }
  function set(id) {
    $$('.zone', nav).forEach((b) => {
      if (b.dataset.pick === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    place();
    const a = nav.querySelector('.zone[aria-current="page"]');
    if (a && nav.scrollWidth > nav.clientWidth) a.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }
  new ResizeObserver(place).observe(nav);
  if (document.fonts) document.fonts.ready.then(place);
  return { set, place };
}

const zoneBar = pillGroup($('#zones'), ZONES, (id) => setZone(id));
let zone = 'home';

function sparkBot() {
  return `<svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="62" fill="var(--well)" stroke="var(--divider)" stroke-width="1.5"/><path d="M66 34V22" stroke="#4F5049" stroke-width="3" stroke-linecap="round"/><path d="M63 9h9l-5 7h6L61 28l3-8h-5z" fill="#E8F542" stroke="#222624" stroke-width="1.6" stroke-linejoin="round"/><rect x="24" y="52" width="9" height="20" rx="4.5" fill="#4F5049"/><rect x="99" y="52" width="9" height="20" rx="4.5" fill="#4F5049"/><rect x="33" y="34" width="66" height="50" rx="17" fill="#2F3737"/><circle cx="54" cy="58" r="7" fill="#E8F542"/><circle cx="78" cy="58" r="7" fill="#E8F542"/><path d="M57 71q9 6 18 0" stroke="#E8F542" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="44" y="88" width="44" height="22" rx="9" fill="#4F5049"/><circle cx="66" cy="99" r="5" fill="#E8F542"/></svg>`;
}

// ---------------------------------------------------------------- Sections (each zone's pages)
// A labeled rail of its own under the heading, with an icon per section and a sliding dark pill,
// so the pages read as parts of the zone instead of loose filter chips.
const SUB_ICONS = {
  Dashboard: 'home', 'Shop TV': 'play', Customize: 'sliders',
  '3D Explorer': 'bot', Versions: 'commit', Subsystems: 'layers', 'Specs and parts': 'note', 'AR and VR': 'max',
  Ideas: 'bulb', 'Mechanism Lab': 'wrench', 'Print Shop': 'printer', 'Parts and inventory': 'layers',
  Paths: 'arrow', 'FIRST and BIOBUZZ': 'trophy', 'Setup and FAQ': 'help', 'Build tips': 'wrench', 'AI agents': 'sparkle', Glossary: 'book',
  'BioBuzz XR': 'gamepad', 'Our code': 'code', Snippets: 'note', Challenges: 'flag',
  Chat: 'chat', Inspiration: 'sparkle', People: 'users', Feedback: 'help',
  Calendar: 'calendar', Sessions: 'clock', Progress: 'zap', Competitions: 'trophy', Portfolio: 'image',
};
const secBar = document.createElement('nav');
secBar.className = 'secbar';
secBar.innerHTML = '<span class="secbar-lbl" id="secLbl"></span>';
$('.subbar').after(secBar);
secBar.appendChild($('#subtabs'));
$('#subtabs').className = 'sectabs';
let secPlaced = false;
function placeSec() {
  const box = $('#subtabs'), ind = $('.sec-ind', box), a = $('.sec[aria-current="page"]', box);
  if (!ind || !a || !a.offsetWidth) return;
  if (!secPlaced) ind.style.transition = 'none';
  ind.style.width = `${a.offsetWidth}px`;
  ind.style.height = `${a.offsetHeight}px`;
  ind.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
  if (!secPlaced) { void ind.offsetWidth; ind.style.transition = ''; secPlaced = true; }
}
new ResizeObserver(placeSec).observe($('#subtabs'));
if (document.fonts) document.fonts.ready.then(placeSec);
function renderSubtabs(z) {
  const box = $('#subtabs');
  secBar.setAttribute('aria-label', `${z.name} sections`);
  $('#secLbl').innerHTML = `<span class="ic">${icon(z.icon, 'i sm')}</span><span><b>${z.name}</b><small>${z.subs.length} sections</small></span>`;
  box.innerHTML = '<span class="sec-ind" aria-hidden="true"></span>' + z.subs.map((s, i) => `<button class="sec" type="button" data-sub="${i}"><span class="ic">${icon(SUB_ICONS[s] || 'arrow', 'i sm')}</span><span class="lbl">${s}</span></button>`).join('');
  secPlaced = false;
}
$('#subtabs').addEventListener('click', (e) => {
  const c = e.target.closest('[data-sub]');
  if (c) showSub(+c.dataset.sub);
});

let subIdx = 0, cleanup = null, renderSeq = 0;
const zstate = {};
function scrollHubTop() {
  const top = $('#hub').getBoundingClientRect().top;
  if (top < -40) $('#hub').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
function setZone(id, sub = 0, opts = {}) {
  const z = ZONES.find((q) => q.id === id) || ZONES[0];
  const changed = z.id !== zone;
  zone = z.id;
  closePop();
  if (z.id !== 'home' && z.id !== 'robot') setFull(false);
  $('#zoneTitle').textContent = z.name;
  zoneBar.set(z.id);
  const inMore = ['learn', 'code', 'logbook'].includes(z.id);
  $$('#bottomNav button').forEach((b) => {
    const on = b.dataset.zone === z.id || (b.id === 'moreBtn' && inMore);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (changed || !$('#subtabs').children.length) renderSubtabs(z);
  $('#hello').textContent = z.id === 'home' ? greeting() : z.q;
  const i = typeof sub === 'string' ? Math.max(0, z.subs.indexOf(sub)) : sub;
  showSub(i, opts);
  if (changed || opts.scroll) scrollHubTop();
}
function showSub(i, opts = {}) {
  const z = ZONES.find((q) => q.id === zone);
  subIdx = clamp(i | 0, 0, z.subs.length - 1);
  const sub = z.subs[subIdx];
  $$('#subtabs .sec').forEach((c, k) => { if (k === subIdx) c.setAttribute('aria-current', 'page'); else c.removeAttribute('aria-current'); });
  placeSec();
  const act = $(`#subtabs .sec[data-sub="${subIdx}"]`);
  if (act && act.parentElement.scrollWidth > act.parentElement.clientWidth) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (cleanup) { try { cleanup(); } catch (err) { console.error(err); } cleanup = null; }
  closeDrawer();
  const bento = $('#bento'), view = $('#zoneView');
  const withBento = (zone === 'home' && sub !== 'Shop TV') || (zone === 'robot' && sub === '3D Explorer');
  bento.hidden = !withBento;
  bento.classList.toggle('robot-mode', zone === 'robot');
  bento.classList.remove('editing');
  $('#dock').hidden = !(withBento || zone === 'logbook');
  const dash = zone === 'home' && sub === 'Dashboard';
  view.innerHTML = '';
  view.hidden = dash;
  if (!opts.noHash) { try { history.replaceState(null, '', `${location.pathname}${location.search}#${zone}/${slug(sub)}`); } catch (err) { /* history blocked */ } }
  if (dash) return;
  const host = document.createElement('div');
  host.className = 'zone-host';
  view.appendChild(host);
  const seq = ++renderSeq;
  const zid = zone;
  loadZone(zid).then((pages) => {
    if (seq !== renderSeq) return;
    const fn = pages && pages[sub];
    if (!fn) { host.innerHTML = notReady(z, sub); return; }
    const r = fn(host, ctx);
    if (typeof r === 'function') cleanup = r;
  }).catch((err) => {
    console.error(err);
    if (seq === renderSeq) host.innerHTML = notReady(z, sub);
  });
}
function notReady(z, sub) {
  return `<div class="card empty"><div class="art">${sparkBot()}</div><p class="cap">${z.name} · ${sub}</p><h3>This page didn't load.</h3><p>Check your connection and try again.</p><button class="btn primary pill" type="button" data-goto="${z.id}|${sub}">${icon('reset', 'i sm')}Try again</button></div>`;
}
function fromHash() {
  const m = /^#([a-z]+)(?:\/([a-z0-9-]+))?/.exec(location.hash || '');
  const z = m && ZONES.find((q) => q.id === m[1]);
  if (!z) return false;
  const i = m[2] ? z.subs.findIndex((s) => slug(s) === m[2]) : 0;
  setZone(z.id, Math.max(0, i), { noHash: true });
  return true;
}
addEventListener('hashchange', fromHash);

document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-goto]');
  if (g) {
    const [zid, sub] = g.dataset.goto.split('|');
    if (g.dataset.chan) zstate.chan = g.dataset.chan;
    closePop();
    setZone(zid, sub || 0, { scroll: true });
    return;
  }
  const z = e.target.closest('[data-zone]');
  if (z) { setZone(z.dataset.zone); return; }
  const t = e.target.closest('[data-toast]');
  if (t) { toast(t.dataset.toast); closePop(); }
});

// ---------------------------------------------------------------- Team data for Home (real records)
// Everything on the dashboard, the bell and the Shop TV reads from these lists. Empty is normal for a new team.
const DAY_MS = 864e5;
const H = { loaded: false, events: [], rsvps: [], tasks: [], agenda: [], prints: [], sessions: [], versions: [], shoutouts: [], comps: [], prefs: [], issues: [] };
const KIND_KEY = { event: 'events', rsvp: 'rsvps', task: 'tasks', agenda: 'agenda', print: 'prints', session: 'sessions', version: 'versions', shoutout: 'shoutouts', competition: 'comps', pref: 'prefs', issue: 'issues' };
const homeBus = new EventTarget();
const changed = () => homeBus.dispatchEvent(new Event('change'));
async function loadHome(kinds = Object.keys(KIND_KEY)) {
  await Promise.all(kinds.map(async (k) => {
    try { H[KIND_KEY[k]] = (await api.list(k)) || []; } catch (err) { console.error(err); }
  }));
  fillSamples();
  H.loaded = true;
}
// Filler for a new team: each list shows sample records until the team saves its first real one of that kind.
// Samples live only in this tab (ids start with "sample-") and are never sent to the server.
const SAMPLE_KEYS = ['events', 'rsvps', 'comps', 'tasks', 'agenda', 'prints', 'sessions', 'versions', 'shoutouts'];
const sampleOn = new Set();
let samples = null;
function fillSamples() {
  samples = samples || buildSamples(ME, isMentor());
  const real = (k) => H[k].filter((r) => !isSample(r));
  for (const k of SAMPLE_KEYS) {
    const mine = real(k);
    const useSample = !mine.length && !(k === 'rsvps' && real('events').length);
    H[k] = useSample ? samples[k] : mine;
    sampleOn[useSample ? 'add' : 'delete'](k);
  }
}
// After the first real record of a kind is saved, that list switches from samples to the team's own.
function dropSamples(k) { H[k] = H[k].filter((r) => !isSample(r)); sampleOn.delete(k); if (k === 'events') dropSamples('rsvps'); }
const teamSize = () => (sampleOn.has('rsvps') ? Math.max(BOOT.roster.length, SAMPLE_CREW.length + 1) : BOOT.roster.length);
// A "Sample" tag on each dashboard card that is showing filler.
function markSamples() {
  const cards = { '.w-next': ['events'], '.w-tasks': ['tasks'], '.w-plan': ['agenda'], '.w-print': ['prints'], '.w-timeline': ['comps', 'sessions', 'versions'] };
  for (const [sel, keys] of Object.entries(cards)) {
    const head = $(`${sel} .card-head`);
    if (!head) continue;
    let t = $('.sample-tag', head);
    const on = keys.some((k) => sampleOn.has(k));
    if (on && !t) {
      t = Object.assign(document.createElement('span'), { className: 'tag sample-tag', textContent: 'Sample' });
      t.title = 'Filler to show what this card does. It goes away when the team adds its own.';
      const title = $('.card-title', head) || head.firstElementChild;
      title.after(t);
    }
    if (t) t.hidden = !on;
  }
}
const isMentorName = (n) => BOOT.roster.some((r) => r.name === n && r.role === 'mentor');
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseYmd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const atTime = (day, t) => {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(String(t || '').trim());
  if (!m || !day) return null;
  let h = +m[1];
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && h < 8 && m[1].length === 1) h += 12; // "3:30" on a team plan means the afternoon; "07:30" from a time picker stays morning
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, +m[2]);
};
const t12 = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const tShort = (d) => t12(d).replace(/\s?[AP]M$/, '');
function timeRange(a, b) {
  const pa = t12(a).slice(-2), pb = t12(b).slice(-2);
  return pa === pb ? `${tShort(a)}–${tShort(b)} ${pb}` : `${t12(a)}–${t12(b)}`;
}
const recDate = (r) => parseYmd(r.data && (r.data.date || r.data.day)) || new Date(r.created_at);
const txt = (d, keys) => { for (const k of keys) if (d && typeof d[k] === 'string' && d[k].trim()) return d[k].trim(); return ''; };
const whoOf = (d) => {
  const w = d && (d.who ?? d.owner ?? d.assignee);
  return Array.isArray(w) ? w.filter((x) => typeof x === 'string') : typeof w === 'string' && w ? [w] : [];
};
// An event record from Logbook, read whichever way its date and times were saved.
function evInfo(r) {
  const d = r.data || {};
  const iso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v);
  const day = parseYmd(d.date || d.day) || (typeof d.start === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.start) ? parseYmd(d.start) : null);
  let start = null, allDay = false;
  const s0 = d.start ?? d.time ?? d.at;
  if (iso(s0) || typeof s0 === 'number') start = new Date(s0);
  else if (day && s0 && !/^\d{4}-\d{2}-\d{2}$/.test(String(s0))) start = atTime(day, s0);
  if ((!start || isNaN(start)) && day) { start = day; allDay = true; }
  if (!start || isNaN(start)) return null;
  const e0 = d.end ?? d.endTime ?? d.until;
  let end = iso(e0) || typeof e0 === 'number' ? new Date(e0) : e0 ? atTime(start, e0) : null;
  if (!end || isNaN(end) || end <= start) end = allDay ? new Date(start.getTime() + DAY_MS - 1) : new Date(start.getTime() + (Number(d.minutes) || 120) * 60e3);
  const bring = Array.isArray(d.bring) ? d.bring.filter((x) => typeof x === 'string' && x.trim()) : typeof d.bring === 'string' ? d.bring.split(',').map((x) => x.trim()).filter(Boolean) : [];
  return { id: r.id, rec: r, start, end, allDay, title: txt(d, ['title', 'name', 'what']) || 'Team meeting', where: txt(d, ['where', 'place', 'location']), bring, kind: txt(d, ['kind', 'type']) };
}
const allEvents = () => H.events.map(evInfo).filter(Boolean).sort((a, b) => a.start - b.start);
const nextEvent = (now = new Date()) => allEvents().find((e) => e.end > now) || null;
// Whole words only, so "Team meeting" is not mistaken for a league meet.
const isMeet = (e) => /\b(meet|competition|tournament|scrimmage|qualifier|championship)s?\b/i.test(`${e.kind} ${e.title}`);
// Competitions from Logbook (and events marked as a meet), soonest first.
function meets() {
  const out = H.comps.map((r) => {
    const d = r.data || {};
    const at = parseYmd(d.date || d.day || d.start);
    return at ? { id: r.id, at, title: txt(d, ['name', 'title']) || 'Competition', where: txt(d, ['where', 'place', 'location']) } : null;
  }).filter(Boolean);
  for (const e of allEvents()) if (isMeet(e) && !out.some((m) => ymd(m.at) === ymd(e.start))) out.push({ id: e.id, at: dayStart(e.start), title: e.title, where: e.where });
  return out.sort((a, b) => a.at - b.at);
}
// The agenda for today, or the next one a mentor has posted.
function planFor(now = new Date()) {
  const today = ymd(now);
  const recs = H.agenda.map((r) => ({ r, date: (r.data && r.data.date) || ymd(new Date(r.created_at)) }));
  const t = recs.find((x) => x.date === today);
  if (t) return { rec: t.r, date: t.date, today: true };
  const fut = recs.filter((x) => x.date > today).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  return fut ? { rec: fut.r, date: fut.date, today: false } : null;
}
function planItems(plan) {
  if (!plan) return [];
  const day = parseYmd(plan.date);
  const items = Array.isArray(plan.rec.data.items) ? plan.rec.data.items : [];
  return items.filter((a) => a && typeof a.what === 'string' && a.what.trim()).map((a) => {
    const at = atTime(day, a.time);
    return { time: String(a.time || ''), at, t: at ? tShort(at) : String(a.time || ''), what: a.what, sys: a.sys || '', who: Array.isArray(a.who) ? a.who.filter((n) => typeof n === 'string') : [] };
  }).sort((a, b) => (a.at && b.at ? a.at - b.at : 0));
}
const printSt = (r) => String((r.data && r.data.status) || 'queued').toLowerCase();
const printName = (r) => txt(r.data, ['name', 'title', 'what', 'part']) || 'A print';
const printWho = (r) => txt(r.data, ['who', 'by']) || r.author;
function printQueue() {
  const by = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const printing = H.prints.filter((r) => printSt(r) === 'printing').sort(by);
  const queued = H.prints.filter((r) => printSt(r) === 'queued').sort(by);
  const recent = H.prints.filter((r) => ['done', 'failed'].includes(printSt(r)) && Date.now() - new Date(r.updated_at) < 3 * DAY_MS).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  return { printing, queued, recent };
}
const sysColor = (k) => (SYS[k] ? SYS[k].c : 'var(--stone)');
const sysName = (k) => (SYS[k] ? SYS[k].name : k === 'code' ? 'Code' : k === 'learn' ? 'Learn' : k === 'outreach' ? 'Outreach' : k === 'portfolio' ? 'Portfolio' : '');
const TASK_SYS = () => [...SYS_ORDER.filter((k) => k !== 'hardware').map((k) => [k, SYS[k].name]), ['code', 'Code'], ['learn', 'Learn'], ['outreach', 'Outreach'], ['portfolio', 'Portfolio']];
const ago = (t) => {
  const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};
const avBot = (n) => `<span class="av" title="${esc(n)}">${bot(PEOPLE[n])}</span>`;
const loadingRow = (tagName = 'div') => `<${tagName} class="live-empty">Loading the team's data…</${tagName}>`;

// ---------------------------------------------------------------- Header lines
function renderHeader() {
  const now = new Date();
  $('#seasonLine').textContent = `BIOBUZZ 2026–27 · Season week ${seasonWeek(now)} · ${fmtDay.format(now)}`;
  if (zone === 'home') $('#hello').textContent = greeting();
}
// The preview's "Sample" tags come off the cards that now read real data.
$$('.w-next .card-head .tag, .w-timeline .card-head .tag, .w-plan .card-head .tag, .w-print .card-head .tag').forEach((t) => t.remove());
$('#dock').setAttribute('aria-label', 'Season dock');
{ const c = $('.w-print .card-foot .cap'); if (c) c.textContent = 'A mentor starts each print and updates its progress here.'; }
enhanceHomePrintCard();
// A request sent from the pop-up shows up in the Home queue right away.
document.addEventListener('kwc:print-sent', (e) => { if (e.detail && !H.prints.some((r) => r.id === e.detail.id)) { H.prints.unshift({ ...e.detail, author: e.detail.author || ME.name }); changed(); } });

// ---------------------------------------------------------------- Next up (events from Logbook, RSVPs from everyone)
let nextEv = null;
function rsvpFor(evId, userId) { return H.rsvps.find((r) => r.data && r.data.event === evId && r.user_id === userId) || null; }
function goingNames(evId) {
  const seenU = new Set(), names = [];
  for (const r of H.rsvps) {
    if (!r.data || r.data.event !== evId || seenU.has(r.user_id)) continue;
    seenU.add(r.user_id);
    if (r.data.going) names.push(r.author);
  }
  return names;
}
function renderNext() {
  const now = new Date();
  nextEv = nextEvent(now);
  const ev = nextEv;
  const el = $('#nextCount'), what = $('.w-next .next-what'), when = $('#nextWhen'), bring = $('.w-next .bring'), btn = $('#rsvpBtn');
  if (!ev) {
    el.textContent = H.loaded ? 'Nothing yet' : '…';
    el.removeAttribute('aria-label');
    what.textContent = H.loaded ? 'Nothing on the team calendar yet.' : 'Loading the calendar…';
    when.parentElement.hidden = !H.loaded ? true : !isMentor();
    when.textContent = 'Add the next meeting in Logbook.';
    bring.hidden = true;
    $('#goingStack').innerHTML = H.loaded ? '<span class="cap">A mentor adds meetings to the calendar.</span>' : '';
    btn.hidden = !isMentor() || !H.loaded;
    btn.innerHTML = `${icon('plus', 'i sm')}Add event`;
    btn.setAttribute('aria-pressed', 'false');
    return;
  }
  when.parentElement.hidden = false;
  when.textContent = ev.allDay ? `${fmtShort.format(ev.start)} · all day` : `${fmtShort.format(ev.start)} · ${timeRange(ev.start, ev.end)}`;
  what.textContent = ev.where ? `${ev.title} · ${ev.where}` : ev.title;
  bring.hidden = !ev.bring.length;
  bring.innerHTML = `<span class="cap">Bring</span>${ev.bring.map((b) => `<span class="chip-sm">${esc(b)}</span>`).join('')}`;
  if (now >= ev.start) { el.textContent = 'Happening now'; el.removeAttribute('aria-label'); }
  else {
    const mins = Math.max(0, Math.floor((ev.start - now) / 60000));
    const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), mm = mins % 60;
    el.innerHTML = d > 0 ? `${d}<small>d</small>${h}<small>h</small>` : `${h}<small>h</small>${mm}<small>min</small>`;
    el.setAttribute('aria-label', `Starts in ${d ? `${d} days ` : ''}${h} hours${d ? '' : ` ${mm} minutes`}`);
  }
  btn.hidden = false;
  renderGoing();
}
function renderGoing() {
  const ev = nextEv;
  if (!ev) return;
  const names = goingNames(ev.id);
  const mine = rsvpFor(ev.id, ME.id);
  const going = !!(mine && mine.data.going);
  const btn = $('#rsvpBtn');
  btn.setAttribute('aria-pressed', String(going));
  btn.innerHTML = going ? `${icon('check', 'i sm')}Going` : mine ? 'Not going' : 'RSVP';
  btn.setAttribute('aria-label', going ? `You're going to ${ev.title}. Press to change.` : `RSVP to ${ev.title}`);
  $('#goingStack').innerHTML = names.length
    ? names.slice(0, 5).map(avBot).join('') + `<span class="cap">${names.length} of ${teamSize()} going</span>`
    : '<span class="cap">Nobody yet. Be the first!</span>';
}
let rsvpBusy = false;
$('#rsvpBtn').addEventListener('click', async () => {
  const ev = nextEv;
  if (!ev) { if (isMentor()) setZone('logbook', 'Calendar', { scroll: true }); return; }
  if (rsvpBusy) return;
  rsvpBusy = true;
  const mine = rsvpFor(ev.id, ME.id);
  const going = !(mine && mine.data.going);
  const before = mine ? { ...mine.data } : null;
  let temp = null;
  if (mine) mine.data = { ...mine.data, going };
  else { temp = { id: `tmp-${Date.now()}`, user_id: ME.id, author: ME.name, data: { event: ev.id, going }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; H.rsvps.unshift(temp); }
  renderGoing();
  try {
    if (isSample(ev.rec)) { toast(going ? "You're going. This is a sample meeting, so nothing was saved." : "Got it. This is a sample meeting, so nothing was saved."); return; }
    if (mine) await api.update('rsvp', mine.id, { going });
    else Object.assign(temp, await api.create('rsvp', { event: ev.id, going }), { author: ME.name });
    toast(going ? `You're going. See you at ${ev.title.toLowerCase().startsWith('team') ? 'the meeting' : ev.title}!` : "Got it. You're marked as not going.");
  } catch (err) {
    if (mine) mine.data = before; else H.rsvps.splice(H.rsvps.indexOf(temp), 1);
    renderGoing();
    toast(err.message);
  } finally { rsvpBusy = false; }
});

// ---------------------------------------------------------------- My tasks (task records assigned by name)
const DONE_KEEP = 7 * DAY_MS;
function dueText(due, done) {
  const d = parseYmd(due);
  if (!d) return '';
  const days = Math.round((d - dayStart(new Date())) / DAY_MS);
  if (!done && days < 0) return `was due ${fmtShort.format(d)}`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  if (days > 1 && days < 7) return `due ${fmtWeekday.format(d)}`;
  return `due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
function taskList() {
  const team = isMentor();
  const now = Date.now();
  return H.tasks.filter((r) => {
    const d = r.data || {};
    if (!txt(d, ['title', 'text', 'what'])) return false;
    if (!team && !whoOf(d).includes(ME.name)) return false;
    if (d.done && now - new Date(r.updated_at) > DONE_KEEP) return false;
    if (team && !whoOf(d).length) return false;
    return true;
  }).sort((a, b) => {
    const da = !!a.data.done, db = !!b.data.done;
    if (da !== db) return da ? 1 : -1;
    const xa = a.data.due || '9999', xb = b.data.due || '9999';
    if (xa !== xb) return xa < xb ? -1 : 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}
let taskFormOpen = false;
function renderTasks() {
  const ul = $('#tasks');
  const team = isMentor();
  $('#tasksTitle').textContent = team ? 'Team tasks' : 'My tasks';
  const list = taskList();
  const shown = list.slice(0, 6);
  const open = list.filter((r) => !r.data.done).length;
  $('#tasksOpen').textContent = H.loaded ? `${open} open` : '…';
  if (!H.loaded) ul.innerHTML = loadingRow('li');
  else if (!list.length) {
    ul.innerHTML = `<li class="live-empty">${team ? 'No tasks handed out yet. Give someone their first one below.' : 'No tasks for you right now. A mentor can give you one, or pick something up in Build.'}</li>`;
  } else {
    ul.innerHTML = shown.map((r) => {
      const d = r.data, title = txt(d, ['title', 'text', 'what']);
      const bits = [sysName(d.sys), dueText(d.due, d.done)].filter(Boolean);
      if (team) bits.push(`for ${whoOf(d).join(', ')}`);
      else if (r.author && r.author !== ME.name) bits.push(`from ${r.author}`);
      return `<li class="task${d.done ? ' done' : ''}"><button class="check" type="button" data-task="${esc(r.id)}" aria-pressed="${!!d.done}" aria-label="${d.done ? 'Mark not done' : 'Mark done'}: ${esc(title)}">${icon('check')}</button><div><div class="t">${esc(title)}</div><div class="meta"><span class="sdot" style="--c:${sysColor(d.sys)}"></span>${esc(bits.join(' · '))}</div></div></li>`;
    }).join('') + (list.length > shown.length ? `<li class="cap lh-more">${list.length - shown.length} more ${team ? 'on the team' : 'for you'}</li>` : '');
  }
  renderTaskForm();
}
function renderTaskForm() {
  const card = $('.w-tasks');
  let box = $('#taskAdd', card);
  if (!isMentor()) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'taskAdd'; box.className = 'lh-add'; card.appendChild(box); }
  if (taskFormOpen && $('#taskForm', box)) return;
  if (!taskFormOpen) { box.innerHTML = `<button class="btn soft pill" type="button" id="taskNew">${icon('plus', 'i sm')}Give a task</button>`; return; }
  const people = BOOT.roster.filter((r) => r.role !== 'mentor').concat(BOOT.roster.filter((r) => r.role === 'mentor'));
  box.innerHTML = `<form class="lh-form" id="taskForm">
    <label class="field lh-full"><span>Task</span><input class="inp" name="title" maxlength="90" required placeholder="Measure the flywheel's top speed"></label>
    <label class="field"><span>For</span><select class="inp" name="who" required>${people.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}${p.role === 'mentor' ? ' (mentor)' : ''}</option>`).join('')}</select></label>
    <label class="field"><span>Part of</span><select class="inp" name="sys"><option value="">Anything</option>${TASK_SYS().map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
    <label class="field"><span>Due</span><input class="inp" type="date" name="due"></label>
    <div class="lh-btns"><button class="btn ghost pill" type="button" id="taskCancel">Cancel</button><button class="btn primary pill" type="submit">${icon('check', 'i sm')}Save task</button></div>
  </form>`;
  $('input[name=title]', box).focus({ preventScroll: true });
}
$('.w-tasks').addEventListener('click', (e) => {
  if (e.target.closest('#taskNew')) { taskFormOpen = true; renderTaskForm(); }
  else if (e.target.closest('#taskCancel')) { taskFormOpen = false; renderTaskForm(); $('#taskNew').focus(); }
});
$('.w-tasks').addEventListener('submit', async (e) => {
  if (e.target.id !== 'taskForm') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const data = { title: String(f.get('title') || '').trim(), who: [String(f.get('who') || '')].filter(Boolean), sys: String(f.get('sys') || ''), due: String(f.get('due') || ''), done: false };
  if (!data.title) { toast('Give the task a name first.'); return; }
  const sub = $('button[type=submit]', e.target);
  sub.disabled = true;
  try {
    const it = await api.create('task', data);
    dropSamples('tasks');
    H.tasks.unshift({ ...it, author: ME.name });
    taskFormOpen = false;
    renderTasks();
    toast(`Saved. ${data.who[0]} will see it in My tasks.`);
    changed();
  } catch (err) { sub.disabled = false; toast(err.message); }
});
$('#tasks').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-task]');
  if (!b) return;
  const r = H.tasks.find((x) => x.id === b.dataset.task);
  if (!r) return;
  const done = !r.data.done;
  r.data = { ...r.data, done };
  r.updated_at = new Date().toISOString();
  renderTasks();
  const again = $(`[data-task="${CSS.escape(r.id)}"]`);
  if (again) again.focus();
  if (isSample(r)) { changed(); return; }
  try { await api.update('task', r.id, { done }); changed(); }
  catch (err) { r.data = { ...r.data, done: !done }; renderTasks(); toast(err.message); }
});

// ---------------------------------------------------------------- Season timeline (real season dates, real logs)
const SEASON_A = new Date(2026, 8, 1), SEASON_B = new Date(2027, 4, 1);
const pct = (d) => ((d - SEASON_A) / (SEASON_B - SEASON_A)) * 100;
const FIXED = [
  { d: new Date(2026, 8, 12), t: 'Kickoff', s: 'Sep 12', icon: 'flag' },
  { d: new Date(2026, 11, 1), t: 'Hub doors open', s: 'Dec 1', icon: 'zap' },
];
const BANDS = [
  { a: new Date(2026, 11, 21), b: new Date(2027, 0, 2), t: 'Winter break' },
  { a: new Date(2027, 2, 22), b: new Date(2027, 4, 1), t: 'Off-season: make it theirs' },
];
const latestVersion = () => H.versions.slice().sort((a, b) => recDate(b) - recDate(a))[0] || null;
function renderTimeline() {
  const now = new Date();
  const tp = clamp(pct(now), 0, 100);
  let h = `<div class="tl-line"></div><div class="tl-past" style="width:${tp}%"></div>`;
  for (let m = 0; m < 8; m++) {
    const a = new Date(2026, 8 + m, 1), mid = new Date(2026, 8 + m, 15);
    if (m) h += `<span class="tl-tick" style="left:${pct(a)}%"></span>`;
    h += `<span class="tl-month" style="left:${pct(mid)}%">${a.toLocaleDateString('en-US', { month: 'short' })}</span>`;
  }
  for (const b of BANDS) h += `<div class="tl-band" style="left:${pct(b.a)}%;width:${pct(b.b) - pct(b.a)}%"><span>${b.t}</span></div>`;
  const nodes = FIXED.concat(meets().filter((m) => m.at >= SEASON_A && m.at < SEASON_B).map((m) => ({ d: m.at, t: esc(m.title), s: m.at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: 'trophy' })));
  for (const e of nodes) {
    h += `<div class="tl-node${e.d > now ? ' future' : ''}" style="left:${pct(e.d)}%"><div class="tl-lbl">${e.t}<span>${e.s}</span></div><div class="tl-dot">${icon(e.icon, 'i sm')}</div></div>`;
  }
  h += `<div class="tl-today" style="left:${tp}%">Today · week ${seasonWeek(now)}</div>`;
  h += `<div class="tl-elbow" style="left:${tp}%"></div>`;
  const v = latestVersion();
  const vName = v ? txt(v.data, ['name', 'title']) || 'Robot version' : 'StarterBot v0';
  const monthNotes = H.sessions.filter((r) => { const d = recDate(r); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  const q = printQueue();
  const inQ = q.printing.length + q.queued.length;
  h += `<div class="tl-objs" style="left:calc(${tp}% + 26px)">
    <button class="obj" type="button" data-goto="robot|Versions"><span class="oc">${icon('commit', 'i sm')}</span>${esc(vName)}</button>
    <button class="obj" type="button" data-goto="logbook|Sessions"><span class="oc">${icon('note', 'i sm')}</span>${monthNotes ? `Session notes<span class="x">×${monthNotes}</span>` : 'Write a session note'}</button>
    ${inQ ? `<button class="obj" type="button" data-goto="build|Print Shop"><span class="oc">${icon('printer', 'i sm')}</span>In the print queue<span class="x">×${inQ}</span></button>` : ''}
  </div>`;
  $('#tl').innerHTML = h;
  const sc = $('#tlScroll');
  sc.scrollLeft = Math.max(0, (sc.scrollWidth * tp) / 100 - sc.clientWidth * 0.3);
}

// ---------------------------------------------------------------- Today's plan (agenda records; mentors edit inline)
const AGENDA = []; // shared with Logbook through ctx: today's (or the next) plan
let planEditing = false;
function lastRecap() {
  const r = H.sessions.slice().sort((a, b) => recDate(b) - recDate(a) || new Date(b.created_at) - new Date(a.created_at))[0];
  if (!r) return '';
  return txt(r.data, ['summary', 'did', 'what', 'result', 'notes', 'text', 'reflection', 'next', 'title']);
}
function renderPlan() {
  const now = new Date();
  const plan = planFor(now);
  const items = planItems(plan);
  AGENDA.splice(0, AGENDA.length, ...items.map((a) => ({ t: a.t, what: a.what, who: a.who, meta: sysName(a.sys) || 'Everyone', c: sysColor(a.sys) })));
  const head = $('.w-plan .card-head');
  let edit = $('#planEdit', head);
  if (isMentor() && !edit) {
    head.insertAdjacentHTML('beforeend', `<button class="btn ghost pill" type="button" id="planEdit">${icon('note', 'i sm')}Edit plan</button>`);
    edit = $('#planEdit', head);
  }
  if (edit) edit.hidden = planEditing || !H.loaded;
  const ev = nextEvent(now);
  const evToday = ev && ymd(ev.start) === ymd(now) ? ev : null;
  if (planEditing) return;
  if (plan && plan.today) {
    $('#planTitle').textContent = "Today's plan";
    $('#planSub').textContent = evToday && !evToday.allDay ? `Today, ${timeRange(evToday.start, evToday.end)}${evToday.where ? ` · ${evToday.where}` : ''}` : 'Today';
  } else if (plan) {
    const d = parseYmd(plan.date);
    $('#planTitle').textContent = 'Next session';
    $('#planSub').textContent = `No plan for today. Here's the plan for ${Math.round((d - dayStart(now)) / DAY_MS) < 7 ? fmtWeekday.format(d) : fmtShort.format(d)}.`;
  } else {
    $('#planTitle').textContent = "Today's plan";
    $('#planSub').textContent = evToday ? `Today, ${evToday.allDay ? 'all day' : timeRange(evToday.start, evToday.end)}` : '';
  }
  const ol = $('#agenda');
  if (!H.loaded) ol.innerHTML = loadingRow('li');
  else if (!items.length) ol.innerHTML = `<li class="live-empty">${isMentor() ? 'No plan posted yet. Press Edit plan to write today\'s blocks.' : 'No plan posted yet. A mentor adds it before the meeting.'}</li>`;
  else ol.innerHTML = items.map((a) => `<li class="ag"><time>${esc(a.t)}</time><div><div class="what">${esc(a.what)}</div><div class="meta"><span class="sdot" style="--c:${sysColor(a.sys)}"></span>${esc(sysName(a.sys) || 'Everyone')}</div></div><div class="stack">${a.who.map(avBot).join('')}</div></li>`).join('');
  const recap = lastRecap();
  $('#recap').hidden = !recap;
  $('#recap').innerHTML = recap ? `<b>Last time:</b> ${esc(recap.length > 220 ? `${recap.slice(0, 217)}…` : recap)}` : '';
}
const to24 = (t) => { const d = atTime(new Date(), t); return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : ''; };
function planRowHtml(a = {}) {
  const who = Array.isArray(a.who) ? a.who : [];
  return `<div class="lh-prow">
    <input class="inp lh-time" type="time" value="${to24(a.time)}" aria-label="Time">
    <input class="inp lh-what" maxlength="120" value="${esc(a.what || '')}" placeholder="What happens in this block" aria-label="What happens">
    <select class="inp lh-sys" aria-label="Part of the robot"><option value="">Everyone</option>${TASK_SYS().map(([k, n]) => `<option value="${k}"${k === a.sys ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <button class="icon-btn sm lh-del" type="button" aria-label="Remove this block">${icon('x', 'i sm')}</button>
    <div class="lh-who" role="group" aria-label="Who">${BOOT.roster.filter((p) => p.role !== 'mentor').map((p) => `<button type="button" class="lh-chip" data-who="${esc(p.name)}" aria-pressed="${who.includes(p.name)}">${avBot(p.name)}${esc(p.name)}</button>`).join('')}</div>
  </div>`;
}
function openPlanEditor() {
  if (!isMentor()) return;
  planEditing = true;
  const now = new Date();
  const plan = planFor(now);
  const ev = nextEvent(now);
  const date = plan && plan.today ? plan.date : ev ? ymd(ev.start) : ymd(now);
  const rec = H.agenda.find((r) => r.data && r.data.date === date);
  const rows = rec && Array.isArray(rec.data.items) && rec.data.items.length ? rec.data.items : [{ time: '15:30', what: 'Check in and safety glasses on' }, {}];
  $('#planEdit').hidden = true;
  $('#planTitle').textContent = 'Edit the plan';
  $('#planSub').textContent = 'Everyone sees it on Home and the Shop TV.';
  $('#recap').hidden = true;
  $('#agenda').innerHTML = `<li class="lh-planed"><form id="planForm">
    <label class="field lh-date"><span>Day</span><input class="inp" type="date" name="date" value="${date}" required></label>
    <div id="planRows">${rows.map(planRowHtml).join('')}</div>
    <div class="lh-btns"><button class="btn soft pill" type="button" id="planAddRow">${icon('plus', 'i sm')}Add a block</button><span class="lh-sp"></span><button class="btn ghost pill" type="button" id="planCancel">Cancel</button><button class="btn primary pill" type="submit">${icon('check', 'i sm')}Save plan</button></div>
  </form></li>`;
  const form = $('#planForm');
  form.date.addEventListener('change', () => {
    const r = H.agenda.find((x) => x.data && x.data.date === form.date.value);
    if (r && Array.isArray(r.data.items)) $('#planRows').innerHTML = r.data.items.map(planRowHtml).join('');
  });
  $('.w-plan').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  const first = $('.lh-what', form);
  if (first) first.focus({ preventScroll: true });
}
$('.w-plan').addEventListener('click', (e) => {
  if (e.target.closest('#planEdit')) { openPlanEditor(); return; }
  if (e.target.closest('#planCancel')) { planEditing = false; renderPlan(); $('#planEdit').focus(); return; }
  if (e.target.closest('#planAddRow')) { $('#planRows').insertAdjacentHTML('beforeend', planRowHtml()); const all = $$('#planRows .lh-what'); all[all.length - 1].focus(); return; }
  const del = e.target.closest('.lh-del');
  if (del) { del.closest('.lh-prow').remove(); return; }
  const chip = e.target.closest('.lh-chip');
  if (chip) chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
});
$('.w-plan').addEventListener('submit', async (e) => {
  if (e.target.id !== 'planForm') return;
  e.preventDefault();
  const form = e.target;
  const date = form.date.value;
  if (!date) { toast('Pick a day for the plan.'); return; }
  const items = $$('.lh-prow', form).map((row) => ({
    time: $('.lh-time', row).value,
    what: $('.lh-what', row).value.trim(),
    sys: $('.lh-sys', row).value,
    who: $$('.lh-chip[aria-pressed="true"]', row).map((c) => c.dataset.who),
  })).filter((a) => a.what);
  const sub = $('button[type=submit]', form);
  sub.disabled = true;
  try {
    dropSamples('agenda');
    const rec = H.agenda.find((r) => r.data && r.data.date === date);
    if (rec) Object.assign(rec, await api.update('agenda', rec.id, { items }));
    else H.agenda.unshift({ ...(await api.create('agenda', { date, items })), author: ME.name });
    planEditing = false;
    renderPlan();
    toast(items.length ? 'Plan saved. It shows on Home and the Shop TV.' : 'Plan cleared.');
    changed();
  } catch (err) { sub.disabled = false; toast(err.message); }
});

// ---------------------------------------------------------------- Print queue (print records from the Print Shop; read only here)
const RING_C = 2 * Math.PI * 22;
const ringHtml = (p, inner) => `<div class="ring" data-pct="${p}"><svg viewBox="0 0 52 52"><circle class="track" cx="26" cy="26" r="22"/><circle class="val" cx="26" cy="26" r="22" style="stroke-dasharray:${RING_C};stroke-dashoffset:${RING_C * (1 - clamp(p, 0, 100) / 100)}"/></svg><span class="pct">${inner}</span></div>`;
function renderPrints() {
  const box = $('#prints');
  if (!H.loaded) { box.innerHTML = loadingRow(); return; }
  const { printing, queued, recent } = printQueue();
  const rows = [];
  for (const r of printing) {
    const p = clamp(Math.round(Number(r.data.progress) || 0), 0, 100);
    rows.push(`<div class="pr">${ringHtml(p, `${p}%`)}<div><div class="what">${esc(printName(r))}</div><div class="meta"><span class="pulse" aria-hidden="true"></span>Printing${r.data.printer ? ` on ${esc(r.data.printer)}` : ''} · for ${esc(printWho(r))}</div></div></div>`);
  }
  queued.forEach((r, i) => rows.push(`<div class="pr">${ringHtml(0, `#${i + 1}`)}<div><div class="what">${esc(printName(r))}</div><div class="meta">Queued · ${i === 0 ? 'next in line' : `${i + 1}${['st', 'nd', 'rd'][i] || 'th'} in line`} · for ${esc(printWho(r))}</div></div></div>`));
  for (const r of recent) {
    const ok = printSt(r) === 'done';
    rows.push(`<div class="pr">${ringHtml(ok ? 100 : 0, icon(ok ? 'check' : 'alert', 'i sm'))}<div><div class="what">${esc(printName(r))}</div><div class="meta">${ok ? 'Done · ready to pick up' : "Didn't work · a mentor will try again"} · for ${esc(printWho(r))}</div></div></div>`);
  }
  box.innerHTML = rows.length ? rows.slice(0, 4).join('') + (rows.length > 4 ? `<p class="cap">${rows.length - 4} more in the Print Shop</p>` : '') : '<div class="live-empty">Nothing in the print queue right now.</div>';
}

// ---------------------------------------------------------------- Count-ups for the robot vitals
function countUp(el, to, ms, suffix = '') {
  if (reduced) { el.textContent = fmt(to) + suffix; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = clamp((t - t0) / ms, 0, 1);
    el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const seen = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    seen.unobserve(en.target);
    if (en.target.dataset.count) countUp(en.target, +en.target.dataset.count, 900);
  }
}, { threshold: 0.4 });
$$('[data-count]').forEach((el) => seen.observe(el));
document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

// ---------------------------------------------------------------- Season dock (real activity per month)
function renderDock() {
  const now = new Date();
  const months = [];
  for (let m = 0; m < 8; m++) months.push(new Date(2026, 8 + m, 1));
  const inMonth = (d, a) => d.getFullYear() === a.getFullYear() && d.getMonth() === a.getMonth();
  const ms = meets();
  $('#dockTrack').innerHTML = months.map((a, i) => {
    const cur = inMonth(now, a), future = a > now && !cur;
    const items = [];
    if (!future) {
      const n = H.sessions.filter((r) => inMonth(recDate(r), a)).length;
      const p = H.prints.filter((r) => inMonth(new Date(r.created_at), a)).length;
      const v = H.versions.filter((r) => inMonth(recDate(r), a)).length;
      if (n) items.push(['note', n, n === 1 ? 'session note' : 'session notes']);
      if (p) items.push(['printer', p, p === 1 ? 'print' : 'prints']);
      if (v) items.push(['commit', v, v === 1 ? 'robot version' : 'robot versions']);
    }
    if (a.getMonth() === 11 && a.getFullYear() === 2026 && now < new Date(2026, 11, 2)) items.push(['zap', 0, 'Hub doors open']);
    const mm = ms.filter((x) => inMonth(x.at, a) && x.at >= dayStart(now));
    if (mm.length) items.push(['trophy', mm.length > 1 ? mm.length : 0, mm.map((x) => x.title).join(', ')]);
    if (a.getMonth() === 3) items.push(['sparkle', 0, 'off-season']);
    const label = `${a.toLocaleDateString('en-US', { month: 'short' })}`;
    const title = items.length ? items.map(([, n, what]) => (n ? `${n} ${what}` : what)).join(', ') : future ? 'Nothing planned yet' : 'Nothing logged';
    const chips = items.map(([ic, n]) => `<span class="dch">${icon(ic, 'i sm')}${n ? `<span class="b">${n}</span>` : ''}</span>`).join('');
    const y = i === 0 || a.getMonth() === 0 ? `<b>${a.getFullYear()}</b>` : '';
    return `${i ? '<span class="dsep" aria-hidden="true"></span>' : ''}<div class="dm${cur ? ' now' : ''}${future ? ' future' : ''}" title="${esc(`${label}: ${title}`)}"><span class="m">${label}${y}</span>${chips}</div>`;
  }).join('');
  const nowEl = $('.dm.now');
  if (nowEl) { const tr = $('#dockTrack'); tr.scrollLeft = nowEl.offsetLeft - tr.clientWidth / 2 + nowEl.offsetWidth / 2; }
}

function renderHomeAll() {
  markSamples();
  renderNext();
  renderTasks();
  renderTimeline();
  if (!planEditing) renderPlan();
  renderPrints();
  renderDock();
  renderBell();
}
homeBus.addEventListener('change', () => { renderHomeAll(); syncAnchorIssues(); if (sheetPart && sheet.classList.contains('is-open')) renderSheetIssue(); });

// ---------------------------------------------------------------- Edge fade on horizontal scrollers
function edgeFade(el) {
  const upd = () => el.classList.toggle('more-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  el.addEventListener('scroll', upd, { passive: true });
  new ResizeObserver(upd).observe(el);
  new MutationObserver(upd).observe(el, { childList: true });
  upd();
}

// ---------------------------------------------------------------- Popovers, palette, toast
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3600);
}

let pop = null;
function closePop() {
  if (!pop) return;
  pop.anchor.setAttribute('aria-expanded', 'false');
  pop.el.remove();
  pop = null;
}
function showPop(anchor, html, above = false) {
  if (pop && pop.anchor === anchor) { closePop(); return; }
  closePop();
  const el = document.createElement('div');
  el.className = 'pop';
  el.setAttribute('role', 'menu');
  el.innerHTML = html;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${clamp(r.right - w, 12, innerWidth - w - 12)}px`;
  el.style.top = `${above ? Math.max(12, r.top - h - 10) : r.bottom + 10}px`;
  requestAnimationFrame(() => el.classList.add('is-open'));
  pop = { el, anchor };
  anchor.setAttribute('aria-expanded', 'true');
  const first = el.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}
document.addEventListener('pointerdown', (e) => {
  if (pop && !pop.el.contains(e.target) && !pop.anchor.contains(e.target)) closePop();
});
const item = (ic, label, sub, attrs) => `<button class="item" type="button" role="menuitem" ${attrs}><span class="oc">${icon(ic, 'i sm')}</span><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
$('#createBtn').addEventListener('click', (e) => showPop(e.currentTarget, `<h5>Create</h5>
  ${isMentor() ? item('check', 'Task', 'Give someone a job for the next meeting', 'id="mkTask"') : ''}
  ${isMentor() ? item('note', "Today's plan", 'The blocks for the meeting', 'id="mkPlan"') : ''}
  ${isMentor() ? item('calendar', 'Event', 'A meeting or a meet on the calendar', 'data-goto="logbook|Calendar"') : ''}
  ${item('sparkle', 'Shoutout', 'Say thanks to a teammate', 'id="mkShout"')}
  ${item('bulb', 'Idea', 'Pitch a mechanism or a fix', 'data-goto="build|Ideas"')}
  ${item('sparkle', 'Inspiration', 'A video or robot worth studying', 'data-goto="crew|Inspiration"')}
  ${item('printer', 'Print request', 'Send a part with a note', 'data-print-request')}
  ${item('note', 'Session note', 'From the meeting template', 'data-goto="logbook|Sessions"')}
  ${S.team.chatEnabled ? item('help', 'Question', 'Ask in #help, a mentor answers too', 'data-goto="crew|Chat" data-chan="help"') : ''}
  ${item('chat', 'Chat post', S.team.chatEnabled ? 'Post in a team channel' : 'Turns on once a second trained adult is set up', 'data-goto="crew|Chat"')}`));
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-print-request]')) { closePop(); openPrintRequest(ctx); }
  else if (e.target.closest('#mkShout')) { closePop(); openShoutout(); }
  else if (e.target.closest('#mkTask')) { closePop(); goHomeCard('.w-tasks', () => { taskFormOpen = true; renderTaskForm(); }); }
  else if (e.target.closest('#mkPlan')) { closePop(); goHomeCard('.w-plan', () => { if (!planEditing) openPlanEditor(); }); }
});
// Open the dashboard, make sure a card is showing, and scroll to it.
function goHomeCard(sel, then) {
  if (!(zone === 'home' && subIdx === 0)) setZone('home', 0);
  const card = $(sel);
  if (card && card.hidden) { toast('That card is hidden on your Home. Turn it back on in Customize.'); return; }
  if (then) then();
  requestAnimationFrame(() => card && card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }));
}

// ---------------------------------------------------------------- Shoutouts (anyone can give one; the whole team sees it)
function openShoutout(to = '') {
  const people = BOOT.roster.filter((p) => p.name !== ME.name);
  const el = drawer(`<h3 class="card-title" style="margin:0 0 4px">Give a shoutout</h3>
    <p class="cap" style="font-weight:400;margin:0 0 14px">Say what a teammate did that helped. The whole team sees it on Home and the Shop TV.</p>
    <form class="lh-form" id="shoutForm">
      <label class="field lh-full"><span>Who is it for?</span><select class="inp" name="to" required>${people.length ? people.map((p) => `<option value="${esc(p.name)}"${p.name === to ? ' selected' : ''}>${esc(p.name)}</option>`).join('') : '<option value="">Nobody else is on the team yet</option>'}</select></label>
      <label class="field lh-full"><span>What did they do?</span><textarea class="inp" name="text" maxlength="200" required placeholder="Rivet stiffened the launcher mount, and it stopped wobbling."></textarea><small>Keep it kind and about the work. Up to 200 letters.</small></label>
      <div class="lh-btns"><span class="lh-sp"></span><button class="btn primary pill" type="submit">${icon('sparkle', 'i sm')}Send shoutout</button></div>
    </form>`, { label: 'Give a shoutout' });
  const form = $('#shoutForm', el);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { to: form.to.value, text: form.text.value.trim() };
    if (!data.to || !data.text) { toast('Pick a teammate and write what they did.'); return; }
    const sub = $('button[type=submit]', form);
    sub.disabled = true;
    try {
      const it = await api.create('shoutout', data);
      dropSamples('shoutouts');
      H.shoutouts.unshift({ ...it, author: ME.name });
      closeDrawer();
      toast(`Shoutout sent to ${data.to}.`);
      changed();
    } catch (err) { sub.disabled = false; toast(err.message); }
  });
  setTimeout(() => form.text.focus({ preventScroll: true }), 50);
}

// ---------------------------------------------------------------- Bell: alerts worked out from the team's records
const ALERT_DAYS = 14 * DAY_MS;
function alerts() {
  const now = Date.now(), out = [];
  const fresh = (t) => now - new Date(t) < ALERT_DAYS;
  for (const r of H.tasks) {
    const d = r.data || {};
    if (!d.done && r.user_id !== ME.id && whoOf(d).includes(ME.name) && fresh(r.created_at)) out.push({ at: r.created_at, ic: 'check', t: `${r.author} gave you a task: ${txt(d, ['title', 'text', 'what'])}`, sub: `My tasks · ${ago(r.created_at)}`, act: 'data-hgo="tasks"' });
  }
  for (const r of H.prints) {
    const st = printSt(r);
    if ((r.user_id === ME.id || printWho(r) === ME.name) && (st === 'done' || st === 'failed') && fresh(r.updated_at)) out.push({ at: r.updated_at, ic: st === 'done' ? 'printer' : 'alert', t: st === 'done' ? `Your print is done: ${printName(r)}` : `Your print didn't work: ${printName(r)}`, sub: `Print Shop · ${ago(r.updated_at)}`, act: 'data-goto="build|Print Shop"' });
  }
  for (const e of allEvents()) {
    const r = e.rec;
    if (r.user_id !== ME.id && fresh(r.created_at) && e.end > now) out.push({ at: r.created_at, ic: isMeet(e) ? 'trophy' : 'calendar', t: `New on the calendar: ${e.title}`, sub: `${fmtShort.format(e.start)} · added by ${r.author}`, act: 'data-goto="logbook|Calendar"' });
  }
  for (const r of H.agenda) {
    if (r.user_id !== ME.id && fresh(r.updated_at) && r.data && r.data.date >= ymd(new Date())) { const d = parseYmd(r.data.date); out.push({ at: r.updated_at, ic: 'note', t: `The plan for ${ymd(d) === ymd(new Date()) ? 'today' : fmtWeekday.format(d)} is ready`, sub: `Home · ${ago(r.updated_at)}`, act: 'data-hgo="plan"' }); }
  }
  for (const r of H.shoutouts) {
    if (r.data && r.data.to === ME.name && r.user_id !== ME.id && fresh(r.created_at)) out.push({ at: r.created_at, ic: 'sparkle', t: `${r.author} gave you a shoutout`, sub: r.data.text || '', act: 'data-goto="home|Shop TV"' });
  }
  return out.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
}
const seenPref = () => H.prefs.find((r) => r.user_id === ME.id && r.data && 'alertsSeenAt' in r.data) || null;
const seenAt = () => { const p = seenPref(); return p ? Number(p.data.alertsSeenAt) || 0 : 0; };
function renderBell() {
  const n = H.loaded ? alerts().filter((a) => new Date(a.at).getTime() > seenAt()).length : 0;
  const btn = $('#bellBtn');
  let b = $('.badge', btn);
  if (!b) { b = document.createElement('span'); b.className = 'badge'; btn.appendChild(b); }
  b.hidden = n === 0;
  b.textContent = n > 9 ? '9+' : String(n);
  btn.setAttribute('aria-label', n ? `Alerts, ${n} new` : 'Alerts');
}
async function markSeen() {
  const at = Date.now();
  const p = seenPref();
  try {
    if (p) { p.data = { ...p.data, alertsSeenAt: at }; renderBell(); await api.update('pref', p.id, { alertsSeenAt: at }); }
    else { const it = await api.create('pref', { alertsSeenAt: at }); H.prefs.unshift(it); renderBell(); }
  } catch (err) { console.error(err); }
}
$('#bellBtn').addEventListener('click', (e) => {
  const list = H.loaded ? alerts() : [];
  const since = seenAt();
  showPop(e.currentTarget, `<h5>Alerts</h5>${list.length
    ? list.map((a) => item(a.ic, `${new Date(a.at).getTime() > since ? '<span class="lh-new" aria-label="New"></span>' : ''}${esc(a.t)}`, esc(a.sub.length > 70 ? `${a.sub.slice(0, 67)}…` : a.sub), a.act)).join('')
    : `<p class="lh-none">${H.loaded ? "Nothing new. You're all caught up." : 'Loading…'}</p>`}`);
  if (list.some((a) => new Date(a.at).getTime() > since)) markSeen();
});
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-hgo]');
  if (!g) return;
  closePop();
  goHomeCard(g.dataset.hgo === 'plan' ? '.w-plan' : '.w-tasks');
});
$('#moreBtn').addEventListener('click', (e) => showPop(e.currentTarget, `<h5>More zones</h5>
  ${item('book', 'Learn', 'Paths, rules, setup and FAQ', 'data-zone="learn"')}
  ${item('code', 'Code', 'BioBuzz XR and team code', 'data-zone="code"')}
  ${item('logbook', 'Logbook', 'Calendar, sessions, competitions', 'data-zone="logbook"')}
  ${item('search', 'Search everything', 'Pages, parts, people', 'id="moreSearch"')}`, true));
document.addEventListener('click', (e) => { if (e.target.closest('#moreSearch')) { closePop(); openPalette(); } });
$('#meBtn').dataset.bot = ME.color;
$('#meBtn').setAttribute('aria-label', `Your profile: ${ME.name}`);
paintBots($('#meBtn').parentElement);
$('#meBtn').addEventListener('click', (e) => showPop(e.currentTarget, `<h5>${ME.name}${ME.role === 'mentor' ? ' · Mentor' : ''}</h5>
  ${item('users', 'My profile', 'Badges, skills and what you are working on', 'data-goto="crew|People"')}
  ${ME.role === 'mentor' ? item('check', 'Mentor tools', 'Approve students, Team Code, chat', 'id="meMentor"') : ''}
  ${item(isDark() ? 'sun' : 'moon', isDark() ? 'Switch to Light' : 'Switch to Night shift', '', 'id="meTheme"')}
  ${item('zap', 'Replay the power-up splash', '', 'id="meSplash"')}
  ${item('x', 'Sign out', '', 'id="meOut"')}`));
document.addEventListener('click', async (e) => {
  if (e.target.closest('#meMentor')) { location.href = '/mentor'; }
  if (e.target.closest('#meTheme')) { closePop(); root.dataset.theme = isDark() ? 'light' : 'dark'; local.set('kwc-theme', root.dataset.theme); syncTheme(); }
  if (e.target.closest('#meOut')) { closePop(); if (!S.preview) await fetch('/api/logout', { method: 'POST' }); location.href = '/login'; }
});
document.addEventListener('click', (e) => { if (e.target.closest('#meSplash')) { closePop(); playSplash(); } });

// Command palette
let palette = null;
function paletteItems() {
  const items = ZONES.map((z) => ({ label: z.name, hint: 'Zone', ic: z.icon, run: () => setZone(z.id) }));
  for (const z of ZONES) for (const s of z.subs) items.push({ label: s, hint: `Page · ${z.name}`, ic: z.icon, page: true, run: () => setZone(z.id, s, { scroll: true }) });
  items.push(
    { label: 'Explore the robot full screen', hint: 'Action', ic: 'max', run: () => { setZone('home'); setFull(true); } },
    { label: isDark() ? 'Switch to Light' : 'Switch to Night shift', hint: 'Action', ic: isDark() ? 'sun' : 'moon', run: () => { root.dataset.theme = isDark() ? 'light' : 'dark'; local.set('kwc-theme', root.dataset.theme); syncTheme(); } },
    { label: 'Replay the power-up splash', hint: 'Action', ic: 'zap', run: playSplash },
    { label: 'Request a print', hint: 'Action', ic: 'printer', run: () => openPrintRequest(ctx) },
    { label: 'Open BioBuzz XR', hint: 'Action', ic: 'gamepad', run: () => window.open('/biobuzz-xr/index.html', '_blank', 'noopener') },
    // (Design system page lives in the master plan, not in the app.)
  );
  if (partsData) {
    const names = [...new Set(Object.values(partsData.parts).map((p) => p[2]))].sort();
    for (const n of names) {
      const sys = Object.values(partsData.parts).find((p) => p[2] === n)[1];
      items.push({ label: n, hint: `Part · ${SYS[sys].name}`, ic: 'bot', part: n, run: () => focusPart(n) });
    }
  }
  return items;
}
function openPalette() {
  if (palette) return;
  closePop();
  const back = document.createElement('div');
  back.className = 'palette-back';
  back.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Search the Hub"><div class="palette-in">${icon('search')}<input type="text" placeholder="Jump to a zone, a part or an action" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palList" autocomplete="off"></div><ul id="palList" role="listbox"></ul></div>`;
  document.body.appendChild(back);
  const input = $('input', back), list = $('ul', back);
  const all = paletteItems();
  let shown = [], sel = 0;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    shown = q ? all.filter((x) => x.label.toLowerCase().includes(q) || x.hint.toLowerCase().includes(q)).slice(0, 40) : all.filter((x) => !x.part && !x.page).concat(all.filter((x) => x.part).slice(0, 4));
    sel = clamp(sel, 0, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? shown.map((x, i) => `<li role="option" id="pal${i}" data-i="${i}" aria-selected="${i === sel}"><span class="oc">${icon(x.ic, 'i sm')}</span>${x.label}<small>${x.hint}</small></li>`).join('') : '<div class="empty-row">Nothing matches yet. Try "flywheel" or "Build".</div>';
    input.setAttribute('aria-activedescendant', shown.length ? `pal${sel}` : '');
    const s = list.querySelector('[aria-selected="true"]');
    if (s) s.scrollIntoView({ block: 'nearest' });
  };
  const run = (i) => { const x = shown[i]; closePalette(); if (x) x.run(); };
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, shown.length); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + shown.length) % Math.max(1, shown.length); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) run(+li.dataset.i); });
  back.addEventListener('pointerdown', (e) => { if (e.target === back) closePalette(); });
  palette = { back, prev: document.activeElement };
  draw();
  input.focus();
}
function closePalette() {
  if (!palette) return;
  palette.back.remove();
  if (palette.prev && palette.prev.focus) palette.prev.focus({ preventScroll: true });
  palette = null;
}
$('#searchBtn').addEventListener('click', openPalette);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palette ? closePalette() : openPalette(); return; }
  if (e.key === 'Escape') {
    if (palette) { closePalette(); return; }
    if (pop) { const a = pop.anchor; closePop(); a.focus(); return; }
    if ($('#hero').classList.contains('is-full')) setFull(false);
  }
});

// ---------------------------------------------------------------- Robot hero
const SYS_ORDER = ['launcher', 'ballpath', 'intake', 'drivetrain', 'structure', 'power', 'hardware'];
const SYS = {
  launcher: { name: 'Launcher', c: '#F07A2A' }, ballpath: { name: 'Ball path', c: '#B394FF' }, intake: { name: 'Intake', c: '#0E8F9E' },
  drivetrain: { name: 'Drivetrain', c: '#2340A8' }, structure: { name: 'Frame', c: '#9A968A' }, power: { name: 'Power', c: '#C42D6B' },
  hardware: { name: 'Screws and bits', c: '#4F5049' },
};
let partsData = null;
let focusSys = null;
const partsWaiters = [];
const viewportEl = $('#viewport');
const blurb = document.createElement('div');
blurb.className = 'sys-blurb glass';
blurb.setAttribute('aria-live', 'polite');
viewportEl.appendChild(blurb);

function renderSysPills() {
  const counts = {};
  for (const p of Object.values(partsData.parts)) counts[p[1]] = (counts[p[1]] || 0) + 1;
  const total = Object.values(partsData.parts).length;
  $('#sysRow').innerHTML = `<button class="sys" type="button" data-sys="" aria-pressed="true"><span class="dot" style="--c:var(--volt)"></span>All parts <span class="n">${total}</span></button>`
    + SYS_ORDER.map((k) => `<button class="sys" type="button" data-sys="${k}" aria-pressed="false"><span class="dot" style="--c:${SYS[k].c}"></span>${SYS[k].name} <span class="n">${counts[k] || 0}</span></button>`).join('');
}
function showFocus(sys) {
  focusSys = sys || null;
  $$('#sysRow .sys').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.sys || null) === focusSys)));
  const meta = focusSys && partsData.systems.find((s) => s.id === focusSys);
  if (meta) {
    blurb.innerHTML = `<b>${SYS[focusSys].name}.</b> ${meta.blurb}`;
    blurb.classList.add('is-on');
  } else blurb.classList.remove('is-on');
}
$('#sysRow').addEventListener('click', (e) => {
  const b = e.target.closest('.sys');
  if (!b || !viewer) return;
  const s = b.dataset.sys || null;
  const next = s === focusSys ? null : s;
  viewer.focusSystem(next);
});

const tip = $('#tip');
function onHover(info, x, y) {
  if (!info) { tip.classList.remove('is-on'); return; }
  tip.innerHTML = `<span class="dot" style="--c:${SYS[info.sys].c}"></span>${info.name}`;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const vw = viewportEl.clientWidth;
  const tx = clamp(x - w / 2, 8, vw - w - 8), ty = Math.max(8, y - h - 16);
  tip.style.transform = `translate(${tx}px, ${ty}px)`;
  tip.classList.add('is-on');
}

const sheet = $('#sheet');
function onSelect(info) {
  tip.classList.remove('is-on');
  if (!info) { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); return; }
  $('#sheetSysName').textContent = SYS[info.sys].name;
  $('#sheetDot').style.setProperty('--c', SYS[info.sys].c);
  $('#sheetName').textContent = info.name;
  $('#sheetSku').textContent = info.sku || '—';
  const dims = info.size.filter((v) => v > 0).sort((a, b) => b - a).map((v) => (Math.round(v * 10) / 10).toString());
  $('#sheetSize').textContent = dims.length ? `${dims.join(' × ')} mm` : '—';
  $('#sheetSame').textContent = !info.sku ? 'One of many small bits' : info.same > 1 ? `${info.same} of this part` : 'Just this one';
  $('#sheetNote').textContent = info.note;
  sheetPart = info;
  const dive = topicFor(info);
  sheetDive.hidden = !dive;
  if (dive) sheetDive.dataset.dive = dive;
  renderSheetIssue();
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
}
// "How it's made" deep dives: a button on the part sheet for parts that have one, plus shortcuts under the robot.
const sheetDive = document.createElement('button');
sheetDive.className = 'btn pill sheet-dive';
sheetDive.type = 'button';
sheetDive.hidden = true;
sheetDive.innerHTML = '<svg class="i sm"><use href="#i-sparkle"/></svg>See how it\u2019s made<small>3D deep dive</small>';
$('.sheet-actions', sheet).before(sheetDive);
function startDive(key, info) {
  if (viewer) viewer.stopAutoRotate();
  const id = info && info.id;
  openDive(key, { part: info || null, real: () => (viewer && id ? viewer.clonePart(id) : null) });
}
sheetDive.addEventListener('click', () => sheetPart && startDive(sheetDive.dataset.dive, sheetPart));
const diveRow = document.createElement('div');
diveRow.className = 'dive-row';
diveRow.innerHTML = '<span class="cap">Click a part on the robot, or open one up:</span>' + DIVES.map((d) => `<button class="dive-chip" type="button" data-dive="${d.key}"><span class="oc"><svg class="i sm"><use href="#i-sparkle"/></svg></span>${d.name}<small>${d.blurb}</small></button>`).join('');
$('#sysRow').after(diveRow);
diveRow.addEventListener('click', (e) => {
  const b = e.target.closest('.dive-chip');
  if (!b) return;
  const key = b.dataset.dive;
  // With the robot loaded, pick the matching part first so the dive can start from the real CAD.
  const id = viewer ? viewer.findPart(PART_FOR[key]) : null;
  if (id) { viewer.select(id); startDive(key, sheetPart); } else startDive(key, null);
});

$('#sheetClose').addEventListener('click', () => { if (viewer) viewer.select(null); $('#robotCanvas').focus({ preventScroll: true }); });
$('#sheetFocus').addEventListener('click', () => viewer && viewer.frameCurrent());
// Problems pinned on a part are `issue` records {part, sys, text, status}, the same ones Robot and Build show.
let sheetPart = null;
const openIssues = (name) => H.issues.filter((r) => r.data && r.data.part === name && (r.data.status || 'open') !== 'fixed');
function renderSheetIssue() {
  const box = $('#sheetIssue');
  const list = sheetPart ? openIssues(sheetPart.name) : [];
  box.hidden = !list.length;
  if (list.length) {
    const r = list[0];
    box.innerHTML = `${icon('alert')}<div><b>${list.length === 1 ? 'Open problem' : `${list.length} open problems`}</b><br>"${esc(String(r.data.text || '').slice(0, 160))}" Pinned by ${esc(r.author)} ${esc(ago(r.created_at))}.</div>`;
  }
}
$('#sheetReport').addEventListener('click', () => {
  if (!sheetPart) return;
  const part = sheetPart;
  const el = drawer(`<h3 class="card-title" style="margin:0 0 4px">Pin a problem</h3>
    <p class="cap" style="font-weight:400;margin:0 0 14px">On <b>${esc(part.name)}</b> (${esc(SYS[part.sys] ? SYS[part.sys].name : part.sys)}). The team sees it in Robot and Build until someone marks it fixed.</p>
    <form class="lh-form" id="issueForm">
      <label class="field lh-full"><span>What's wrong?</span><textarea class="inp" name="text" maxlength="300" required placeholder="This bearing keeps popping out after a few matches."></textarea></label>
      <div class="lh-btns"><span class="lh-sp"></span><button class="btn primary pill" type="submit">${icon('flag', 'i sm')}Pin it</button></div>
    </form>`, { label: 'Pin a problem' });
  const form = $('#issueForm', el);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) { toast('Say what is wrong first.'); return; }
    const sub = $('button[type=submit]', form);
    sub.disabled = true;
    try {
      const it = await api.create('issue', { part: part.name, sys: part.sys, text, status: 'open' });
      H.issues.unshift({ ...it, author: ME.name });
      closeDrawer();
      renderSheetIssue();
      toast('Pinned. The team can see it in Robot.');
      changed();
    } catch (err) { sub.disabled = false; toast(err.message); }
  });
  setTimeout(() => form.text.focus({ preventScroll: true }), 50);
});

const badge = $('#issueBadge');
// The pin badge shows only when a real open problem sits on the part the viewer anchors it to.
let anchorIssues = 0;
function syncAnchorIssues() {
  anchorIssues = 0;
  if (!viewer || !viewer.issuePartId) return;
  for (const r of H.issues) if (r.data && r.data.part && (r.data.status || 'open') !== 'fixed' && viewer.findPart(r.data.part) === viewer.issuePartId) anchorIssues++;
  badge.textContent = String(anchorIssues);
  badge.setAttribute('aria-label', `${anchorIssues} open problem${anchorIssues === 1 ? '' : 's'} on this part`);
  if (!anchorIssues) badge.hidden = true;
}
function onAnchor(x, y, vis) {
  badge.hidden = !vis || !anchorIssues;
  if (vis) badge.style.transform = `translate(${x}px, ${y}px)`;
}
function showIssue() {
  setZone('home');
  $('#hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  if (!viewer) return;
  const r = H.issues.find((x) => x.data && x.data.part && (x.data.status || 'open') !== 'fixed' && viewer.findPart(x.data.part));
  if (r) viewer.select(viewer.findPart(r.data.part), { frame: true });
  else toast('No open problems on the robot right now.');
}
badge.addEventListener('click', showIssue);
function focusPart(name) {
  setZone('home');
  $('#hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  if (!viewer) { toast('The robot is still loading. Try again in a moment.'); return; }
  const id = viewer.findPart(name);
  if (id) viewer.select(id, { frame: true });
}

$$('[data-color]').forEach((b) => b.addEventListener('click', () => {
  $$('[data-color]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
  if (viewer) viewer.setColorMode(b.dataset.color);
}));
const xrayBtn = $('#xrayBtn');
xrayBtn.addEventListener('click', () => {
  const on = xrayBtn.getAttribute('aria-pressed') !== 'true';
  xrayBtn.setAttribute('aria-pressed', String(on));
  if (viewer) viewer.setXray(on);
});
const explode = $('#explode');
explode.addEventListener('input', () => {
  const v = +explode.value;
  explode.style.setProperty('--fill', `${v}%`);
  $('#explodeOut').textContent = `${v}%`;
  if (viewer) viewer.setExplode(v / 100);
});
$('#resetBtn').addEventListener('click', () => viewer && viewer.resetView());
$('#driveBtn').addEventListener('click', () => { setFull(false); window.open('/biobuzz-xr/academy.html', '_blank', 'noopener'); });

let fullBack = null;
function setFull(on) {
  const hero = $('#hero');
  if (on === hero.classList.contains('is-full')) return;
  const btn = $('#exploreBtn');
  if (on) {
    fullBack = document.createElement('div');
    fullBack.className = 'full-back';
    fullBack.addEventListener('click', () => setFull(false));
    document.body.appendChild(fullBack);
    requestAnimationFrame(() => fullBack && fullBack.classList.add('is-on'));
    hero.classList.add('is-full');
    document.body.classList.add('no-scroll');
  } else {
    hero.classList.remove('is-full');
    if (fullBack) { fullBack.remove(); fullBack = null; }
    document.body.classList.remove('no-scroll');
  }
  btn.setAttribute('aria-pressed', String(on));
  $('span', btn).textContent = on ? 'Close' : 'Explore';
  $('use', btn).setAttribute('href', on ? '#i-min' : '#i-max');
  $('#robotCanvas').focus({ preventScroll: true });
}
$('#exploreBtn').addEventListener('click', () => setFull(!$('#hero').classList.contains('is-full')));

async function startViewer() {
  const bar = $('#loadBar'), lbl = $('#loadLbl'), loader = $('#loader');
  try {
    const { createViewer } = await import('./viewer.js');
    viewer = await createViewer({
      container: viewportEl,
      canvas: $('#robotCanvas'),
      data: partsData,
      reducedMotion: reduced,
      dark: isDark(),
      onProgress(phase, f) {
        if (phase === 'download') { bar.style.transform = `scaleX(${f})`; lbl.textContent = `Loading robot, ${Math.round(f * 100)}%`; }
        else if (phase === 'unpack') { bar.style.transform = 'scaleX(1)'; lbl.textContent = 'Unpacking 187 MB of geometry'; }
        else if (phase === 'build') lbl.textContent = 'Building 418 parts';
      },
      onFirstFrame() {
        viewportEl.classList.add('is-live');
        loader.classList.add('is-done');
        lbl.textContent = 'Robot loaded';
        explode.disabled = false;
      },
      onHover,
      onSelect,
      onFocus: showFocus,
      onXray: (on) => xrayBtn.setAttribute('aria-pressed', String(on)),
      onAnchor,
    });
    window.__viewer = viewer;
    syncAnchorIssues();
  } catch (err) {
    console.error(err);
    bar.style.transform = 'scaleX(0)';
    lbl.textContent = `3D couldn't start here (${(err && err.message) || 'unknown error'}). The picture is the same robot.`;
  }
}

function loadRobot() {
  // Students use their own devices: on a phone with Data Saver on, wait for a tap before the 143 MB download.
  const c = navigator.connection;
  if (c && c.saveData) {
    $('#loadLbl').innerHTML = 'Data Saver is on. <button class="btn soft pill" type="button" id="loadNow" style="height:32px;margin-top:6px">Load the 3D robot (143 MB)</button>';
    $('#loadNow').addEventListener('click', () => { $('#loadLbl').textContent = 'Loading robot, 0%'; startViewer(); }, { once: true });
  } else startViewer();
}
fetch('/hub/data/parts.json')
  .then((r) => { if (!r.ok) throw new Error(`parts list HTTP ${r.status}`); return r.json(); })
  .then((d) => { partsData = d; renderSysPills(); loadRobot(); partsWaiters.splice(0).forEach((cb) => cb()); })
  .catch((err) => { console.error(err); $('#loadLbl').textContent = "The parts list didn't load, so the 3D view is off."; });

// ---------------------------------------------------------------- Power-up splash
function playSplash() {
  if ($('.splash')) return;
  const path = 'M -40 352 H 70 L 104 318 H 168 L 196 290 H 238';
  const el = document.createElement('div');
  el.className = 'splash';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Kilowattchaos Hub is powering up');
  el.innerHTML = `<div class="splash-stage"><svg class="trace" viewBox="0 0 620 428" aria-hidden="true">
      <path class="wire" d="${path}"/><path class="wire" d="M 70 352 V 396 H 20"/><path class="wire" d="M 168 318 V 270 H 132"/>
      <path class="lit" d="${path}"/>
      <circle class="pad" cx="70" cy="352" r="6"/><circle class="pad" cx="168" cy="318" r="6"/><circle class="pad" cx="20" cy="396" r="5"/><circle class="pad" cx="132" cy="270" r="5"/>
      <circle class="spark" r="5" cx="-40" cy="352"/>
    </svg>
    <img class="bot" src="/hub/assets/poster.webp" alt="">
    <div class="word"><b>Kilowattchaos Hub</b><span>Powered up · season week ${seasonWeek()}</span></div></div>
    <button class="skip" type="button">Skip</button>`;
  document.body.appendChild(el);
  const lit = $('.lit', el), spark = $('.spark', el);
  const L = lit.getTotalLength();
  lit.style.strokeDasharray = `${L}`;
  lit.style.strokeDashoffset = `${L}`;
  let done = false, raf = 0;
  const timers = [];
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    el.classList.add('out');
    setTimeout(() => el.remove(), 360);
  };
  $('.skip', el).addEventListener('click', finish);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
  $('.skip', el).focus({ preventScroll: true });
  if (reduced) {
    lit.style.strokeDashoffset = '0';
    spark.style.display = 'none';
    el.classList.add('powered');
    timers.push(setTimeout(finish, 1100));
    return;
  }
  const t0 = performance.now();
  const step = (t) => {
    const k = clamp((t - t0) / 600, 0, 1);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const p = lit.getPointAtLength(L * e);
    spark.setAttribute('cx', p.x.toFixed(1));
    spark.setAttribute('cy', p.y.toFixed(1));
    lit.style.strokeDashoffset = `${L * (1 - e)}`;
    if (k < 1) raf = requestAnimationFrame(step);
    else { spark.style.opacity = '0'; el.classList.add('powered'); }
  };
  raf = requestAnimationFrame(step);
  timers.push(setTimeout(finish, 1350));
}
$('#playSplash')?.addEventListener('click', playSplash);

// ---------------------------------------------------------------- What the zone pages can use
const ctx = {
  toast,
  go: (zid, sub) => setZone(zid, sub == null ? 0 : sub, { scroll: true }),
  focusPart,
  focusSystem(id) {
    setZone('robot', '3D Explorer', { scroll: true });
    requestAnimationFrame(() => {
      $('#hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      if (viewer) viewer.focusSystem(id); else toast('The robot is still loading. Try again in a moment.');
    });
  },
  showIssue,
  parts: () => partsData,
  whenParts(cb) {
    if (partsData) { cb(); return () => {}; }
    partsWaiters.push(cb);
    return () => { const k = partsWaiters.indexOf(cb); if (k >= 0) partsWaiters.splice(k, 1); };
  },
  rerender: () => showSub(subIdx, { noHash: true }),
  state: zstate,
  SYS, SYS_ORDER, local, reduced, isDark, nextMeeting, seasonWeek, AGENDA,
  bento: $('#bento'),
  // Home's live team data, shared with the Shop TV and Customize (zones/home.js).
  homeData: {
    H, load: loadHome, nextEvent, allEvents, meets, planFor, planItems, printQueue, printName, printWho, evInfo,
    sysName, sysColor, timeRange, ymd, shoutout: openShoutout,
    onChange(fn) { homeBus.addEventListener('change', fn); return () => homeBus.removeEventListener('change', fn); },
    changed,
  },
};

// ---------------------------------------------------------------- Boot
initGlossaryTips();
const homeMod = import('./zones/home.js');
homeMod.then((m) => m.initLayout(document.getElementById('bento'), ctx)).catch((e) => console.error(e));
renderHeader();
renderHomeAll();
loadHome().then(() => {
  homeMod.then((m) => m.applyLayout(document.getElementById('bento'), ctx)).catch(() => {});
  changed();
});
if (!fromHash()) setZone('home', 0, { noHash: true });
[$('#sysRow'), $('#dockTrack'), $('#subtabs')].forEach(edgeFade);
setInterval(() => { if (!document.hidden) { renderNext(); renderHeader(); } }, 30000);
// Pick up what teammates and mentors saved, every two minutes while the tab is open.
setInterval(() => {
  if (document.hidden || planEditing || taskFormOpen) return;
  loadHome().then(changed);
}, 120000);
if (!session.get('kwc-splash') && !new URLSearchParams(location.search).has('nosplash')) {
  session.set('kwc-splash', '1');
  playSplash();
}
