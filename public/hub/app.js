// Kilowattchaos Hub: everything except the 3D viewer (viewer.js) and the zone pages (zones/).
import { loadZone, initGlossaryTips, closeDrawer, slug } from './zones/index.js';
import { api, session as S } from './api.js';
import { setRoster } from './zones/common.js';

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
const PEOPLE = new Proxy(Object.fromEntries(BOOT.roster.map((r) => [r.name, r.color])), { get: (t, k) => t[k] || '#9A968A' });
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

// ---------------------------------------------------------------- Dates (season is real, meetings are samples)
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
  { id: 'build', name: 'Build', icon: 'wrench', subs: ['Ideas', 'Mechanism Lab', 'Print Shop', 'Parts and inventory'], q: 'How do we make it better, and can I get that part printed?', when: 'The Mechanism Lab cards reach the shop TV the week of November 16. Print Shop v0 opens on December 1, Ideas with prototype tests arrive in Phase 3, and the print bridge in Phase 5.' },
  { id: 'learn', name: 'Learn', icon: 'book', subs: ['Paths', 'FIRST and BIOBUZZ', 'Setup and FAQ', 'Build tips', 'AI agents', 'Glossary'], q: 'How do I do this, and what do the rules say?', when: 'FIRST and BIOBUZZ basics and Setup and FAQ (OnBot Java first) open on December 1. Learning paths and the glossary follow in Phase 3.' },
  { id: 'code', name: 'Code', icon: 'code', subs: ['BioBuzz Arena', 'Our code', 'Snippets', 'Challenges'], q: 'Where do I write code, and does it work?', when: 'BioBuzz Arena v0, your twin with gamepads on, opens on December 1. The Arena editor, team code and challenges land in Phase 4, January 25 to February 12.' },
  { id: 'crew', name: 'Crew', icon: 'users', subs: ['Chat', 'Inspiration', 'People', 'Feedback'], q: "What's the team talking about?", when: 'Chat, inspiration and profiles come in Phase 2, December 7 to 18. Chat switches on only once a second YPP-cleared adult is in place.' },
  { id: 'logbook', name: 'Logbook', icon: 'logbook', subs: ['Calendar', 'Sessions', 'Progress', 'Competitions', 'Portfolio'], q: 'What did we do, and when is the next thing?', when: 'The calendar and session notes open on December 1. Competitions and the portfolio helper follow in Phase 2, December 7 to 18.' },
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

