// Home zone: Shop TV (a big screen for the shop room) and Customize (each person's own dashboard layout).
// The TV reads the team's real calendar, plan, prints, shoutouts and check-ins. Layouts save to each person's account.
import { $, $$, esc, clamp, icon, tag, strip, av, sw, seg, wireSeg, GLOSSARY } from './common.js';
import { api, session } from '../api.js';

// Styles for this zone live in zones-home.css, next to index.html. Load it once.
(function loadCss() {
  if (typeof document === 'undefined' || document.querySelector('link[data-zone-css="home"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = new URL('../zones-home.css', import.meta.url).href;
  l.dataset.zoneCss = 'home';
  document.head.appendChild(l);
})();

const DAY = 864e5;
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayIndex = (d = new Date()) => Math.floor(dayStart(d).getTime() / DAY);
const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const pad = (n) => String(n).padStart(2, '0');
const KICKOFF = new Date(2026, 8, 12);
const weekOf = (ctx, d) => (ctx && ctx.seasonWeek ? ctx.seasonWeek(d) : Math.max(0, Math.floor(Math.round((dayStart(d) - KICKOFF) / DAY) / 7) + 1));
const up = `<svg class="i sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>`;
const down = `<svg class="i sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const DOORS = new Date(2026, 11, 1);
const HD = (ctx) => ctx.homeData;

function cdHtml(ms, short) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return [`${d}<small>d</small>${h}<small>h</small>`, `${d} days ${h} hours`];
  if (h > 0) return [`${h}<small>h</small>${pad(m)}<small>m</small>`, `${h} hours ${m} minutes`];
  return [short ? `${m}<small>m</small>` : `${m}:${pad(sec)}`, `${m} minutes ${sec} seconds`];
}

// Where are we right now? The next event from the calendar, and today's plan blocks.
function meetingNow(ctx, now) {
  const hd = HD(ctx);
  const m = hd.nextEvent(now);
  if (!m) return { m: null, on: false, blocks: [] };
  const on = now >= m.start && now < m.end;
  const plan = hd.planFor(now);
  const blocks = plan && plan.today ? hd.planItems(plan).filter((a) => a.at) : [];
  const starts = [...new Map(blocks.map((a) => [a.at.getTime(), a.at])).values()].sort((a, b) => a - b);
  let cur = null, next = null;
  if (on) for (const at of starts) { if (at <= now) cur = at; else if (!next) next = at; }
  return { m, on, cur, next, blocks };
}

// ================================================================= Shop TV
function shopTv(view, ctx) {
  const hd = HD(ctx);
  const st = ctx.state.tv || (ctx.state.tv = { total: 15 * 60e3, left: 15 * 60e3, endAt: 0, running: false, done: false });
  let shoutI = 0;
  let info = null;
  const timers = [];
  const offs = [];
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); offs.push(() => t.removeEventListener(ev, fn, opt)); };
  const R = 2 * Math.PI * 18;

  view.innerHTML = `<div class="zv">
    ${strip('A big screen for the shop room: the clock, a countdown, the plan, print status, a sprint timer and the check-in code. Kids check in with their own phones.')}
    <div class="tv-wrap">
      <section class="tv" id="tv" aria-label="Shop TV" tabindex="-1">
        <div class="top">
          <span class="bm">${icon('zap', 'i')}</span>
          <b>${esc(session.team.name || 'Kilowattchaos')} · Shop TV</b>
          <span id="tvWeek"></span>
          <span class="tv-date" id="tvDate"></span>
          <span class="clock" id="tvClock" aria-live="off"></span>
        </div>
        <div class="pane tv-count">
          <span class="lbl" id="tvCdLbl"></span>
          <div class="huge" id="tvCd"></div>
          <div class="sub" id="tvCdWhat"></div>
          <div class="tv-meta" id="tvCdMeta"></div>
        </div>
        <div class="pane tv-plan">
          <span class="lbl" id="tvAgLbl"></span>
          <div id="tvAg"></div>
        </div>
        <div class="pane checkin">
          <span class="lbl">Check in</span>
          <div id="tvQr" class="lh-qr"><svg viewBox="0 0 25 25" class="qr" aria-hidden="true"><rect width="25" height="25" rx="2" fill="#fff"/></svg></div>
          <div class="tv-ci">
            <div class="codeword" id="tvCode" aria-label="Loading today's code">…</div>
            <div class="sub">Scan with your phone to check in</div>
            <div class="tv-meta" id="tvCodeHow">The code changes every day.</div>
            <div class="here" id="tvHere"></div>
            <div class="tv-meta" id="tvHereN"></div>
          </div>
        </div>
        <div class="foot">
          <div class="pane tv-sprint" id="tvSprintPane">
            <span class="lbl">Build sprint</span>
            <div class="sprint" id="tvSprint"></div>
            <div class="sub" id="tvSprintSub"></div>
          </div>
          <div class="pane">
            <span class="lbl">Printing</span>
            <div class="prt" id="tvPrint"></div>
          </div>
          <div class="pane">
            <span class="lbl">Shoutout</span>
            <div class="shout" id="tvShout" aria-live="off"></div>
          </div>
        </div>
      </section>
    </div>
    <article class="card c7">
      <div class="card-head"><span class="oc2">${icon('sliders', 'i sm')}</span><h3 class="card-title">TV controls</h3></div>
      <div class="tv-ctrls">
        <button class="btn primary pill" type="button" id="tvFull" aria-pressed="false">${icon('max', 'i sm')}<span>Fullscreen</span></button>
        <button class="btn soft pill" type="button" id="tvShoutBtn">${icon('sparkle', 'i sm')}Give a shoutout</button>
      </div>
      <h4 class="sub">Build sprint</h4>
      <div class="tv-ctrls">
        ${seg('sprint', [['10', '10 min'], ['15', '15 min'], ['25', '25 min']], String(Math.round(st.total / 60e3)), 'Sprint length')}
        <button class="btn primary pill" type="button" id="tvGo" aria-pressed="false"></button>
        <button class="btn ghost pill" type="button" id="tvReset">${icon('reset', 'i sm')}Reset</button>
      </div>
      <p class="cap" style="font-weight:400">In fullscreen, press Space to start or pause the sprint and R to reset it. Escape leaves fullscreen. The sprint timer runs on this screen only.</p>
    </article>
    <article class="card c5">
      <div class="card-head"><span class="oc2 volt">${icon('play', 'i sm')}</span><h3 class="card-title">How to run it</h3></div>
      <ol class="tv-how">
        <li>Plug any laptop into the shop TV and sign in as a mentor.</li>
        <li>Open the Hub, go to Home, then Shop TV.</li>
        <li>Press Fullscreen. It needs no clicks after that: the clock, countdown, plan, prints and check-ins update by themselves.</li>
      </ol>
      <p class="cap" style="font-weight:400">Kids never sign in on the TV. They scan the code with their own phones, or type the code word on the check-in page.</p>
    </article>
  </div>`;

  const tv = $('#tv', view);

  // ---- Clock, countdown and agenda (every second)
  let lastAg = '';
  const tick = () => {
    const now = new Date();
    $('#tvClock', view).textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    $('#tvDate', view).textContent = fmtLong.format(now);
    $('#tvWeek', view).textContent = `Season week ${weekOf(ctx, now)}`;
    const s = meetingNow(ctx, now);
    let lbl, target, what, meta;
    if (!s.m) {
      lbl = 'Next meeting'; target = null; what = hd.H.loaded ? 'Nothing on the calendar yet.' : 'Loading the calendar…'; meta = hd.H.loaded ? 'A mentor adds meetings in Logbook.' : '';
    } else if (s.on && s.next) {
      lbl = 'Next block in'; target = s.next;
      what = s.blocks.filter((a) => a.at.getTime() === s.next.getTime()).map((a) => a.what).join(' · ');
      meta = `Starts at ${fmtTime(s.next)}${s.m.where ? ` · ${s.m.where}` : ''}`;
    } else if (s.on) {
      lbl = `${s.m.title} ends in`; target = s.m.end; what = 'Clean up and write one line about today.'; meta = `Ends at ${fmtTime(s.m.end)}`;
    } else {
      const today = dayStart(now).getTime() === dayStart(s.m.start).getTime();
      lbl = today ? 'Starts in' : 'Next up in'; target = s.m.start;
      what = `${s.m.title}: ${today ? 'today' : fmtLong.format(s.m.start)}${s.m.allDay ? '' : `, ${fmtTime(s.m.start)} to ${fmtTime(s.m.end)}`}`;
      meta = s.m.where || '';
    }
    const cd = $('#tvCd', view);
    if (target) {
      const [h, a] = cdHtml(target - now, false);
      if (cd.innerHTML !== h) cd.innerHTML = h;
      cd.setAttribute('aria-label', a);
    } else { cd.textContent = '--'; cd.removeAttribute('aria-label'); }
    $('#tvCdLbl', view).textContent = lbl;
    $('#tvCdWhat', view).textContent = what;
    $('#tvCdMeta', view).textContent = meta;
    const plan = hd.planFor(now);
    const items = hd.planItems(plan);
    const agLbl = !plan ? 'Plan' : plan.today ? "Today's plan" : `Plan for ${new Date(plan.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' })}`;
    const agKey = `${agLbl}|${s.cur ? s.cur.getTime() : ''}|${JSON.stringify(items.map((a) => [a.t, a.what, a.who]))}|${hd.H.loaded}`;
    if (agKey !== lastAg) {
      lastAg = agKey;
      $('#tvAgLbl', view).textContent = agLbl;
      $('#tvAg', view).innerHTML = items.length
        ? items.map((a) => `<div class="ag${s.cur && a.at && a.at.getTime() === s.cur.getTime() ? ' now' : ''}"><time>${esc(a.t)}</time><div>${esc(a.what)}</div>${a.who.length ? `<span class="who">${a.who.map((n) => av(n, 18)).join('')}</span>` : '<span></span>'}</div>`).join('')
        : `<div class="tv-meta">${hd.H.loaded ? 'No plan posted yet. A mentor adds it on Home.' : 'Loading…'}</div>`;
    }
    sprintTick(now);
  };

  // ---- Build sprint (timestamps, so a slow tab never drifts)
  const sprintTick = (now = new Date()) => {
    if (st.running) {
      st.left = Math.max(0, st.endAt - now.getTime());
      if (st.left === 0) { st.running = false; st.done = true; }
    }
    const pane = $('#tvSprintPane', view);
    pane.classList.toggle('is-done', st.done);
    const sp = $('#tvSprint', view), sub = $('#tvSprintSub', view);
    if (st.done) {
      sp.textContent = 'Time!';
      sub.textContent = 'Clean up and write one line about it.';
    } else {
      const sec = Math.ceil(st.left / 1000);
      sp.textContent = `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
      sub.textContent = st.running ? 'Heads down. Build something you can test.' : st.left < st.total ? 'Paused.' : `Ready for a ${Math.round(st.total / 60e3)} minute sprint.`;
    }
    const go = $('#tvGo', view);
    go.setAttribute('aria-pressed', String(st.running));
    const label = st.running ? `${icon('min', 'i sm')}Pause` : `${icon('play', 'i sm')}${st.done || st.left === st.total ? 'Start' : 'Resume'}`;
    if (go.innerHTML !== label) go.innerHTML = label;
  };
  const toggleSprint = () => {
    if (st.running) { st.left = Math.max(0, st.endAt - Date.now()); st.running = false; }
    else {
      if (st.done || st.left <= 0) { st.left = st.total; st.done = false; }
      st.endAt = Date.now() + st.left; st.running = true;
    }
    sprintTick();
  };
  const resetSprint = () => { st.running = false; st.done = false; st.left = st.total; sprintTick(); };
  wireSeg(view, 'sprint', (v) => { st.total = +v * 60e3; resetSprint(); });
  $('#tvGo', view).addEventListener('click', toggleSprint);
  $('#tvReset', view).addEventListener('click', resetSprint);
  $('#tvShoutBtn', view).addEventListener('click', () => hd.shoutout());

  // ---- Check-in: today's real code, its QR and who is here (refreshed every 30 seconds)
  const renderCheckin = () => {
    if (!info) return;
    const qr = $('#tvQr', view);
    const svg = String(info.svg || '').replace('<svg ', '<svg class="qr" role="img" aria-label="QR code for today\'s check-in" ');
    if (qr.dataset.code !== info.code) { qr.innerHTML = svg; qr.dataset.code = info.code; }
    const codeEl = $('#tvCode', view);
    codeEl.textContent = info.code;
    codeEl.setAttribute('aria-label', `Code word ${String(info.code).split('').join(' ')}`);
    let host = '';
    try { host = new URL(info.url).host; } catch (e) { /* no url */ }
    $('#tvCodeHow', view).textContent = host ? `No camera? Go to ${host}/checkin and type the code.` : 'The code changes every day.';
    const here = Array.isArray(info.here) ? info.here : [];
    $('#tvHere', view).innerHTML = here.map((p) => av(p.name, 28)).join('');
    $('#tvHereN', view).textContent = here.length ? `${here.length} of ${info.total || here.length} here` : 'Nobody has checked in yet today.';
  };
  const loadCheckin = async () => {
    try { info = await api.checkinInfo(); renderCheckin(); }
    catch (err) { if (!info) { $('#tvCode', view).textContent = '--'; $('#tvHereN', view).textContent = "Couldn't load today's code. Trying again soon."; } }
  };

  // ---- Printing: what's on the printer right now
  const renderPrint = () => {
    const el = $('#tvPrint', view);
    if (!hd.H.loaded) { el.innerHTML = '<div>Loading…</div>'; return; }
    const q = hd.printQueue();
    const p = q.printing[0];
    if (p) {
      const pc = clamp(Math.round(Number(p.data.progress) || 0), 0, 100);
      el.innerHTML = `<span class="r"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(237,238,232,.16)" stroke-width="5"/><circle cx="22" cy="22" r="18" fill="none" stroke="#E8F542" stroke-width="5" stroke-linecap="round" stroke-dasharray="${R.toFixed(2)}" stroke-dashoffset="${(R * (1 - pc / 100)).toFixed(2)}"/></svg></span><div><b>${esc(hd.printName(p))}</b><br>${pc}%${p.data.printer ? ` on ${esc(p.data.printer)}` : ''} · for ${esc(hd.printWho(p))}${q.queued.length ? ` · ${q.queued.length} waiting` : ''}</div>`;
    } else if (q.queued.length) {
      el.innerHTML = `<div><b>${q.queued.length} waiting</b><br>Next up: ${esc(hd.printName(q.queued[0]))} for ${esc(hd.printWho(q.queued[0]))}</div>`;
    } else el.innerHTML = '<div><b>Printer is free</b><br>Send a print request from Build.</div>';
  };

  // ---- Shoutouts (the newest ten, a new one every 8 seconds; no fade when motion is reduced)
  const shoutEl = $('#tvShout', view);
  const paintShout = () => {
    const list = hd.H.shoutouts.filter((r) => r.data && r.data.text).slice(0, 10);
    if (!list.length) { shoutEl.innerHTML = hd.H.loaded ? 'No shoutouts yet. Give the first one with the + button on Home.' : 'Loading…'; return; }
    const r = list[shoutI % list.length];
    shoutEl.innerHTML = `${r.data.to ? `<b>${esc(r.data.to)}:</b> ` : ''}${esc(r.data.text)}<small>${av(r.data.to || r.author, 18)} From ${esc(r.author)}</small>`;
  };
  if (ctx.reduced) shoutEl.style.transition = 'none';
  timers.push(setInterval(() => {
    shoutI++;
    if (ctx.reduced) { paintShout(); return; }
    shoutEl.style.opacity = '0';
    timers.push(setTimeout(() => { paintShout(); shoutEl.style.opacity = '1'; }, 420));
  }, 8000));

  // ---- Fullscreen
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fullBtn = $('#tvFull', view);
  const syncFs = () => {
    const isOn = fsEl() === tv;
    fullBtn.setAttribute('aria-pressed', String(isOn));
    $('span', fullBtn).textContent = isOn ? 'Exit fullscreen' : 'Fullscreen';
  };
  const exitFs = () => { try { const p = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* already out */ } };
  fullBtn.addEventListener('click', () => {
    if (fsEl()) { exitFs(); return; }
    const req = tv.requestFullscreen || tv.webkitRequestFullscreen;
    const fail = () => ctx.toast("Fullscreen isn't available here. Press F11 (or Ctrl+Cmd+F on a Mac) to fill the screen instead.");
    if (!req) { fail(); return; }
    try { const p = req.call(tv); if (p && p.catch) p.catch(fail); } catch (e) { fail(); }
  });
  on(document, 'fullscreenchange', syncFs);
  on(document, 'webkitfullscreenchange', syncFs);
  on(document, 'keydown', (e) => {
    if (fsEl() !== tv) return;
    if (e.key === 'Escape') exitFs();
    else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); toggleSprint(); }
    else if (e.key === 'r' || e.key === 'R') resetSprint();
  });

  // ---- Live data: the TV reloads the team's records every 30 seconds
  const refresh = () => { renderPrint(); paintShout(); lastAg = ''; tick(); };
  offs.push(hd.onChange(refresh));
  timers.push(setInterval(() => {
    if (document.hidden) return;
    loadCheckin();
    hd.load(['event', 'agenda', 'print', 'shoutout']).then(() => hd.changed());
  }, 30000));
  loadCheckin();
  refresh();
  timers.push(setInterval(tick, 1000));

  return () => {
    timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
    offs.forEach((f) => f());
    if (fsEl() === tv) exitFs();
  };
}

