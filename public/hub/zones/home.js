// Home zone: Shop TV (a big screen for the shop room) and Customize (each kid's own dashboard layout).
// Meetings, the agenda, prints, shoutouts and check-ins are sample data. The clock and countdowns are real.
import { $, $$, esc, clamp, icon, tag, SAMPLE, strip, av, sw, seg, wireSeg, codePattern, GLOSSARY, KIDS } from './common.js';

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

// ---------------------------------------------------------------- Sample content shared by both pages
const SHOUTS = [
  ['Pixel', 'Pixel got the intake to grab 7 of 10 balls with the gecko wheels 4 mm closer.', 'Coach'],
  ['Byte', 'Byte helped Gizmo find the missing telemetry.update() in two minutes flat.', 'Gizmo'],
  ['Rivet', 'Rivet stiffened the launcher mount, and it stopped wobbling at full speed.', 'Sparky'],
  ['Echo', 'Echo wrote the first page of our engineering portfolio. It reads really well.', 'Coach'],
  ['Nova', 'Nova booked the library robot demo for December. Outreach for the win.', 'Pixel'],
  ['Gizmo', 'Gizmo tracked down the servo gate double-feed and filmed the test.', 'Byte'],
  ['Sparky', 'Sparky measured the flywheel and wrote the numbers on the board for everyone.', 'Rivet'],
];
const WORDS = ['BOLT', 'GEAR', 'AXLE', 'SPIN', 'VOLT', 'COGS', 'HEXA', 'LIFT', 'GRIP', 'ZOOM'];
const PRINT = { what: '4 intake roller hubs', pct: 62, printer: 'Printer 1', left: '48 min left' };
const LEAGUE1 = new Date(2027, 0, 16);
const DOORS = new Date(2026, 11, 1);
const BREAK = [new Date(2026, 11, 21), new Date(2027, 0, 2)];

const toDate = (base, t) => {
  const [h, m] = t.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h < 8 ? h + 12 : h, m);
};

function cdHtml(ms, short) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return [`${d}<small>d</small>${h}<small>h</small>`, `${d} days ${h} hours`];
  if (h > 0) return [`${h}<small>h</small>${pad(m)}<small>m</small>`, `${h} hours ${m} minutes`];
  return [short ? `${m}<small>m</small>` : `${m}:${pad(sec)}`, `${m} minutes ${sec} seconds`];
}

// Where are we right now? Works off the real clock and the sample Tue/Thu schedule.
function meetingNow(ctx, now) {
  const m = ctx.nextMeeting(now);
  if (!m) return { m: null, on: false };
  const on = now >= m.start && now < m.end;
  const starts = [...new Set(ctx.AGENDA.map((a) => a.t))].map((t) => ({ t, at: toDate(m.start, t) })).sort((a, b) => a.at - b.at);
  let cur = null, next = null;
  if (on) {
    for (const s of starts) { if (s.at <= now) cur = s; else if (!next) next = s; }
  }
  return { m, on, cur, next };
}