function renderSubtabs(z) {
  const box = $('#subtabs');
  box.innerHTML = z.subs.map((s, i) => `<button class="chip" type="button" data-sub="${i}" aria-pressed="false">${s}</button>`).join('');
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
  $$('#subtabs .chip').forEach((c, k) => c.setAttribute('aria-pressed', String(k === subIdx)));
  const act = $(`#subtabs .chip[data-sub="${subIdx}"]`);
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

// ---------------------------------------------------------------- Header lines
function renderHeader() {
  const now = new Date();
  $('#seasonLine').textContent = `BIOBUZZ 2026–27 · Season week ${seasonWeek(now)} · ${fmtDay.format(now)}`;
  if (zone === 'home') $('#hello').textContent = greeting();
}

// ---------------------------------------------------------------- Next up
let going = false;
function renderNext() {
  const now = new Date();
  const m = nextMeeting(now);
  if (!m) return;
  const t12 = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' PM', '').replace(' AM', '');
  $('#nextWhen').textContent = `${fmtShort.format(m.start)} · ${t12(m.start)}–${t12(m.end)} PM`;
  const el = $('#nextCount');
  if (now >= m.start) { el.innerHTML = 'Happening now'; return; }
  const mins = Math.max(0, Math.floor((m.start - now) / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), mm = mins % 60;
  el.innerHTML = d > 0 ? `${d}<small>d</small>${h}<small>h</small>` : `${h}<small>h</small>${mm}<small>min</small>`;
  el.setAttribute('aria-label', `Starts in ${d ? `${d} days ` : ''}${h} hours${d ? '' : ` ${mm} minutes`}`);
}
function renderGoing() {
  const names = ['Pixel', 'Gizmo', 'Byte', 'Nova', 'Rivet', 'Echo'];
  if (going) names.unshift(ME.name);
  $('#goingStack').innerHTML = names.slice(0, 5).map((n) => `<span class="av" title="${n}">${bot(PEOPLE[n])}</span>`).join('') + `<span class="cap">${names.length} of 7 going</span>`;
}
$('#rsvpBtn').addEventListener('click', (e) => {
  going = !going;
  const b = e.currentTarget;
  b.setAttribute('aria-pressed', String(going));
  b.innerHTML = going ? `${icon('check', 'i sm')}Going` : 'RSVP';
  renderGoing();
});

// ---------------------------------------------------------------- My tasks
const TASKS = [
  { t: "Measure the flywheel's top speed", meta: 'Launcher · due Tuesday', c: 'var(--sys-launcher)', done: false },
  { t: 'Print 4 intake roller hubs', meta: 'Intake · due Thursday', c: 'var(--sys-intake)', done: false },
  { t: 'Finish Onshape Lesson 1', meta: 'Learn · due Friday', c: 'var(--stone)', done: false },
  { t: 'Write the drive-forward auto', meta: "Code · from Thursday's note", c: 'var(--stone)', done: true },
];
let taskHint = false;
function renderTasks() {
  const ul = $('#tasks');
  ul.innerHTML = TASKS.map((k, i) => `<li class="task${k.done ? ' done' : ''}"><button class="check" type="button" data-task="${i}" aria-pressed="${k.done}" aria-label="${k.done ? 'Mark not done' : 'Mark done'}: ${k.t}">${icon('check')}</button><div><div class="t">${k.t}</div><div class="meta"><span class="sdot" style="--c:${k.c}"></span>${k.meta}</div></div></li>`).join('');
  $('#tasksOpen').textContent = `${TASKS.filter((k) => !k.done).length} open`;
}
$('#tasks').addEventListener('click', (e) => {
  const b = e.target.closest('[data-task]');
  if (!b) return;
  const k = TASKS[+b.dataset.task];
  k.done = !k.done;
  renderTasks();
  $(`[data-task="${b.dataset.task}"]`).focus();
  if (k.done && !taskHint) { taskHint = true; toast('Ticking a task off also updates the session note it came from.'); }
});

// ---------------------------------------------------------------- Season timeline
const SEASON_A = new Date(2026, 8, 1), SEASON_B = new Date(2027, 4, 1);
const pct = (d) => ((d - SEASON_A) / (SEASON_B - SEASON_A)) * 100;
const EVENTS = [
  { d: new Date(2026, 8, 12), t: 'Kickoff', s: 'Sep 12', icon: 'flag' },
  { d: new Date(2026, 11, 1), t: 'Hub doors open', s: 'Dec 1', icon: 'zap' },
  { d: new Date(2027, 0, 16), t: 'League meet 1', s: 'Sample · Jan 16', icon: 'trophy' },
  { d: new Date(2027, 1, 6), t: 'League meet 2', s: 'Sample · Feb 6', icon: 'trophy' },
  { d: new Date(2027, 2, 6), t: 'League tournament', s: 'Sample · Mar 6', icon: 'trophy' },
];
const BANDS = [
  { a: new Date(2026, 11, 21), b: new Date(2027, 0, 2), t: 'Winter break' },
  { a: new Date(2027, 2, 22), b: new Date(2027, 4, 1), t: 'Off-season: make it theirs' },
];
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
  for (const e of EVENTS) {
    h += `<div class="tl-node${e.d > now ? ' future' : ''}" style="left:${pct(e.d)}%"><div class="tl-lbl">${e.t}<span>${e.s}</span></div><div class="tl-dot">${icon(e.icon, 'i sm')}</div></div>`;
  }
  h += `<div class="tl-today" style="left:${tp}%">Today · week ${seasonWeek(now)}</div>`;
  h += `<div class="tl-elbow" style="left:${tp}%"></div>`;
  h += `<div class="tl-objs" style="left:calc(${tp}% + 26px)">
    <button class="obj" type="button" data-robot="1"><span class="oc">${icon('commit', 'i sm')}</span>StarterBot v0</button>
    <button class="obj" type="button" data-goto="logbook|Sessions"><span class="oc">${icon('note', 'i sm')}</span>Session notes<span class="x">×2</span></button>
    <button class="obj" type="button" data-goto="build|Print Shop"><span class="oc">${icon('printer', 'i sm')}</span>Roller hub<span class="x">×4</span></button>
  </div>`;
  $('#tl').innerHTML = h;
  const sc = $('#tlScroll');
  sc.scrollLeft = Math.max(0, (sc.scrollWidth * tp) / 100 - sc.clientWidth * 0.3);
}
$('#tl').addEventListener('click', (e) => {
  if (e.target.closest('[data-robot]')) { $('#hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }
});

// ---------------------------------------------------------------- Today's plan
const AGENDA = [
  { t: '3:30', what: 'Check in and safety glasses on', meta: 'Everyone', c: 'var(--stone)', who: [] },
  { t: '3:40', what: 'Intake: try 6 mm gecko wheel spacing', meta: 'Intake', c: 'var(--sys-intake)', who: ['Pixel', 'Nova'] },
  { t: '3:40', what: "Launcher: measure the flywheel's top speed", meta: 'Launcher', c: 'var(--sys-launcher)', who: ['Sparky', 'Rivet'] },
  { t: '4:30', what: 'Code: run the drive-forward auto on the robot', meta: 'Code', c: 'var(--stone)', who: ['Byte', 'Gizmo'] },
  { t: '5:15', what: 'Clean up and one-line reflections', meta: 'Everyone', c: 'var(--stone)', who: [] },
];
function renderPlan() {
  const now = new Date();
  const meetingToday = now.getDay() === 2 || now.getDay() === 4;
  const m = nextMeeting(now);
  $('#planTitle').textContent = meetingToday ? "Today's plan" : 'Next session';
  $('#planSub').textContent = meetingToday ? 'Today, 3:30 to 5:30 PM · Shop room' : `No meeting today. Here's the plan for ${m ? fmtWeekday.format(m.start) : 'next time'}.`;
  $('#agenda').innerHTML = AGENDA.map((a) => `<li class="ag"><time>${a.t}</time><div><div class="what">${a.what}</div><div class="meta"><span class="sdot" style="--c:${a.c}"></span>${a.meta}</div></div><div class="stack">${a.who.map((n) => `<span class="av" title="${n}">${bot(PEOPLE[n])}</span>`).join('')}</div></li>`).join('');
}

// ---------------------------------------------------------------- Print queue rings and count-ups
const RING_C = 2 * Math.PI * 22;
$$('.ring .val').forEach((v) => { v.style.strokeDasharray = `${RING_C}`; v.style.strokeDashoffset = `${RING_C}`; });
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
    const el = en.target;
    if (el.classList.contains('ring')) {
      const p = +el.dataset.pct;
      if (p > 0) {
        el.querySelector('.val').style.strokeDashoffset = `${RING_C * (1 - p / 100)}`;
        countUp(el.querySelector('.pct'), p, 1000, '%');
      }
    } else if (el.dataset.count) {
      countUp(el, +el.dataset.count, 900);
    }
  }
}, { threshold: 0.4 });
$$('.ring, [data-count]').forEach((el) => seen.observe(el));
document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