// ================================================================= Layout (shared by Customize and the Dashboard)
const BUILTIN = [
  { id: 'hero', cls: 'w-hero', name: 'Robot in 3D', ic: 'bot', sizes: [['default', 'Big'], ['full', 'Full width']], fixed: true },
  { id: 'next', cls: 'w-next', name: 'Next up', ic: 'calendar', sizes: [['default', 'Small'], ['wide', 'Half'], ['full', 'Full']] },
  { id: 'tasks', cls: 'w-tasks', name: 'My tasks', ic: 'check', sizes: [['default', 'Small'], ['wide', 'Half'], ['full', 'Full']] },
  { id: 'timeline', cls: 'w-timeline', name: 'Season timeline', ic: 'flag', sizes: [['wide', 'Half'], ['default', 'Full']] },
  { id: 'plan', cls: 'w-plan', name: "Today's plan", ic: 'note', sizes: [['small', 'Small'], ['default', 'Half'], ['full', 'Full']] },
  { id: 'print', cls: 'w-print', name: 'Print queue', ic: 'printer', sizes: [['small', 'Small'], ['default', 'Half'], ['full', 'Full']] },
];
const EXTRAS = [
  { id: 'league', name: 'Countdown to the next meet', short: 'Next meet countdown', ic: 'trophy' },
  { id: 'shout', name: 'Latest shoutout', short: 'Latest shoutout', ic: 'sparkle' },
  { id: 'printer', name: 'Printer right now', short: 'Printer right now', ic: 'printer' },
  { id: 'word', name: 'Word of the day', short: 'Word of the day', ic: 'book' },
  { id: 'arena', name: 'My best Arena time', short: 'My best Arena time', ic: 'gamepad' },
  { id: 'week', name: 'Season week', short: 'Season week', ic: 'calendar' },
];
const XSIZES = [['default', 'Small'], ['wide', 'Half']];
const MAX_VISIBLE = 10;
const B = Object.fromEntries(BUILTIN.map((w) => [w.id, w]));
const X = Object.fromEntries(EXTRAS.map((w) => [w.id, w]));
const SIZE_CLS = { small: 'w-small', wide: 'w-wide', full: 'w-full' };
const defaultLayout = () => BUILTIN.map((w) => ({ id: w.id, hidden: false, size: 'default' }));
const meta = (id) => (id.startsWith('x:') ? { ...X[id.slice(2)], sizes: XSIZES, extra: true } : B[id]);