// ================================================================= Shop TV
function shopTv(view, ctx) {
  const st = ctx.state.tv || (ctx.state.tv = { here: ['Pixel', 'Byte', 'Nova'], total: 15 * 60e3, left: 15 * 60e3, endAt: 0, running: false, done: false });
  const now0 = new Date();
  const code = WORDS[dayIndex(now0) % WORDS.length];
  let shoutI = dayIndex(now0) % SHOUTS.length;
  const timers = [];
  const offs = [];
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); offs.push(() => t.removeEventListener(ev, fn, opt)); };

  view.innerHTML = `<div class="zv">
    ${strip('A big screen for the shop room: the clock, a countdown, the plan, print status, a sprint timer and the check-in code. Kids check in with their own phones.', [tag('Phase 2 · Dec 7–18'), SAMPLE])}
    <div class="tv-wrap">
      <section class="tv" id="tv" aria-label="Shop TV" tabindex="-1">
        <div class="top">
          <span class="bm">${icon('zap', 'i')}</span>
          <b>Kilowattchaos · Shop TV</b>
          <span id="tvWeek"></span>
          <span class="tv-sample">Sample data</span>
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
          ${codePattern(dayIndex(now0) % 97 + 3)}
          <div class="tv-ci">
            <div class="codeword" aria-label="Code word ${code.split('').join(' ')}">${code}</div>
            <div class="sub">Scan with your phone to check in</div>
            <div class="tv-meta">Sample code. The real one comes from the Hub and changes every meeting.</div>
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
            <div class="prt">
              <span class="r"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(237,238,232,.16)" stroke-width="5"/><circle cx="22" cy="22" r="18" fill="none" stroke="#E8F542" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 18).toFixed(2)}" stroke-dashoffset="${(2 * Math.PI * 18 * (1 - PRINT.pct / 100)).toFixed(2)}"/></svg></span>
              <div><b>${PRINT.what}</b><br>${PRINT.pct}% on ${PRINT.printer} · ${PRINT.left}</div>
            </div>
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
        <button class="btn soft pill" type="button" id="tvCheck">${icon('users', 'i sm')}Check in a sample kid</button>
      </div>
      <h4 class="sub">Build sprint</h4>
      <div class="tv-ctrls">
        ${seg('sprint', [['10', '10 min'], ['15', '15 min'], ['25', '25 min']], String(Math.round(st.total / 60e3)), 'Sprint length')}
        <button class="btn primary pill" type="button" id="tvGo" aria-pressed="false"></button>
        <button class="btn ghost pill" type="button" id="tvReset">${icon('reset', 'i sm')}Reset</button>
      </div>
      <p class="cap" style="font-weight:400">In fullscreen, press Space to start or pause the sprint and R to reset it. Escape leaves fullscreen.</p>
    </article>
    <article class="card c5">
      <div class="card-head"><span class="oc2 volt">${icon('play', 'i sm')}</span><h3 class="card-title">How to run it</h3></div>
      <ol class="tv-how">
        <li>Plug any laptop into the shop TV.</li>
        <li>Open the Hub, go to Home, then Shop TV.</li>
        <li>Press Fullscreen. It needs no clicks after that: the clock, countdown and plan move on by themselves.</li>
      </ol>
      <p class="cap" style="font-weight:400">The Mechanism Lab cards join the TV the week of November 16. Kids never sign in on the TV; they scan the code with their own phones.</p>
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
      lbl = 'Next meeting'; target = null; what = 'Nothing on the calendar yet.'; meta = '';
    } else if (s.on && s.next) {
      lbl = 'Next block in'; target = s.next.at;
      what = ctx.AGENDA.filter((a) => a.t === s.next.t).map((a) => a.what).join(' · ');
      meta = `Starts at ${fmtTime(s.next.at)} · Shop room`;
    } else if (s.on) {
      lbl = 'Meeting ends in'; target = s.m.end; what = 'Clean up and write one line about today.'; meta = `Ends at ${fmtTime(s.m.end)}`;
    } else {
      const today = dayStart(now).getTime() === dayStart(s.m.start).getTime();
      lbl = today ? 'Meeting starts in' : 'Next meeting in'; target = s.m.start;
      what = `${today ? 'Today' : fmtLong.format(s.m.start)}, ${fmtTime(s.m.start)} to ${fmtTime(s.m.end)}`;
      meta = 'Build session · Shop room · Sample schedule';
    }
    const cd = $('#tvCd', view);
    if (target) {
      const [h, a] = cdHtml(target - now, false);
      if (cd.innerHTML !== h) cd.innerHTML = h;
      cd.setAttribute('aria-label', a);
    } else cd.textContent = '--';
    $('#tvCdLbl', view).textContent = lbl;
    $('#tvCdWhat', view).textContent = what;
    $('#tvCdMeta', view).textContent = meta;
    const agLbl = s.on ? "Today's plan" : s.m ? `Plan for ${dayStart(now).getTime() === dayStart(s.m.start).getTime() ? 'today' : s.m.start.toLocaleDateString('en-US', { weekday: 'long' })}` : 'Plan';
    const agKey = `${agLbl}|${s.cur ? s.cur.t : ''}`;
    if (agKey !== lastAg) {
      lastAg = agKey;
      $('#tvAgLbl', view).textContent = agLbl;
      $('#tvAg', view).innerHTML = ctx.AGENDA.map((a) => `<div class="ag${s.cur && a.t === s.cur.t ? ' now' : ''}"><time>${esc(a.t)}</time><div>${esc(a.what)}</div>${a.who.length ? `<span class="who">${a.who.map((n) => av(n, 18)).join('')}</span>` : '<span></span>'}</div>`).join('');
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

  // ---- Check-ins (sample)
  const renderHere = () => {
    $('#tvHere', view).innerHTML = st.here.map((n) => av(n, 28)).join('');
    $('#tvHereN', view).textContent = `${st.here.length} of ${KIDS.length} here`;
    $('#tvCheck', view).disabled = false;
  };
  $('#tvCheck', view).addEventListener('click', () => {
    const next = KIDS.find((k) => !st.here.includes(k.n));
    if (!next) { st.here = []; renderHere(); ctx.toast('Everyone was here, so the sample list starts over.'); return; }
    st.here.push(next.n);
    renderHere();
    ctx.toast(`${next.n} checked in. On the real TV this happens when they scan the code.`);
  });

  // ---- Shoutouts (every 8 seconds; no fade when motion is reduced)
  const shoutEl = $('#tvShout', view);
  const paintShout = () => {
    const [who, text, from] = SHOUTS[shoutI % SHOUTS.length];
    shoutEl.innerHTML = `${esc(text)}<small>${av(who, 18)} From ${esc(from)} · sample</small>`;
  };
  paintShout();
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

  renderHere();
  tick();
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
  { id: 'league', name: 'Countdown to League meet 1', short: 'League meet 1 (sample Jan 16)', ic: 'trophy' },
  { id: 'shout', name: 'Shoutout of the day', short: 'Shoutout of the day', ic: 'sparkle' },
  { id: 'printer', name: 'Printer 1 right now', short: 'Printer 1 right now', ic: 'printer' },
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

function readLayout(ctx) {
  let raw = null;
  try { raw = JSON.parse(ctx.local.get('kwc-layout') || 'null'); } catch (e) { raw = null; }
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
const saveLayout = (ctx, items) => ctx.local.set('kwc-layout', JSON.stringify({ v: 1, items }));
const isDefault = (items) => JSON.stringify(items) === JSON.stringify(defaultLayout());

function countMeetings(from, to) {
  let n = 0;
  for (let d = dayStart(from); d < to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const wd = d.getDay();
    if ((wd === 2 || wd === 4) && !(d >= BREAK[0] && d <= BREAK[1])) {
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 30);
      if (end > from) n++;
    }
  }
  return n;
}

function extraHtml(id, ctx) {
  const now = new Date();
  const m = X[id];
  const head = (t) => `<div class="card-head"><span class="oc2">${icon(m.ic, 'i sm')}</span><h3 class="card-title" id="xw-${id}">${m.name}</h3>${t || ''}</div>`;
  if (id === 'league') {
    const days = Math.max(0, Math.ceil((dayStart(LEAGUE1) - dayStart(now)) / DAY));
    return `${head(tag('Sample date'))}<div><div class="big">${days} <span class="unit">days</span></div><p class="cap" style="font-weight:400">Saturday, January 16. About ${countMeetings(now, LEAGUE1)} meetings left before it, not counting winter break.</p></div>`;
  }
  if (id === 'shout') {
    const [who, text, from] = SHOUTS[dayIndex(now) % SHOUTS.length];
    return `${head(SAMPLE)}<div class="xw-shout">${av(who, 40)}<p>${esc(text)}</p></div><p class="cap">From ${esc(from)}. A new one every day.</p>`;
  }
  if (id === 'printer') {
    return `${head(SAMPLE)}<div class="row">${ringSm(PRINT.pct)}<div><div class="t">${PRINT.what}</div><div class="cap">${PRINT.pct}% done on ${PRINT.printer} · ${PRINT.left}</div></div></div><p class="cap" style="font-weight:400">Next in line: the ball ramp guide, about 2 hours.</p>`;
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
  const visible = () => items.filter((i) => !i.hidden).length;

  view.innerHTML = `<div class="zv">
    ${strip("Make Home yours: move, resize, hide and add widgets. Changes show up on the dashboard below right away. Your layout lives on this device only, so nobody else's Home changes.", [tag('Phase 1 · doors open Dec 1')])}
    <article class="card c8">
      <div class="card-head"><span class="oc2">${icon('layers', 'i sm')}</span><h3 class="card-title">Your widgets</h3><span class="tag" id="cuCount"></span></div>
      <div class="cust" id="cuList"></div>
    </article>
    <article class="card c4">
      <div class="card-head"><span class="oc2 volt">${icon('plus', 'i sm')}</span><h3 class="card-title">Add a widget</h3></div>
      <p class="cap" style="font-weight:400">Pick any you like. Home shows up to ${MAX_VISIBLE} widgets at once.</p>
      <div class="extras" id="cuExtras"></div>
      <div class="recap">Coach can set the team's starting layout in Coach tools. Each kid's own layout lives on their own device, so a new phone or laptop starts from the team layout.</div>
      <div class="card-foot"><span></span><button class="btn ghost pill" type="button" id="cuReset">${icon('reset', 'i sm')}Reset to team layout</button></div>
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
    ctx.local.set('kwc-layout', '');
    applyLayout(bento, ctx);
    render();
    $('#cuReset', view).focus({ preventScroll: true });
    ctx.toast('Back to the team layout.');
  });

  render();
  return () => { bento.classList.remove('editing'); };
}
const slugId = (id) => id.replace(/[^a-z0-9]/gi, '-');

export const HOME = { 'Shop TV': shopTv, Customize: customize };