// ---------------------------------------------------------------- Season dock (sample activity)
const DOCK = [
  { m: 'Sep', y: '2026', items: [['note', 6, 'session notes'], ['printer', 1, 'print']] },
  { m: 'Oct', items: [['note', 8, 'session notes'], ['printer', 3, 'prints'], ['commit', 1, 'robot version']] },
  { m: 'Nov', now: true, items: [['note', 2, 'session notes'], ['printer', 1, 'print'], ['commit', 1, 'robot version']] },
  { m: 'Dec', future: true, items: [['zap', 0, 'Hub doors open']] },
  { m: 'Jan', future: true, items: [['trophy', 0, 'league meet']] },
  { m: 'Feb', future: true, items: [['trophy', 0, 'league meet']] },
  { m: 'Mar', future: true, items: [['trophy', 0, 'tournament']] },
  { m: 'Apr', y: '2027', future: true, items: [['sparkle', 0, 'off-season']] },
];
function renderDock() {
  $('#dockTrack').innerHTML = DOCK.map((d, i) => {
    const title = d.items.map(([, n, what]) => (n ? `${n} ${what}` : what)).join(', ');
    const chips = d.items.map(([ic, n]) => `<span class="dch">${icon(ic, 'i sm')}${n ? `<span class="b">${n}</span>` : ''}</span>`).join('');
    return `${i ? '<span class="dsep" aria-hidden="true"></span>' : ''}<div class="dm${d.now ? ' now' : ''}${d.future ? ' future' : ''}" title="${d.m}: ${title} (sample)"><span class="m">${d.y ? `${d.m}<b>${d.y}</b>` : d.m}</span>${chips}</div>`;
  }).join('');
  const now = $('.dm.now');
  if (now) { const tr = $('#dockTrack'); tr.scrollLeft = now.offsetLeft - tr.clientWidth / 2 + now.offsetWidth / 2; }
}

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
  ${item('bulb', 'Idea', 'Pitch a mechanism or a fix', 'data-goto="build|Ideas"')}
  ${item('sparkle', 'Inspiration', 'A video or robot worth studying', 'data-goto="crew|Inspiration"')}
  ${item('printer', 'Print request', 'Send a part with a note', 'data-goto="build|Print Shop"')}
  ${item('note', 'Session note', 'From the meeting template', 'data-goto="logbook|Sessions"')}
  ${item('help', 'Question', 'Ask in #help, a mentor answers too', 'data-goto="crew|Chat" data-chan="help"')}
  ${item('chat', 'Chat post', 'Only once chat is switched on', 'data-goto="crew|Chat"')}`));
$('#bellBtn').addEventListener('click', (e) => showPop(e.currentTarget, `<h5>Alerts (sample)</h5>
  ${item('printer', 'Your roller hubs are 62% printed', 'Print queue · 12 min ago', 'data-goto="build|Print Shop"')}
  ${item('alert', 'Gizmo pinned a problem on a bearing', 'Robot · yesterday', 'id="alertIssue"')}
  ${item('calendar', "Tuesday's agenda is ready", 'Logbook · yesterday', 'data-goto="logbook|Calendar"')}`));
document.addEventListener('click', (e) => {
  if (e.target.closest('#alertIssue')) { closePop(); showIssue(); }
});
$('#moreBtn').addEventListener('click', (e) => showPop(e.currentTarget, `<h5>More zones</h5>
  ${item('book', 'Learn', 'Paths, rules, setup and FAQ', 'data-zone="learn"')}
  ${item('code', 'Code', 'BioBuzz Arena and team code', 'data-zone="code"')}
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
  if (e.target.closest('#meOut')) { closePop(); await fetch('/api/logout', { method: 'POST' }); location.href = '/login'; }
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
    { label: 'Request a print', hint: 'Action', ic: 'printer', run: () => setZone('build', 'Print Shop', { scroll: true }) },
    { label: 'Drive the robot in the Arena', hint: 'Action', ic: 'gamepad', run: () => setZone('code', 'BioBuzz Arena', { scroll: true }) },
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
  $('#sheetIssue').hidden = !info.isIssue;
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
}
$('#sheetClose').addEventListener('click', () => { if (viewer) viewer.select(null); $('#robotCanvas').focus({ preventScroll: true }); });
$('#sheetFocus').addEventListener('click', () => viewer && viewer.frameCurrent());
$('#sheetReport').addEventListener('click', () => toast('Pins arrive with the 3D Explorer in Phase 3: pin a problem on the robot and follow it to a fix.'));