// Each person's layout is one `layout` record on their account, updated in place.
let layoutRec = null;    // the saved record, once loaded
let layoutRaw = null;    // { v, items } as last saved or loaded
let layoutReady = null;  // promise for the first load
let saveTimer = 0, saveChain = Promise.resolve();
function loadLayoutRec(ctx) {
  if (!layoutReady) {
    layoutReady = api.list('layout').then((items) => {
      const me = session.user && session.user.id;
      layoutRec = (items || []).find((r) => r.user_id === me) || null;
      if (layoutRec) layoutRaw = layoutRec.data;
      else {
        // Moving from the preview: a layout kept on this device becomes the account's layout.
        let old = null;
        try { old = JSON.parse(ctx.local.get('kwc-layout') || 'null'); } catch (e) { old = null; }
        if (old && Array.isArray(old.items)) { layoutRaw = old; persistLayout(ctx); }
      }
    }).catch((err) => { console.error(err); });
  }
  return layoutReady;
}
function persistLayout(ctx, onErr) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = { v: 1, items: (layoutRaw && layoutRaw.items) || [] };
    saveChain = saveChain.then(async () => {
      try {
        if (layoutRec) layoutRec = { ...layoutRec, ...(await api.update('layout', layoutRec.id, data)) };
        else layoutRec = await api.create('layout', data);
      } catch (err) { if (onErr) onErr(err); else console.error(err); }
    });
  }, 400);
}
function readLayout() {
  const raw = layoutRaw;
  const items = [];
  const seen = new Set();
  if (raw && Array.isArray(raw.items)) {
    for (const it of raw.items) {
      if (!it || typeof it.id !== 'string' || seen.has(it.id)) continue;
      const m = meta(it.id);
      if (!m || !m.name) continue;
      seen.add(it.id);
      const size = m.sizes.some(([v]) => v === it.size) ? it.size : 'default';
      items.push({ id: it.id, hidden: it.id === 'hero' ? false : !!it.hidden, size });
    }
  }
  for (const w of BUILTIN) if (!seen.has(w.id)) items.push({ id: w.id, hidden: false, size: 'default' });
  // Never more than MAX_VISIBLE showing: drop extras from the end, then hide built-ins.
  let vis = items.filter((i) => !i.hidden).length;
  for (let i = items.length - 1; i >= 0 && vis > MAX_VISIBLE; i--) {
    if (items[i].id.startsWith('x:')) { if (!items[i].hidden) vis--; items.splice(i, 1); }
  }
  return items;
}
const saveLayout = (ctx, items) => { layoutRaw = { v: 1, items }; persistLayout(ctx, (err) => ctx.toast(err.message)); };
const isDefault = (items) => JSON.stringify(items) === JSON.stringify(defaultLayout());

// How many calendar events fall between now and a day.
function countEvents(ctx, from, to) {
  return HD(ctx).allEvents().filter((e) => e.end > from && e.start < to && !/meet|competition|tournament|scrimmage/i.test(`${e.kind} ${e.title}`)).length;
}

function extraHtml(id, ctx) {
  const now = new Date();
  const m = X[id];
  const head = (t) => `<div class="card-head"><span class="oc2">${icon(m.ic, 'i sm')}</span><h3 class="card-title" id="xw-${id}">${m.name}</h3>${t || ''}</div>`;
  const hd = HD(ctx);
  if (id === 'league') {
    const m = hd.meets().find((x) => x.at >= dayStart(now));
    if (!m) return `${head('')}<div><div class="big">Not set</div><p class="cap" style="font-weight:400">${hd.H.loaded ? 'No meet on the calendar yet. Once a mentor adds one in Logbook, the countdown starts here.' : 'Loading…'}</p></div>`;
    const days = Math.max(0, Math.round((m.at - dayStart(now)) / DAY));
    const n = countEvents(ctx, now, m.at);
    return `${head('')}<div><div class="big">${days === 0 ? 'Today!' : `${days} <span class="unit">day${days === 1 ? '' : 's'}</span>`}</div><p class="cap" style="font-weight:400">${esc(m.title)}, ${m.at.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.${n ? ` ${n} meeting${n === 1 ? '' : 's'} on the calendar before it.` : ''}</p></div>`;
  }
  if (id === 'shout') {
    const r = hd.H.shoutouts.find((x) => x.data && x.data.text);
    if (!r) return `${head('')}<p class="cap" style="font-weight:400">${hd.H.loaded ? 'No shoutouts yet. Who helped you this week?' : 'Loading…'}</p><div class="card-foot"><span></span><button class="btn soft pill" type="button" data-xshout="1">${icon('sparkle', 'i sm')}Give one</button></div>`;
    const to = r.data.to || r.author;
    return `${head('')}<div class="xw-shout">${av(to, 40)}<p>${r.data.to ? `<b>${esc(r.data.to)}:</b> ` : ''}${esc(r.data.text)}</p></div><div class="card-foot"><span class="cap">From ${esc(r.author)}</span><button class="btn soft pill" type="button" data-xshout="1">${icon('sparkle', 'i sm')}Give one</button></div>`;
  }
  if (id === 'printer') {
    const q = hd.printQueue();
    const p = q.printing[0];
    const nextQ = q.queued[0];
    const after = nextQ ? `Next in line: ${esc(hd.printName(nextQ))} for ${esc(hd.printWho(nextQ))}.` : 'Nothing else waiting.';
    if (!p) return `${head('')}<div><div class="big">${hd.H.loaded ? 'Free' : '…'}</div><p class="cap" style="font-weight:400">${hd.H.loaded ? `Nothing is printing right now. ${after}` : 'Loading…'}</p></div>`;
    const pc = clamp(Math.round(Number(p.data.progress) || 0), 0, 100);
    return `${head('')}<div class="row">${ringSm(pc)}<div><div class="t">${esc(hd.printName(p))}</div><div class="cap">${pc}% done${p.data.printer ? ` on ${esc(p.data.printer)}` : ''} · for ${esc(hd.printWho(p))}</div></div></div><p class="cap" style="font-weight:400">${after}</p>`;
  }
  if (id === 'word') {
    const [t, cat, d] = GLOSSARY[dayIndex(now) % GLOSSARY.length];
    return `${head(tag(esc(cat)))}<div><div class="big xw-word">${esc(t)}</div><p class="xw-def">${esc(d)}</p></div><div class="card-foot"><span class="cap">A new word every day.</span><button class="btn ghost pill" type="button" data-goto="learn|Glossary">Glossary</button></div>`;
  }
  if (id === 'arena') {
    const v = parseFloat(ctx.local.get('kwc-arena-best'));
    const has = Number.isFinite(v) && v > 0;
    return `${head(tag('On this device'))}<div>${has ? `<div class="big">${v.toFixed(1)} <span class="unit">s</span></div><p class="cap" style="font-weight:400">Your best time collecting all 10 pollen in the BioBuzz Arena.</p>` : `<div class="big">No run yet</div><p class="cap" style="font-weight:400">Collect all 10 pollen in the BioBuzz Arena and your best time shows up here.</p>`}</div><div class="card-foot"><span></span><button class="btn soft pill" type="button" data-goto="code|BioBuzz Arena">${icon('play', 'i sm')}${has ? 'Beat it' : 'Try the Arena'}</button></div>`;
  }
  if (id === 'week') {
    const wk = weekOf(ctx, now);
    const toDoors = Math.ceil((dayStart(DOORS) - dayStart(now)) / DAY);
    return `${head('')}<div><div class="big">Week ${wk}</div><p class="cap" style="font-weight:400">BIOBUZZ 2026–27 kicked off on September 12. ${toDoors > 0 ? `The Hub opens its doors in ${toDoors} day${toDoors === 1 ? '' : 's'}, on December 1.` : 'The Hub is open.'}</p></div>`;
  }
  return head('');
}
function ringSm(pct) {
  const r = 18, C = 2 * Math.PI * r;
  return `<span class="xw-ring"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="${r}"/><circle class="val" cx="22" cy="22" r="${r}" style="stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${(C * (1 - clamp(pct, 0, 100) / 100)).toFixed(2)}"/></svg><span>${pct}%</span></span>`;
}