const badge = $('#issueBadge');
function onAnchor(x, y, vis) {
  badge.hidden = !vis;
  if (vis) badge.style.transform = `translate(${x}px, ${y}px)`;
}
function showIssue() {
  setZone('home');
  $('#hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  if (viewer && viewer.issuePartId) viewer.select(viewer.issuePartId, { frame: true });
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
$('#driveBtn').addEventListener('click', () => { setFull(false); setZone('code', 'BioBuzz Arena', { scroll: true }); });

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
  SYS, SYS_ORDER, local, reduced, isDark, nextMeeting, seasonWeek, AGENDA, TASKS,
  bento: $('#bento'),
};

// ---------------------------------------------------------------- Boot
initGlossaryTips();
import('./zones/home.js').then((m) => m.applyLayout(document.getElementById('bento'), ctx)).catch((e) => console.error(e));
renderHeader();
renderNext();
renderGoing();
renderTasks();
renderTimeline();
renderPlan();
renderDock();
if (!fromHash()) setZone('home', 0, { noHash: true });
[$('#sysRow'), $('#dockTrack'), $('#subtabs')].forEach(edgeFade);
setInterval(() => { if (!document.hidden) { renderNext(); renderHeader(); } }, 30000);
if (!session.get('kwc-splash') && !new URLSearchParams(location.search).has('nosplash')) {
  session.set('kwc-splash', '1');
  playSplash();
}