// Load this person's saved layout once, then lay out the dashboard.
export async function initLayout(bento, ctx) {
  await loadLayoutRec(ctx);
  applyLayout(bento, ctx);
  if (bento && !bento.dataset.shoutWired) {
    bento.dataset.shoutWired = '1';
    bento.addEventListener('click', (e) => { if (e.target.closest('[data-xshout]')) HD(ctx).shoutout(); });
  }
}
export function applyLayout(bento, ctx) {
  if (!bento) return;
  const items = readLayout(ctx);
  $$(':scope > .xw[data-extra]', bento).forEach((el) => el.remove());
  items.forEach((it, i) => {
    let el;
    if (it.id.startsWith('x:')) {
      const id = it.id.slice(2);
      el = document.createElement('article');
      el.className = 'card w-extra xw';
      el.dataset.extra = id;
      el.setAttribute('aria-labelledby', `xw-${id}`);
      el.innerHTML = extraHtml(id, ctx);
      bento.appendChild(el);
    } else {
      el = $(`:scope > .${B[it.id].cls}`, bento);
      if (!el) return;
    }
    el.classList.remove('w-small', 'w-wide', 'w-full');
    if (SIZE_CLS[it.size]) el.classList.add(SIZE_CLS[it.size]);
    el.hidden = it.id === 'hero' ? false : it.hidden;
    el.style.order = isDefault(items) ? '' : String(i);
  });
}

// ================================================================= Customize
function customize(view, ctx) {
  const bento = ctx.bento;
  bento.classList.add('editing');
  let items = readLayout(ctx);
  let alive = true;
  loadLayoutRec(ctx).then(() => { if (!alive) return; items = readLayout(ctx); applyLayout(bento, ctx); render(); });
  const visible = () => items.filter((i) => !i.hidden).length;

  view.innerHTML = `<div class="zv">
    ${strip("Make Home yours: move, resize, hide and add widgets. Changes show up on the dashboard below right away and save to your account, so nobody else's Home changes.")}
    <article class="card c8">
      <div class="card-head"><span class="oc2">${icon('layers', 'i sm')}</span><h3 class="card-title">Your widgets</h3><span class="tag" id="cuCount"></span></div>
      <div class="cust" id="cuList"></div>
    </article>
    <article class="card c4">
      <div class="card-head"><span class="oc2 volt">${icon('plus', 'i sm')}</span><h3 class="card-title">Add a widget</h3></div>
      <p class="cap" style="font-weight:400">Pick any you like. Home shows up to ${MAX_VISIBLE} widgets at once.</p>
      <div class="extras" id="cuExtras"></div>
      <div class="recap">Your layout follows you: sign in on any phone or laptop and your Home looks the same.</div>
      <div class="card-foot"><span class="cap" id="cuSaved" aria-live="polite"></span><button class="btn ghost pill" type="button" id="cuReset">${icon('reset', 'i sm')}Reset to the standard layout</button></div>
    </article>
  </div>`;

  const list = $('#cuList', view), ex = $('#cuExtras', view);
  const render = (focusKey) => {
    const n = items.length;
    list.innerHTML = items.map((it, i) => {
      const m = meta(it.id);
      const k = esc(it.id);
      const nm = esc(m.name);
      return `<div class="cw${it.hidden ? ' off' : ''}" data-id="${k}">
        <span class="oc2">${icon(m.ic, 'i sm')}</span>
        <div class="nm"><div class="t">${nm}</div><div class="cap">${m.extra ? 'Extra widget' : m.fixed ? 'Always shown' : it.hidden ? 'Hidden' : 'Shown'}</div></div>
        <div class="sz">${seg(`sz-${i}`, m.sizes, it.size, `Size of ${m.name}`)}</div>
        <div class="mv">
          <button class="icon-btn sm" type="button" data-mv="-1" data-fk="${k}|up" aria-label="Move ${nm} up"${i === 0 ? ' disabled' : ''}>${up}</button>
          <button class="icon-btn sm" type="button" data-mv="1" data-fk="${k}|down" aria-label="Move ${nm} down"${i === n - 1 ? ' disabled' : ''}>${down}</button>
        </div>
        ${m.fixed ? '<span class="sw-gap" aria-hidden="true"></span>' : sw(`cu-sw-${slugId(it.id)}`, !it.hidden, `Show ${m.name}`).replace('<button', `<button data-fk="${k}|sw"`)}
      </div>`;
    }).join('');
    items.forEach((it, i) => {
      const row = list.children[i];
      $$('[data-sz-' + i + ']', row).forEach((b) => b.setAttribute('data-fk', `${it.id}|sz|${b.getAttribute('data-sz-' + i)}`));
    });
    ex.innerHTML = EXTRAS.map((x) => {
      const onB = items.some((i) => i.id === `x:${x.id}`);
      return `<button type="button" data-x="${x.id}" data-fk="x|${x.id}" aria-pressed="${onB}">${icon(onB ? 'check' : x.ic, 'i sm')}${esc(x.short)}</button>`;
    }).join('');
    $('#cuCount', view).textContent = `${visible()} of ${MAX_VISIBLE} showing`;
    $('#cuReset', view).disabled = isDefault(items);
    if (focusKey) {
      const f = $$('[data-fk]', view).find((el) => el.dataset.fk === focusKey);
      if (f && !f.disabled) f.focus({ preventScroll: true });
      else if (f) { const alt = f.parentElement.querySelector('button:not([disabled])'); if (alt) alt.focus({ preventScroll: true }); }
    }
  };
  const commit = (focusKey) => {
    saveLayout(ctx, items);
    const sv = $('#cuSaved', view);
    if (sv) sv.textContent = 'Saved to your account';
    applyLayout(bento, ctx);
    items = readLayout(ctx);
    render(focusKey);
  };

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.cw');
    if (!row) return;
    const i = items.findIndex((it) => it.id === row.dataset.id);
    const it = items[i];
    const mv = e.target.closest('[data-mv]');
    const swb = e.target.closest('.switch');
    const szb = e.target.closest('[role="radio"]');
    if (mv) {
      const j = clamp(i + Number(mv.dataset.mv), 0, items.length - 1);
      if (j === i) return;
      [items[i], items[j]] = [items[j], items[i]];
      commit(mv.dataset.fk);
    } else if (swb) {
      if (it.hidden && visible() >= MAX_VISIBLE) { ctx.toast(`Home shows up to ${MAX_VISIBLE} widgets. Hide or remove one first.`); return; }
      it.hidden = !it.hidden;
      commit(swb.dataset.fk);
    } else if (szb) {
      const v = szb.getAttribute(`data-sz-${i}`);
      if (v == null || v === it.size) return;
      it.size = v;
      commit(szb.dataset.fk);
    }
  });
  ex.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const id = `x:${b.dataset.x}`;
    const at = items.findIndex((it) => it.id === id);
    if (at >= 0) { items.splice(at, 1); commit(b.dataset.fk); return; }
    if (visible() >= MAX_VISIBLE) { ctx.toast(`Home shows up to ${MAX_VISIBLE} widgets. Hide or remove one first.`); return; }
    items.push({ id, hidden: false, size: 'default' });
    commit(b.dataset.fk);
    const card = $(`:scope > .xw[data-extra="${b.dataset.x}"]`, bento);
    if (card) ctx.toast(`Added ${X[b.dataset.x].name}. It's at the end of your dashboard.`);
  });
  $('#cuReset', view).addEventListener('click', () => {
    items = defaultLayout();
    saveLayout(ctx, items);
    applyLayout(bento, ctx);
    render();
    $('#cuReset', view).focus({ preventScroll: true });
    ctx.toast('Back to the standard layout.');
  });

  render();
  return () => { alive = false; bento.classList.remove('editing'); };
}
const slugId = (id) => id.replace(/[^a-z0-9]/gi, '-');

export const HOME = { 'Shop TV': shopTv, Customize: customize };
