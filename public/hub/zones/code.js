// Code zone: BioBuzz Arena (a drivable practice field), Our code, Snippets, Challenges.
// The Arena is a practice drill on a plain 12 ft field, not the real BIOBUZZ field. Our code shows starter files until
// a mentor connects the team's GitHub repo. Arena times, challenges and submissions are saved team data.
import { $, $$, esc, clamp, icon, tag, strip, av, avStack, sw, seg, wireSeg, copyText, codeBlock } from './common.js';
import { api, session, isMentor, me } from '../api.js';
import { myProgress, saveProgress } from './learn.js';

// ================================================================= BioBuzz Arena
const FIELD = 3.6576, TILE = FIELD / 6, H = 0.226, BALL = 0.045;
const VMAX = 1.7, STRAFE = 0.85, WMAX = 4.4;
const START = { x: TILE / 2, y: TILE / 2, th: Math.PI / 2 };
const POLLEN = [[1.2, 0.9], [2.1, 0.5], [3.1, 1.0], [0.7, 1.9], [1.8, 1.8], [2.9, 2.2], [0.5, 3.0], [1.5, 2.8], [2.4, 3.0], [3.2, 3.0]];
const SNIP_NOTE = {
  field: ['Field-centric drive', 'Push up on the stick and the robot goes up the field, whichever way it faces.'],
  slow: ['Slow mode toggle', 'Slow mode is on. Press Space or RB once to switch it; holding it down does nothing extra.'],
  telemetry: ['Telemetry you can read', 'Watch the wheel powers in the Telemetry card change as you drive.'],
  auto: ['Go to the nearest pollen', 'The robot turns toward the closest ball, drives to it, and repeats.'],
  robot: ['Robot-centric mecanum drive', 'Up on the stick always means "the way the robot is facing".'],
};
const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR']);
const turnSvg = (cw) => `<svg class="i lg" viewBox="0 0 24 24" aria-hidden="true"${cw ? ' style="transform:scaleX(-1)"' : ''}><path d="M9 4H4v5"/><path d="M4.6 9A8 8 0 1 1 4 13"/></svg>`;

// ---------------------------------------------------------------- Arena records: one per person { best, fieldBest, show }
let arenaItems = null, arenaChain = Promise.resolve();
async function loadArena() { arenaItems = await api.list('arena'); return arenaItems; }
const myArena = () => (arenaItems || []).find((r) => r.user_id === session.user?.id) || null;
function saveArena(patch) {
  const run = async () => {
    if (!arenaItems) await loadArena();
    const rec = myArena();
    const next = rec ? await api.update('arena', rec.id, patch) : await api.create('arena', { best: null, fieldBest: null, show: false, ...patch });
    const row = { ...(rec || {}), ...next, author: me() };
    arenaItems = [row, ...arenaItems.filter((r) => r.id !== row.id)];
    return row;
  };
  const p = arenaChain.then(run, run);
  arenaChain = p.catch(() => {});
  return p;
}
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function arena(view, ctx) {
  const mode0 = ctx.state.arenaMode || '';
  ctx.state.arenaMode = '';
  let fieldCentric = mode0 === 'field';
  let slow = mode0 === 'slow';
  let dead = false, loaded = false;
  const best = () => num(myArena()?.data?.best);
  const optIn = () => !!myArena()?.data?.show;
  const note = SNIP_NOTE[mode0];
  view.innerHTML = `<div class="zv">
    ${strip('Drive a twin of the StarterBot with a keyboard, a gamepad or touch, and practice before you touch the real robot. This is a practice drill on a plain 12 ft field, not the real BIOBUZZ field.', [tag('Your best time saves to your account'), tag('Practice drill, not the real field', 'line')])}
    ${note ? `<div class="robot-note" id="snipNote">${icon('code')}<span class="grow"><b>Running the "${note[0]}" snippet.</b> ${note[1]}</span><button class="icon-btn sm" type="button" id="snipX" aria-label="Dismiss">${icon('x')}</button></div>` : ''}
    <div class="arena">
      <div class="stack-v" style="gap:12px">
        <div class="field-wrap" id="fieldWrap">
          <canvas id="field" tabindex="0" role="application" aria-label="Practice field. Click it, then drive with W A S D and turn with Q and E."></canvas>
          <div class="hud" aria-hidden="true"><span class="st">${icon('clock', 'i sm')}<b id="hT">0.0</b>s</span><span class="st"><b id="hP">0</b>/10 pollen</span><span class="st" id="hB"></span><span class="st" id="hM" hidden></span></div>
          <div class="field-msg" id="fMsg"></div>
          <div class="joy" id="joy" aria-hidden="true"><i></i></div>
          <div class="turnpad"><button type="button" id="tL" aria-label="Turn left">${turnSvg(false)}</button><button type="button" id="tR" aria-label="Turn right">${turnSvg(true)}</button></div>
        </div>
        <div class="row wrap">
          <button class="btn primary pill" type="button" id="aStart">${icon('play', 'i sm')}Start drill</button>
          <button class="btn soft pill" type="button" id="aAuto">${icon('bot', 'i sm')}Run sample auto</button>
          ${seg('dm', [['robot', 'Robot-centric'], ['field', 'Field-centric']], fieldCentric ? 'field' : 'robot', 'Drive mode')}
          <span class="row" style="gap:8px">${sw('aSlow', slow, 'Slow mode')}<span class="cap">Slow mode</span></span>
        </div>
      </div>
      <div class="stack-v" style="gap:12px">
        <article class="card">
          <div class="card-head"><h3 class="card-title">How to drive</h3></div>
          <div class="keys">
            <span class="kk"><kbd class="k">W</kbd><kbd class="k">A</kbd><kbd class="k">S</kbd><kbd class="k">D</kbd></span><span>Drive and strafe</span>
            <span class="kk"><kbd class="k">Q</kbd><kbd class="k">E</kbd><kbd class="k">←</kbd><kbd class="k">→</kbd></span><span>Turn</span>
            <span class="kk"><kbd class="k">Space</kbd></span><span>Slow mode on or off</span>
            <span class="kk"><kbd class="k">R</kbd></span><span>Restart the drill</span>
          </div>
          <p class="cap" style="font-weight:400">Click the field first. On a gamepad the left stick drives, the right stick turns, RB is slow mode and A starts. On a phone, use the joystick and the turn buttons.</p>
        </article>
        <article class="card">
          <div class="row"><span class="oc2" id="gpIc">${icon('gamepad', 'i sm')}</span><div class="grow"><div class="t" id="gpT" style="font:500 14px/20px Inter,sans-serif"></div><div class="cap" id="gpS" style="font-weight:400"></div></div></div>
        </article>
        <article class="card" id="telem"${mode0 === 'telemetry' ? ' style="box-shadow:inset 0 0 0 2px var(--text)"' : ''}>
          <div class="card-head"><h3 class="card-title">Telemetry</h3><span class="tag">Live</span></div>
          <div class="readout" id="tR1"></div>
          <div class="wheels" id="tW" aria-label="Wheel powers"></div>
        </article>
        <article class="card">
          <div class="card-head"><h3 class="card-title">Team board</h3><span class="tag">Opt-in</span></div>
          <ol class="lb" id="lb"></ol>
          <div class="row between"><span class="cap">Show my best time</span>${sw('optIn', false, 'Show my best time on the team board')}</div>
          <p class="cap" style="font-weight:400" id="lbNote"></p>
        </article>
      </div>
    </div>
  </div>`;

  const wrap = $('#fieldWrap'), cv = $('#field'), g = cv.getContext('2d'), fMsg = $('#fMsg');
  const R = { x: START.x, y: START.y, th: START.th, vf: 0, vr: 0, w: 0 };
  let balls = POLLEN.map(([x, y]) => ({ x, y, got: false }));
  let state = 'ready', auto = false, t0 = 0, elapsed = 0, trail = [], pops = [], wheels = [0, 0, 0, 0], target = null;
  let D = 1, raf = 0, lastT = performance.now(), acc = 0;
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  let turnBtn = 0, gpPrevA = false, gpPrevRB = false, gpName = null, padBlocked = false;

  const msg = (html) => { fMsg.innerHTML = `<div>${html}</div>`; fMsg.hidden = false; };
  const again = '<div class="row wrap" style="justify-content:center"><button class="btn primary pill" type="button" data-m="start">Try again</button><button class="btn ghost pill" type="button" data-m="auto">Watch the sample auto</button></div>';
  msg(`<h4>Collect 10 pollen</h4><p>Drive into each yellow ball with the front of the robot, the bright bar. The clock starts when you move.</p><div class="row wrap" style="justify-content:center"><button class="btn primary pill" type="button" data-m="start">${icon('play', 'i sm')}Start</button><button class="btn ghost pill" type="button" data-m="auto">Watch the sample auto</button></div>`);

  const hudMode = () => {
    const parts = [fieldCentric && !auto ? 'Field-centric' : '', slow && !auto ? 'Slow' : '', auto ? 'Sample auto' : ''].filter(Boolean);
    const m = $('#hM');
    m.hidden = !parts.length; m.textContent = parts.join(' · ');
  };
  const hudBest = () => { const b = best(); $('#hB').textContent = b === null ? 'Best: none yet' : `Best ${b.toFixed(1)} s`; };
  const board = () => {
    if (!loaded) { $('#lb').innerHTML = '<li class="lv-lbempty">Loading the board…</li>'; return; }
    const b = best(), on = optIn();
    $('#optIn').setAttribute('aria-checked', String(on));
    const rows = (arenaItems || []).filter((r) => r.data?.show && num(r.data?.best) !== null)
      .map((r) => [r.author, r.data.best, r.user_id === session.user?.id]).sort((a, c) => a[1] - c[1]);
    $('#lb').innerHTML = rows.length ? rows.map(([n, t, mine], i) => `<li class="${mine ? 'me' : ''}"><span class="r">${i + 1}</span>${av(n, 28)}<span>${esc(n)}${mine ? ' (you)' : ''}</span><span class="sc">${t.toFixed(1)} s</span></li>`).join('')
      : '<li class="lv-lbempty">Nobody is on the board yet. Finish the drill and switch on "Show my best time" to be first.</li>';
    $('#lbNote').textContent = on ? (b === null ? 'Finish the drill once and your time shows up here.' : 'Your best time shows with your display name only.')
      : b === null ? 'Only teammates who switch this on show up.' : `Your best: ${b.toFixed(1)} s. Only you can see it until you switch this on.`;
  };
  const gpStatus = () => {
    const T = $('#gpT'), S = $('#gpS'), I = $('#gpIc');
    if (padBlocked) { T.textContent = 'Gamepads are blocked here'; S.textContent = 'This preview window blocks gamepads. In the real Hub, open the Arena in its own tab.'; I.className = 'oc2'; return; }
    if (gpName) { T.textContent = 'Gamepad connected'; S.textContent = gpName.replace(/\s*\(.*\)\s*$/, '').slice(0, 60) || 'Ready to drive'; I.className = 'oc2 volt'; return; }
    T.textContent = 'No gamepad yet'; S.textContent = 'Plug one in or pair it, then press any button on it.'; I.className = 'oc2';
  };
  const pad = () => {
    if (padBlocked || !navigator.getGamepads) return null;
    let list;
    try { list = navigator.getGamepads(); } catch (e) { padBlocked = true; gpStatus(); return null; }
    const gp = [...(list || [])].find((p) => p && p.connected) || null;
    const name = gp ? gp.id : null;
    if (name !== gpName) { gpName = name; gpStatus(); }
    return gp;
  };
  const toggleSlow = () => { slow = !slow; $('#aSlow').setAttribute('aria-checked', String(slow)); hudMode(); };
  const begin = (isAuto) => {
    Object.assign(R, { x: START.x, y: START.y, th: START.th, vf: 0, vr: 0, w: 0 });
    balls = POLLEN.map(([x, y]) => ({ x, y, got: false }));
    trail = []; pops = []; elapsed = 0; target = null;
    auto = isAuto;
    state = isAuto ? 'running' : 'armed';
    t0 = performance.now();
    fMsg.hidden = true;
    hudMode();
    cv.focus({ preventScroll: true });
  };
  const finish = (gaveUp) => {
    state = 'done';
    const t = elapsed;
    if (auto) {
      auto = false; hudMode();
      msg(gaveUp ? `<h4>The sample auto gave up</h4><p>It ran out of time chasing a ball. Real autos need a plan B too.</p>${again}` : `<h4>The sample auto took ${t.toFixed(1)} s</h4><p>Can you beat it by driving? Autos don't count for the team board.</p>${again}`);
      return;
    }
    const b = best();
    const isBest = loaded && (b === null || t < b);
    const fb = num(myArena()?.data?.fieldBest);
    const patch = {};
    if (isBest) patch.best = Math.round(t * 100) / 100;
    if (loaded && fieldCentric && (fb === null || t < fb)) patch.fieldBest = Math.round(t * 100) / 100;
    if (Object.keys(patch).length) saveArena(patch).then(() => { if (!dead) { hudBest(); board(); } }).catch((err) => ctx.toast(err.message));
    msg(`<h4>10 of 10 in ${t.toFixed(1)} s</h4><p>${isBest ? (b === null ? 'Your first time. Now try to beat it.' : `New best, ${(b - t).toFixed(1)} s faster than before.`) : `Your best is ${b.toFixed(1)} s.`}</p>${again}`);
    hudBest(); board();
  };

  const readInput = () => {
    let d = 0, s = 0, t = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) d += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) d -= 1;
    if (keys.has('KeyD')) s += 1;
    if (keys.has('KeyA')) s -= 1;
    if (keys.has('KeyE') || keys.has('ArrowRight')) t += 1;
    if (keys.has('KeyQ') || keys.has('ArrowLeft')) t -= 1;
    d -= joy.y; s += joy.x; t += turnBtn;
    const gp = pad();
    if (gp) {
      const dz = (v) => (Math.abs(v || 0) < 0.1 ? 0 : v);
      s += dz(gp.axes[0]); d -= dz(gp.axes[1]); t += dz(gp.axes[2]);
      const a = !!(gp.buttons[0] && gp.buttons[0].pressed), rb = !!(gp.buttons[5] && gp.buttons[5].pressed);
      if (a && !gpPrevA && (state === 'ready' || state === 'done')) begin(false);
      if (rb && !gpPrevRB) toggleSlow();
      gpPrevA = a; gpPrevRB = rb;
    }
    return { d: clamp(d, -1, 1), s: clamp(s, -1, 1), t: clamp(t, -1, 1) };
  };
  const autoInput = () => {
    const left = balls.filter((b) => !b.got);
    if (!left.length) return { d: 0, s: 0, t: 0 };
    const dist = (b) => Math.hypot(b.x - R.x, b.y - R.y);
    target = left.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    let err = Math.atan2(target.y - R.y, target.x - R.x) - R.th;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    return { d: Math.abs(err) < 0.6 ? clamp(dist(target) * 1.6, 0.25, 0.85) : 0.1, s: 0, t: clamp(-err * 2.2, -1, 1) };
  };

  const step = (dt) => {
    const user = readInput();
    let inp = auto ? autoInput() : user;
    if (state === 'ready' || state === 'done') inp = { d: 0, s: 0, t: 0 };
    if (state === 'armed' && (inp.d || inp.s || inp.t)) { state = 'running'; t0 = performance.now(); }
    let f = inp.d, r = inp.s;
    if (fieldCentric && !auto) { const c = Math.cos(R.th), sn = Math.sin(R.th); f = inp.s * c + inp.d * sn; r = inp.s * sn - inp.d * c; }
    const sc = slow && !auto ? 0.4 : 1;
    const max = Math.max(1, Math.abs(f) + Math.abs(r) + Math.abs(inp.t));
    wheels = [(f + r + inp.t) / max, (f - r - inp.t) / max, (f - r + inp.t) / max, (f + r - inp.t) / max].map((v) => v * sc);
    const k = 1 - Math.exp(-dt / 0.12);
    R.vf += ((f / max) * VMAX * sc - R.vf) * k;
    R.vr += ((r / max) * VMAX * STRAFE * sc - R.vr) * k;
    R.w += ((-inp.t / max) * WMAX * sc - R.w) * k;
    let c = Math.cos(R.th), sn = Math.sin(R.th);
    R.x += (R.vf * c + R.vr * sn) * dt;
    R.y += (R.vf * sn - R.vr * c) * dt;
    R.th += R.w * dt;
    const ext = H * (Math.abs(Math.cos(R.th)) + Math.abs(Math.sin(R.th)));
    R.x = clamp(R.x, ext, FIELD - ext); R.y = clamp(R.y, ext, FIELD - ext);
    c = Math.cos(R.th); sn = Math.sin(R.th);
    let got = 0;
    const lim = H + BALL;
    for (const b of balls) {
      if (b.got) { got++; continue; }
      const dx = b.x - R.x, dy = b.y - R.y;
      let lf = dx * c + dy * sn, lr = dx * sn - dy * c;
      if (Math.abs(lf) < lim && Math.abs(lr) < lim) {
        if (state === 'running' || state === 'armed') {
          if (lf > H * 0.25 && Math.abs(lr) < H * 0.72) { b.got = true; got++; pops.push({ x: b.x, y: b.y, t: 0 }); continue; }
        }
        const pf = lim - Math.abs(lf), pr = lim - Math.abs(lr);
        if (pf < pr) lf = Math.sign(lf || 1) * lim; else lr = Math.sign(lr || 1) * lim;
        b.x = clamp(R.x + lf * c + lr * sn, BALL, FIELD - BALL);
        b.y = clamp(R.y + lf * sn - lr * c, BALL, FIELD - BALL);
      }
    }
    if (state === 'running') {
      elapsed = (performance.now() - t0) / 1000;
      if (Math.hypot(R.vf, R.vr) > 0.05 || Math.abs(R.w) > 0.2) { trail.push([R.x, R.y]); if (trail.length > 240) trail.shift(); }
      if (got === balls.length) finish(false);
      else if (auto && elapsed > 60) finish(true);
    }
    pops = pops.filter((p) => (p.t += dt) < 0.35);
    return got;
  };

  const draw = () => {
    const w = cv.width, h = cv.height;
    if (!w || !h) return;
    const size = Math.min(w, h), ox = (w - size) / 2, oy = (h - size) / 2, s = size / FIELD;
    const X = (x) => ox + x * s, Y = (y) => oy + size - y * s;
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? '#3B4140' : '#363C3B'; g.fillRect(X(i * TILE), Y((j + 1) * TILE), TILE * s + 1, TILE * s + 1); }
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = Math.max(1, D);
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(X(i * TILE), oy); g.lineTo(X(i * TILE), oy + size); g.moveTo(ox, Y(i * TILE)); g.lineTo(ox + size, Y(i * TILE)); g.stroke(); }
    g.save(); g.setLineDash([6 * D, 6 * D]); g.strokeStyle = 'rgba(232,245,66,0.45)'; g.lineWidth = 2 * D; g.strokeRect(X(0.04), Y(TILE - 0.04), (TILE - 0.08) * s, (TILE - 0.08) * s); g.restore();
    g.fillStyle = 'rgba(237,238,232,0.5)'; g.font = `500 ${Math.round(11 * D)}px Inter, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillText('Practice drill · not the real field', ox + size - 12 * D, oy + size - 12 * D);
    g.textAlign = 'left'; g.fillText('Start', X(0.06) + 2 * D, Y(TILE - 0.04) - 6 * D);
    if (trail.length > 1) { g.beginPath(); trail.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.strokeStyle = 'rgba(232,245,66,0.18)'; g.lineWidth = 3 * D; g.lineJoin = 'round'; g.stroke(); }
    if (auto && target && !target.got) { g.save(); g.setLineDash([4 * D, 6 * D]); g.beginPath(); g.moveTo(X(R.x), Y(R.y)); g.lineTo(X(target.x), Y(target.y)); g.strokeStyle = 'rgba(232,245,66,0.7)'; g.lineWidth = 2 * D; g.stroke(); g.restore(); }
    for (const b of balls) {
      if (b.got) continue;
      g.beginPath(); g.arc(X(b.x), Y(b.y), BALL * s, 0, Math.PI * 2); g.fillStyle = '#E8F542'; g.fill();
      g.lineWidth = Math.max(1, D); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.stroke();
    }
    for (const p of pops) { const k = p.t / 0.35; g.beginPath(); g.arc(X(p.x), Y(p.y), BALL * s * (1 + k * 2.2), 0, Math.PI * 2); g.strokeStyle = `rgba(232,245,66,${1 - k})`; g.lineWidth = 2 * D; g.stroke(); }
    g.save();
    g.translate(X(R.x), Y(R.y)); g.rotate(-R.th);
    const hp = H * s, rr = (x, y, ww, hh, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, hh, r) : g.rect(x, y, ww, hh); };
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10 * D; g.shadowOffsetY = 3 * D;
    rr(-hp, -hp, hp * 2, hp * 2, hp * 0.16); g.fillStyle = '#2F3737'; g.fill();
    g.shadowColor = 'transparent';
    for (const [wx, wy] of [[1, -1], [1, 1], [-1, -1], [-1, 1]]) {
      const cx = wx * hp * 0.56, cy = wy * hp * 0.8;
      rr(cx - hp * 0.26, cy - hp * 0.15, hp * 0.52, hp * 0.3, hp * 0.06); g.fillStyle = '#121514'; g.fill();
      g.strokeStyle = '#5A605F'; g.lineWidth = Math.max(1, D * 1.2);
      for (let i = -2; i <= 2; i++) { const ox2 = cx + i * hp * 0.1, dir = wx * wy > 0 ? 1 : -1; g.beginPath(); g.moveTo(ox2 - hp * 0.06 * dir, cy - hp * 0.11); g.lineTo(ox2 + hp * 0.06 * dir, cy + hp * 0.11); g.stroke(); }
    }
    rr(-hp * 0.68, -hp * 0.5, hp * 1.3, hp * 1.0, hp * 0.1); g.fillStyle = '#4F5049'; g.fill();
    rr(hp * 0.8, -hp * 0.74, hp * 0.2, hp * 1.48, hp * 0.08); g.fillStyle = '#E8F542'; g.fill();
    g.beginPath(); g.moveTo(hp * 0.45, 0); g.lineTo(hp * 0.05, -hp * 0.28); g.lineTo(hp * 0.05, hp * 0.28); g.closePath(); g.fillStyle = '#EDEEE8'; g.fill();
    g.beginPath(); g.arc(-hp * 0.36, 0, hp * 0.22, 0, Math.PI * 2); g.strokeStyle = '#EDEEE8'; g.lineWidth = Math.max(1.5, D * 1.6); g.stroke();
    g.restore();
  };

  const telemetry = (got) => {
    const yaw = ((((R.th - Math.PI / 2) * 180) / Math.PI + 540) % 360) - 180;
    $('#tR1').innerHTML = `<div><b>${(R.x / 0.0254).toFixed(0)}<small style="font-size:12px;color:var(--muted)"> in</small></b><span>X</span></div><div><b>${(R.y / 0.0254).toFixed(0)}<small style="font-size:12px;color:var(--muted)"> in</small></b><span>Y</span></div><div><b>${yaw.toFixed(0)}°</b><span>Heading</span></div>`;
    $('#tW').innerHTML = ['Front left', 'Front right', 'Back left', 'Back right'].map((n, i) => {
      const v = wheels[i], wpx = Math.abs(v) * 50;
      return `<div class="wp"><span class="cap">${n}</span><span class="wv">${v >= 0 ? ' ' : ''}${v.toFixed(2)}</span><span class="bar2"><i style="${v >= 0 ? `left:50%;width:${wpx}%` : `left:${50 - wpx}%;width:${wpx}%`}"></i></span></div>`;
    }).join('');
    $('#hP').textContent = got;
  };
  const loop = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    const got = step(dt);
    draw();
    $('#hT').textContent = elapsed.toFixed(1);
    acc += dt;
    if (acc > 0.1) { acc = 0; telemetry(got); }
    raf = requestAnimationFrame(loop);
  };
  const ro = new ResizeObserver(() => {
    const r = wrap.getBoundingClientRect();
    D = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * D); cv.height = Math.round(r.height * D);
    draw();
  });
  ro.observe(wrap);

  cv.addEventListener('keydown', (e) => {
    if (!KEYS.has(e.code) && e.code !== 'Escape') return;
    if (e.code === 'Escape') { cv.blur(); return; }
    e.preventDefault();
    if (e.repeat && (e.code === 'Space' || e.code === 'KeyR')) return;
    if (e.code === 'Space') { toggleSlow(); return; }
    if (e.code === 'KeyR') { begin(false); return; }
    keys.add(e.code);
  });
  cv.addEventListener('keyup', (e) => keys.delete(e.code));
  cv.addEventListener('blur', () => keys.clear());
  cv.addEventListener('pointerdown', () => cv.focus({ preventScroll: true }));
  fMsg.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) begin(b.dataset.m === 'auto'); });
  $('#aStart').addEventListener('click', () => begin(false));
  $('#aAuto').addEventListener('click', () => begin(true));
  $('#aSlow').addEventListener('click', toggleSlow);
  wireSeg(view, 'dm', (v) => { fieldCentric = v === 'field'; hudMode(); cv.focus({ preventScroll: true }); });
  $('#optIn').addEventListener('click', async (e) => {
    const el = e.currentTarget;
    if (!loaded) return;
    const on = !optIn();
    el.setAttribute('aria-checked', String(on));
    try { await saveArena({ show: on }); if (!dead) board(); ctx.toast(on ? 'Your best time is on the team board.' : 'Your time is hidden from the board.'); }
    catch (err) { el.setAttribute('aria-checked', String(!on)); ctx.toast(err.message); }
  });
  const snipX = $('#snipX');
  if (snipX) snipX.addEventListener('click', () => $('#snipNote').remove());
  const jEl = $('#joy'), knob = $('#joy i');
  const jMove = (e) => {
    const r = jEl.getBoundingClientRect(), rad = r.width / 2;
    let dx = (e.clientX - r.left - rad) / rad, dy = (e.clientY - r.top - rad) / rad;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    joy.x = dx; joy.y = dy;
    knob.style.transform = `translate(${dx * rad * 0.6}px, ${dy * rad * 0.6}px)`;
  };
  const jEnd = () => { joy.x = 0; joy.y = 0; knob.style.transform = ''; };
  jEl.addEventListener('pointerdown', (e) => { e.preventDefault(); jEl.setPointerCapture(e.pointerId); if (state === 'ready' || state === 'done') begin(false); jMove(e); });
  jEl.addEventListener('pointermove', (e) => { if (jEl.hasPointerCapture(e.pointerId)) jMove(e); });
  jEl.addEventListener('pointerup', jEnd); jEl.addEventListener('pointercancel', jEnd);
  for (const [id, v] of [['#tL', -1], ['#tR', 1]]) {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); turnBtn = v; });
    const up = () => { turnBtn = 0; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  }
  const onPad = () => pad();
  addEventListener('gamepadconnected', onPad);
  addEventListener('gamepaddisconnected', onPad);

  hudMode(); hudBest(); board(); gpStatus(); pad(); telemetry(0);
  loadArena().then(() => { if (dead) return; loaded = true; hudBest(); board(); })
    .catch((err) => { if (!dead) { $('#lb').innerHTML = `<li class="lv-lbempty">Could not load the board. ${esc(err.message)}</li>`; ctx.toast(err.message); } });
  if (mode0 === 'auto') begin(true);
  raf = requestAnimationFrame(loop);
  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    removeEventListener('gamepadconnected', onPad);
    removeEventListener('gamepaddisconnected', onPad);
  };
}

// ================================================================= Our code (starter files until a mentor connects the team repo)
const FILES = {
  'opmodes/DriveTeleOp.java': {
    about: 'The driver-controlled program. Gamepad 1 drives the mecanum wheels; gamepad 2 runs the intake, launcher and ball path.',
    src: `package org.firstinspires.ftc.teamcode.opmodes;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import org.firstinspires.ftc.teamcode.subsystems.BallPath;
import org.firstinspires.ftc.teamcode.subsystems.Intake;
import org.firstinspires.ftc.teamcode.subsystems.Launcher;

@TeleOp(name = "Drive TeleOp", group = "Kilowattchaos")
public class DriveTeleOp extends LinearOpMode {
    // Mecanum wheels strafe a little slower than they drive. Tune 1.1 with a strafe test.
    static final double STRAFE_FIX = 1.1;

    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");
        // The right-side motors face the other way, so reverse them.
        frontRight.setDirection(DcMotorSimple.Direction.REVERSE);
        backRight.setDirection(DcMotorSimple.Direction.REVERSE);

        Intake intake = new Intake(hardwareMap);
        BallPath ballPath = new BallPath(hardwareMap);
        Launcher launcher = new Launcher(hardwareMap);

        telemetry.addLine("Ready. Press Start!");
        telemetry.update();
        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;   // up on the stick is negative
            double strafe = gamepad1.left_stick_x * STRAFE_FIX;
            double turn = gamepad1.right_stick_x;

            // Scale everything down if any wheel would go past full power.
            double max = Math.max(1.0, Math.abs(drive) + Math.abs(strafe) + Math.abs(turn));
            frontLeft.setPower((drive + strafe + turn) / max);
            backLeft.setPower((drive - strafe + turn) / max);
            frontRight.setPower((drive - strafe - turn) / max);
            backRight.setPower((drive + strafe - turn) / max);

            intake.run(gamepad2.right_trigger - gamepad2.left_trigger);
            if (gamepad2.a) launcher.spinUp();
            if (gamepad2.b) launcher.stop();
            // Only feed a ball once the flywheel is at speed.
            if (gamepad2.right_bumper && launcher.atSpeed()) ballPath.feedOne();
            ballPath.update();

            telemetry.addData("Launcher", "%.0f ticks/s", launcher.speed());
            telemetry.addData("At speed", launcher.atSpeed());
            telemetry.update();
        }
    }
}`,
  },
  'opmodes/AutoDriveForward.java': {
    about: 'The first autonomous: drive forward 24 inches using the wheel encoders, then stop. A good first auto to tune.',
    src: `package org.firstinspires.ftc.teamcode.opmodes;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@Autonomous(name = "Auto: drive forward", group = "Kilowattchaos")
public class AutoDriveForward extends LinearOpMode {
    // goBILDA 312 rpm motor: 537.7 encoder ticks per turn. Our mecanum wheels are 104 mm across.
    static final double TICKS_PER_INCH = 537.7 / (Math.PI * 104 / 25.4);

    DcMotor[] wheels;

    @Override
    public void runOpMode() {
        wheels = new DcMotor[] {
            hardwareMap.get(DcMotor.class, "frontLeft"), hardwareMap.get(DcMotor.class, "frontRight"),
            hardwareMap.get(DcMotor.class, "backLeft"), hardwareMap.get(DcMotor.class, "backRight")
        };
        wheels[1].setDirection(DcMotorSimple.Direction.REVERSE);
        wheels[3].setDirection(DcMotorSimple.Direction.REVERSE);
        for (DcMotor m : wheels) {
            m.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
            m.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        }

        waitForStart();
        driveInches(24, 0.4);
    }

    void driveInches(double inches, double power) {
        int ticks = (int) Math.round(inches * TICKS_PER_INCH);
        for (DcMotor m : wheels) {
            m.setTargetPosition(m.getCurrentPosition() + ticks);
            m.setMode(DcMotor.RunMode.RUN_TO_POSITION);
            m.setPower(power);
        }
        while (opModeIsActive() && wheels[0].isBusy() && wheels[1].isBusy()) {
            telemetry.addData("Front left", wheels[0].getCurrentPosition());
            telemetry.addData("Target", ticks);
            telemetry.update();
        }
        for (DcMotor m : wheels) m.setPower(0);
    }
}`,
  },
  'subsystems/Launcher.java': {
    about: 'The flywheel. It runs at a set speed, measured by the encoder, so every shot leaves the same way.',
    src: `package org.firstinspires.ftc.teamcode.subsystems;

import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.HardwareMap;

/** The flywheel launcher. setVelocity holds the speed steady, even as the battery drops. */
public class Launcher {
    // Target speed in encoder ticks per second. Tuned by testing shots, not by math.
    public static double TARGET = 1500;
    public static double TOLERANCE = 40;

    private final DcMotorEx motor;
    private double target = 0;

    public Launcher(HardwareMap hw) {
        motor = hw.get(DcMotorEx.class, "launcher");
        motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        // Let the flywheel coast down instead of slamming to a stop.
        motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.FLOAT);
    }

    public void spinUp() { target = TARGET; motor.setVelocity(target); }

    public void stop() { target = 0; motor.setVelocity(0); }

    public double speed() { return motor.getVelocity(); }

    public boolean atSpeed() { return target > 0 && Math.abs(speed() - target) < TOLERANCE; }
}`,
  },
  'subsystems/Intake.java': {
    about: 'The gecko-wheel intake. One motor: positive pulls balls in, negative spits them out.',
    src: `package org.firstinspires.ftc.teamcode.subsystems;

import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.HardwareMap;

/** The intake. This file just spins it. */
public class Intake {
    private final DcMotor motor;

    public Intake(HardwareMap hw) {
        motor = hw.get(DcMotor.class, "intake");
    }

    /** power: 1 pulls balls in, -1 spits them out, 0 stops. */
    public void run(double power) {
        motor.setPower(Math.max(-1, Math.min(1, power)));
    }

    public void stop() { motor.setPower(0); }
}`,
  },
  'subsystems/BallPath.java': {
    about: 'The servo gate between the hopper and the flywheel. It lets one ball through, then waits before the next.',
    src: `package org.firstinspires.ftc.teamcode.subsystems;

import com.qualcomm.robotcore.hardware.HardwareMap;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.ElapsedTime;

/** One ball at a time: open the gate, close it, then pause before the next ball. */
public class BallPath {
    static final double CLOSED = 0.15, OPEN = 0.55;
    public static double OPEN_TIME = 0.25;   // seconds the gate stays open
    public static double PAUSE = 0.35;       // longer pause so two balls don't go together

    private final Servo gate;
    private final ElapsedTime timer = new ElapsedTime();
    private boolean open = false;

    public BallPath(HardwareMap hw) {
        gate = hw.get(Servo.class, "hopperServo");
        gate.setPosition(CLOSED);
    }

    public void feedOne() {
        if (!open && timer.seconds() > PAUSE) {
            gate.setPosition(OPEN);
            open = true;
            timer.reset();
        }
    }

    /** Call this every loop so the gate closes on time. */
    public void update() {
        if (open && timer.seconds() > OPEN_TIME) {
            gate.setPosition(CLOSED);
            open = false;
            timer.reset();
        }
    }
}`,
  },
  'README.md': {
    lang: 'md',
    about: 'How the code is organized and the names everything uses. Start here.',
    src: `# Kilowattchaos robot code · BIOBUZZ 2026–27

Built on the FTC SDK. Everything we write is in TeamCode.

## Where things are
- opmodes/     programs you pick on the Driver Station
- subsystems/  one file per part of the robot (intake, launcher...)

## Hardware names (set these in the robot configuration)
frontLeft  frontRight  backLeft  backRight   drive motors
intake                                        intake motor
launcher                                      flywheel motor
hopperServo                                   ball gate servo

## Before you change something
1. Try it in the BioBuzz Arena or as a snippet first.
2. Test on the robot with the wheels off the floor.
3. One idea per commit, with a message anyone can read.`,
  },
};
const TREE = [['dir', 'TeamCode', 0], ['dir', 'opmodes', 1], ['file', 'opmodes/DriveTeleOp.java', 2], ['file', 'opmodes/AutoDriveForward.java', 2], ['dir', 'subsystems', 1], ['file', 'subsystems/BallPath.java', 2], ['file', 'subsystems/Intake.java', 2], ['file', 'subsystems/Launcher.java', 2], ['file', 'README.md', 1]];
const folder = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
function ourcode(view, ctx) {
  let cur = FILES[ctx.state.file] ? ctx.state.file : 'opmodes/DriveTeleOp.java';
  view.innerHTML = `<div class="zv">
    ${strip("Starter code. This page will show the team's GitHub repo once a mentor connects it. Until then, these example FTC files show how a robot program is put together. Write code in OnBot Java or Android Studio.", [tag('Starter code'), tag('No repo connected yet', 'line')])}
    <article class="card">
      <div class="repo">
        <ul class="tree" id="tree" aria-label="Files">${TREE.map(([k, p, d]) => (k === 'dir' ? `<li class="dir" style="padding-left:${8 + d * 14}px">${folder}${p}/</li>` : `<li style="padding:0;padding-left:${d * 14}px"><button type="button" data-file="${p}" aria-current="${p === cur}">${icon(p.endsWith('.md') ? 'note' : 'code', 'i')}${p.split('/').pop()}</button></li>`)).join('')}</ul>
        <div class="stack-v" style="gap:12px;min-width:0" id="fileView"></div>
      </div>
    </article>
    <article class="card c7">
      <div class="card-head"><span class="oc2">${icon('code', 'i sm')}</span><h3 class="card-title">How code will get here</h3></div>
      <ol class="bul"><li>A mentor connects the team's GitHub repo to the Hub.</li><li>You change code in OnBot Java or Android Studio.</li><li>A mentor helps you commit it with a clear message.</li><li>The new code, and who changed what, shows up on this page.</li></ol>
      <p class="cap" style="font-weight:400">Until then, the files above are examples, not the code on our robot.</p>
    </article>
    <article class="card c5">
      <div class="card-head"><span class="oc2 volt">${icon('bulb', 'i sm')}</span><h3 class="card-title">Use the starter code</h3></div>
      <p>Copy a file into OnBot Java to get going, then make it yours. Check that the hardware names in README.md match your robot configuration.</p>
      <div class="row wrap"><button class="btn soft pill" type="button" data-goto="code|Snippets">${icon('code', 'i sm')}Snippets</button><button class="btn ghost pill" type="button" data-goto="learn|Setup and FAQ">${icon('book', 'i sm')}Set up OnBot Java</button></div>
    </article>
  </div>`;
  const draw = () => {
    const f = FILES[cur];
    $('#fileView').innerHTML = `<div class="code-head"><span class="path">${cur}</span><span class="tag line">Starter code</span><span class="row" style="margin-left:auto;gap:6px"><button class="btn ghost pill sm" type="button" id="copyFile">Copy</button><button class="btn soft pill sm" type="button" data-toast="On the robot's Wi-Fi, open OnBot Java and paste this into a new file in the TeamCode folder.">${icon('arrow', 'i sm')}OnBot Java</button></span></div>
      <div class="callout" style="background:var(--raised);color:var(--text)">${icon('book')}<div><b>What this file does:</b> ${f.about}</div></div>
      ${codeBlock(f.src, f.lang || 'java')}`;
    $$('#tree [data-file]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.file === cur)));
    $('#copyFile').addEventListener('click', () => copyText(f.src, ctx.toast));
  };
  draw();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-file]');
    if (!b) return;
    cur = b.dataset.file; ctx.state.file = cur; draw();
  });
}

// ================================================================= Snippets
const SNIPS = [
  { t: 'Robot-centric mecanum drive', lvl: 'Start here', mode: 'robot', d: 'The drive code in our TeleOp. Up on the stick means "the way the robot faces".', src: `double drive = -gamepad1.left_stick_y;   // up is negative on the stick
double strafe = gamepad1.left_stick_x * 1.1;
double turn = gamepad1.right_stick_x;

// Scale down so no wheel goes past full power.
double max = Math.max(1.0, Math.abs(drive) + Math.abs(strafe) + Math.abs(turn));
frontLeft.setPower((drive + strafe + turn) / max);
backLeft.setPower((drive - strafe + turn) / max);
frontRight.setPower((drive - strafe - turn) / max);
backRight.setPower((drive + strafe - turn) / max);` },
  { t: 'Field-centric drive', lvl: 'Next step', mode: 'field', d: 'Up on the stick always means up the field, whichever way the robot faces. It uses the IMU heading.', src: `double heading = imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.RADIANS);
double y = -gamepad1.left_stick_y;   // up the field
double x = gamepad1.left_stick_x;    // across the field
double turn = gamepad1.right_stick_x;

// Turn the stick direction by the robot's heading.
double strafe = x * Math.cos(-heading) - y * Math.sin(-heading);
double drive = x * Math.sin(-heading) + y * Math.cos(-heading);

if (gamepad1.options) imu.resetYaw();   // face up the field, then press` },
  { t: 'Slow mode toggle', lvl: 'Start here', mode: 'slow', d: 'Press once for slow, press again for fast. The trick is acting on the press, not while it is held.', src: `boolean slow = false;
boolean lastBumper = false;

// inside the loop:
if (gamepad1.right_bumper && !lastBumper) slow = !slow;
lastBumper = gamepad1.right_bumper;

double scale = slow ? 0.4 : 1.0;
frontLeft.setPower(scale * (drive + strafe + turn) / max);` },
  { t: 'Telemetry you can read', lvl: 'Start here', mode: 'telemetry', d: 'Labels, units and only a few lines. Telemetry is how the robot tells you what it thinks.', src: `telemetry.addData("Heading", "%.0f°", Math.toDegrees(heading));
telemetry.addData("Wheels", "FL %.2f  FR %.2f  BL %.2f  BR %.2f", fl, fr, bl, br);
telemetry.addData("Slow mode", slow);
telemetry.update();   // nothing shows without this` },
  { t: 'Go to the nearest pollen', lvl: 'Challenge', mode: 'auto', d: 'An autonomous idea: turn toward the target, drive, slow down when close. The pose comes from odometry.', src: `double dx = target.x - pose.x, dy = target.y - pose.y;
double error = AngleUnit.normalizeRadians(Math.atan2(dy, dx) - pose.heading);

// Turn toward it, and only drive once you're facing it.
double turn = Range.clip(-error * 2.2, -1, 1);
double drive = Math.abs(error) < 0.6
        ? Range.clip(Math.hypot(dx, dy) * 1.6, 0.25, 0.85)
        : 0.1;` },
];
function snippets(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip('Small pieces of robot code you can copy into OnBot Java. "Run in Arena" shows what each one does on the practice field first.', [tag(`${SNIPS.length} snippets`)])}
    <div class="snips">${SNIPS.map((s, i) => `<article class="snip">
      <div class="row between"><h4>${s.t}</h4><span class="tag${s.lvl === 'Challenge' ? ' dark' : ''}">${s.lvl}</span></div>
      <p class="lead" style="font-size:13px;line-height:19px">${s.d}</p>
      ${codeBlock(s.src)}
      <div class="row wrap"><button class="btn primary pill sm" type="button" data-run="${i}">${icon('play', 'i sm')}Run in Arena</button><button class="btn ghost pill sm" type="button" data-copy="${i}">Copy</button></div>
    </article>`).join('')}</div>
    <article class="card">
      <div class="row wrap"><span class="oc2 volt">${icon('plus', 'i sm')}</span><div class="grow"><div style="font:500 15px/20px Inter,sans-serif">Made something useful?</div><div class="cap" style="font-weight:400">Show it to a mentor. They check each one before it shows up here.</div></div><button class="btn soft pill" type="button" data-toast="Show it to a mentor at the next meeting. They check it and add it here.">Add a snippet</button></div>
    </article>
  </div>`;
  view.addEventListener('click', (e) => {
    const r = e.target.closest('[data-run]');
    if (r) { ctx.state.arenaMode = SNIPS[+r.dataset.run].mode; ctx.go('code', 'BioBuzz Arena'); return; }
    const c = e.target.closest('[data-copy]');
    if (c) copyText(SNIPS[+c.dataset.copy].src, ctx.toast);
  });
}

// ================================================================= Challenges
// challenge (mentor): { title, brief, checks: [text], points, due: 'YYYY-MM-DD' }
// submission (student): { challenge: id, notes, link, accepted, points }. Ticks live in the person's progress record.
const ARENA_BONUS = 3, ARENA_BONUS_S = 25;
const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dueLabel = (iso) => { const [y, m, d] = String(iso || '').split('-').map(Number); if (!y) return 'No due date'; return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
const multiline = (t) => esc(t || '').replace(/\n/g, '<br>');
const safeLink = (u) => (/^https?:\/\/[^\s]+$/i.test(u || '') ? u : '');

function challenges(view, ctx) {
  const mentor = isMentor(), meId = session.user?.id;
  let chs = [], subs = [], ticks = {}, loaded = false, dead = false, sel = ctx.state.challenge || null;
  view.innerHTML = `<div class="zv">
    ${strip('A small coding challenge, sized for one meeting. Tick each check, send in your work, and a mentor accepts it for points.', [tag('Points for accepted work')], mentor ? `<button class="btn primary pill" type="button" id="newCh">${icon('plus', 'i sm')}New challenge</button>` : '')}
    ${mentor ? '<article class="card" id="chForm" hidden></article>' : ''}
    <article class="card c7 stretch" id="chNow"><div class="live-empty">Loading challenges…</div></article>
    <article class="card c5 stretch">
      <div class="card-head"><h3 class="card-title">Season points</h3><span class="tag">Team</span></div>
      <ol class="lb" id="pts"></ol>
      <p class="cap" style="font-weight:400">Each accepted challenge earns its points. The Arena bonus adds ${ARENA_BONUS} more.</p>
    </article>
    ${mentor ? `<article class="card" id="reviewCard">
      <div class="card-head"><span class="oc2 volt">${icon('check', 'i sm')}</span><h3 class="card-title">Submissions to review</h3><span class="tag" id="revN"></span></div>
      <div class="items" id="review"></div>
    </article>` : ''}
    <article class="card c6">
      <div class="card-head"><span class="oc2">${icon('gamepad', 'i sm')}</span><h3 class="card-title">Arena bonus</h3><span class="tag">Any time · ${ARENA_BONUS} points</span></div>
      <p>Collect all 10 pollen in under ${ARENA_BONUS_S} seconds using <b>field-centric</b> drive. It feels strange at first, then much easier.</p>
      <div id="bonusMe" class="cap" style="font-weight:400;margin-bottom:10px"></div>
      <button class="btn soft pill" type="button" id="arenaBonus">${icon('play', 'i sm')}Try it in the Arena</button>
    </article>
    <article class="card c6">
      <div class="card-head"><h3 class="card-title">Past challenges</h3></div>
      <div class="items" id="past"></div>
    </article>
  </div>`;

  const today = () => isoDay();
  const open = () => chs.filter((c) => !c.data?.due || c.data.due >= today()).sort((a, b) => String(a.data.due || '9').localeCompare(String(b.data.due || '9')));
  const past = () => chs.filter((c) => c.data?.due && c.data.due < today()).sort((a, b) => b.data.due.localeCompare(a.data.due));
  const subsFor = (cid) => subs.filter((s) => s.data?.challenge === cid);
  const accepted = (cid) => subsFor(cid).filter((s) => s.data?.accepted);
  const mySub = (cid) => subs.find((s) => s.data?.challenge === cid && s.user_id === meId) || null;
  const chById = (id) => chs.find((c) => c.id === id);
  const bonusHas = (r) => { const v = r?.data?.fieldBest; return typeof v === 'number' && v < ARENA_BONUS_S; };

  const drawNow = () => {
    const el = $('#chNow', view);
    const list = open();
    if (!list.length) {
      el.innerHTML = `<div class="card-head"><span class="oc2 volt">${icon('trophy', 'i sm')}</span><h3 class="card-title">This week</h3></div>
        <div class="live-empty">${mentor ? 'No open challenge yet. Make one with "New challenge" and the team sees it right away.' : 'No challenge right now. A mentor posts the next one soon. Try the Arena bonus or a snippet meanwhile.'}</div>`;
      return;
    }
    if (!list.some((c) => c.id === sel)) sel = list[0].id;
    const c = list.find((x) => x.id === sel), d = c.data || {};
    const checks = Array.isArray(d.checks) ? d.checks : [];
    const t = new Set(ticks[c.id] || []);
    const sub = mySub(c.id), acc = accepted(c.id);
    const allTicked = checks.every((_, i) => t.has(i));
    el.innerHTML = `${list.length > 1 ? `<div class="chips lv-chips" role="tablist" aria-label="Open challenges">${list.map((x) => `<button class="chip" type="button" data-sel="${esc(x.id)}" aria-pressed="${x.id === c.id}">${esc(x.data.title || 'Challenge')}</button>`).join('')}</div>` : ''}
      <div class="card-head lv-wrap"><span class="oc2 volt">${icon('trophy', 'i sm')}</span><h3 class="card-title">${esc(d.title || 'Challenge')}</h3><span class="tag">Due ${dueLabel(d.due)}</span></div>
      ${d.brief ? `<p>${multiline(d.brief)}</p>` : ''}
      <div class="row wrap"><span class="st">${Number(d.points) || 0} points</span><span class="st">${acc.length ? avStack(acc.map((s) => s.author).slice(0, 5), 20) : ''}${acc.length} finished</span>${mentor ? `<span class="row" style="margin-left:auto;gap:6px"><button class="btn ghost pill sm" type="button" data-edit="${esc(c.id)}">Edit</button><button class="btn ghost pill sm" type="button" data-del="${esc(c.id)}">Delete</button></span>` : ''}</div>
      ${checks.length ? `<h4 class="sub">Check your work</h4>
      <div class="pack" id="checks">${checks.map((x, i) => `<button class="tick" type="button" role="checkbox" data-tick="${i}" aria-checked="${t.has(i)}"${sub ? ' disabled' : ''}><span class="bx">${icon('check')}</span><span>${esc(x)}</span></button>`).join('')}</div>` : ''}
      <div id="subBox">${sub ? subStatus(sub, d) : mentor ? '<p class="cap" style="font-weight:400">Students tick the checks and send their work here. You review it below.</p>' : `
        <div class="form-grid lv-form">
          <label class="field full"><span>What did you do? (optional)</span><textarea class="inp" id="subNotes" maxlength="1000" placeholder="I used a lastA variable so holding A doesn't flicker."></textarea></label>
          <label class="field full"><span>Link (optional)</span><input class="inp" id="subLink" type="url" maxlength="300" placeholder="https://… (a GitHub file or a video of the robot)"><small>No photos of faces, and nothing with your real name.</small></label>
        </div>
        <div class="card-foot" style="flex-wrap:wrap"><button class="btn ghost pill" type="button" data-goto="code|Snippets">${icon('bulb', 'i sm')}Need a hint? See Snippets</button><button class="btn primary pill" type="button" id="submitCh"${allTicked ? '' : ' disabled'}>${allTicked ? 'Submit for review' : `${t.size} of ${checks.length} checked`}</button></div>`}</div>`;
  };
  const subStatus = (sub, d) => `<div class="verdict${sub.data.accepted ? ' good' : ''}">${icon(sub.data.accepted ? 'check' : 'clock')}<div><b>${sub.data.accepted ? `Accepted. +${Number(sub.data.points ?? d.points) || 0} points` : 'Submitted. A mentor reviews it soon.'}</b>${sub.data.notes ? `<br>${esc(sub.data.notes)}` : ''}${safeLink(sub.data.link) ? ` <a href="${esc(safeLink(sub.data.link))}" target="_blank" rel="noopener noreferrer">Your link</a>` : ''}</div></div>
    ${sub.data.accepted ? '' : `<div class="card-foot"><span class="cap">Want to change it?</span><button class="btn ghost pill sm" type="button" data-unsub="${esc(sub.id)}">Take it back</button></div>`}`;

  const drawPoints = (arena) => {
    const tally = new Map();
    const add = (uid, name, n) => { const r = tally.get(uid) || { name, n: 0 }; r.n += n; tally.set(uid, r); };
    for (const s of subs) if (s.data?.accepted && chById(s.data.challenge)) add(s.user_id, s.author, Number(s.data.points ?? chById(s.data.challenge)?.data?.points) || 0);
    for (const r of arena || []) if (bonusHas(r)) add(r.user_id, r.author, ARENA_BONUS);
    const rows = [...tally.entries()].filter(([, r]) => r.n > 0).sort((a, b) => b[1].n - a[1].n);
    $('#pts', view).innerHTML = rows.length ? rows.map(([uid, r], i) => `<li class="${uid === meId ? 'me' : ''}"><span class="r">${i + 1}</span>${av(r.name, 28)}<span>${esc(r.name)}${uid === meId ? ' (you)' : ''}</span><span class="sc">${r.n}</span></li>`).join('')
      : '<li class="lv-lbempty">No points yet. The first accepted challenge puts someone on the board.</li>';
    const mine = (arena || []).find((r) => r.user_id === meId);
    const fb = mine?.data?.fieldBest;
    $('#bonusMe', view).textContent = bonusHas(mine) ? `You have it: ${fb.toFixed(1)} s field-centric. +${ARENA_BONUS} points.` : typeof fb === 'number' ? `Your best field-centric time: ${fb.toFixed(1)} s. Get under ${ARENA_BONUS_S}!` : 'You have not tried it in field-centric yet.';
  };
  const drawPast = () => {
    const list = past();
    $('#past', view).innerHTML = list.length ? list.map((c) => {
      const acc = accepted(c.id), mine = mySub(c.id);
      return `<div class="it"><span class="oc2${mine?.data?.accepted ? ' solid' : ''}">${icon('flag', 'i sm')}</span><div class="grow"><div class="t">${esc(c.data.title || 'Challenge')}</div><div class="meta cap" style="font-weight:400">Due ${dueLabel(c.data.due)} · ${Number(c.data.points) || 0} points · ${acc.length} finished${mine ? (mine.data.accepted ? ' · you finished it' : ' · yours is waiting') : ''}</div></div><span class="end">${acc.length ? avStack(acc.map((s) => s.author).slice(0, 4), 22) : ''}${mentor ? `<button class="btn ghost pill sm" type="button" data-del="${esc(c.id)}">Delete</button>` : ''}</span></div>`;
    }).join('') : '<div class="live-empty">Finished challenges show up here after their due date.</div>';
  };
  const drawReview = () => {
    if (!mentor) return;
    const list = [...subs].sort((a, b) => Number(!!a.data?.accepted) - Number(!!b.data?.accepted));
    const waiting = subs.filter((s) => !s.data?.accepted).length;
    $('#revN', view).textContent = `${waiting} waiting`;
    $('#review', view).innerHTML = list.length ? list.map((s) => {
      const c = chById(s.data?.challenge), link = safeLink(s.data?.link);
      return `<div class="it lv-sug">${av(s.author, 28)}<div class="grow"><div class="t">${esc(s.author)} · ${esc(c?.data?.title || 'A deleted challenge')}</div>${s.data?.notes ? `<div class="meta cap" style="font-weight:400">${esc(s.data.notes)}</div>` : ''}${link ? `<div class="meta cap"><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(link.length > 60 ? `${link.slice(0, 57)}…` : link)}</a></div>` : ''}</div>
        <span class="end lv-wrap">${s.data?.accepted ? `<span class="st volt">${icon('check', 'i sm')}+${Number(s.data.points) || 0}</span><button class="btn ghost pill sm" type="button" data-acc="${esc(s.id)}">Undo</button>` : `<button class="btn primary pill sm" type="button" data-acc="${esc(s.id)}">Accept${c ? ` · ${Number(c.data.points) || 0}` : ''}</button>`}</span></div>`;
    }).join('') : '<div class="live-empty">Nothing to review yet. Submissions show up here as soon as someone sends one.</div>';
  };
  let arenaCache = [];
  const drawAll = () => { drawNow(); drawPoints(arenaCache); drawPast(); drawReview(); };

  Promise.all([api.list('challenge'), api.list('submission'), myProgress(), loadArena().catch(() => [])]).then(([c, s, prog, ar]) => {
    if (dead) return;
    chs = c; subs = s; ticks = { ...(prog?.data?.ticks || {}) }; arenaCache = ar || []; loaded = true;
    drawAll();
  }).catch((err) => { if (!dead) { $('#chNow', view).innerHTML = `<div class="live-empty">Could not load challenges. ${esc(err.message)}</div>`; ctx.toast(err.message); } });

  // ---- Mentor: new or edit challenge
  const form = (rec) => {
    const f = $('#chForm', view);
    if (!f) return;
    const d = rec?.data || {};
    const due = d.due || isoDay(new Date(Date.now() + 6 * 864e5));
    f.hidden = false;
    f.innerHTML = `<div class="card-head"><h3 class="card-title">${rec ? 'Edit challenge' : 'New challenge'}</h3><button class="icon-btn sm" type="button" id="chX" aria-label="Close" style="margin-left:auto">${icon('x')}</button></div>
      <div class="form-grid">
        <label class="field full"><span>Title</span><input class="inp" id="chT" maxlength="80" placeholder="Toggle the intake" value="${esc(d.title || '')}"></label>
        <label class="field full"><span>The brief</span><textarea class="inp" id="chB" maxlength="1200" placeholder="Right now the intake only runs while you hold the trigger. Make A a toggle.">${esc(d.brief || '')}</textarea></label>
        <label class="field full"><span>Checks, one per line</span><textarea class="inp" id="chC" maxlength="1500" placeholder="Press A once to start, again to stop&#10;Telemetry shows Intake: on or off">${esc((d.checks || []).join('\n'))}</textarea></label>
        <label class="field"><span>Points</span><input class="inp" id="chP" type="number" min="0" max="50" value="${Number(d.points ?? 5)}"></label>
        <label class="field"><span>Due</span><input class="inp" id="chD" type="date" value="${esc(due)}"></label>
      </div>
      <div class="card-foot"><span class="cap">The whole team sees it right away.</span><button class="btn primary pill" type="button" id="chSave">${rec ? 'Save changes' : 'Post challenge'}</button></div>`;
    $('#chX', f).addEventListener('click', () => { f.hidden = true; });
    $('#chT', f).focus();
    f.scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
    $('#chSave', f).addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const data = {
        title: $('#chT', f).value.trim(), brief: $('#chB', f).value.trim(),
        checks: $('#chC', f).value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12),
        points: clamp(Math.round(Number($('#chP', f).value) || 0), 0, 50), due: $('#chD', f).value,
      };
      if (!data.title) { ctx.toast('Give the challenge a title.'); $('#chT', f).focus(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.due)) { ctx.toast('Pick a due date.'); $('#chD', f).focus(); return; }
      btn.disabled = true;
      try {
        if (rec) { const r = await api.update('challenge', rec.id, data); rec.data = r.data; }
        else { const r = await api.create('challenge', data); chs.unshift({ ...r, author: me() }); sel = r.id; }
        f.hidden = true; drawAll();
        ctx.toast(rec ? 'Challenge saved.' : 'Challenge posted.');
      } catch (err) { ctx.toast(err.message); btn.disabled = false; }
    });
  };
  const nb = $('#newCh', view);
  if (nb) nb.addEventListener('click', () => form(null));

  view.addEventListener('click', async (e) => {
    if (!loaded) return;
    const s = e.target.closest('[data-sel]');
    if (s) { sel = s.dataset.sel; ctx.state.challenge = sel; drawNow(); return; }
    const t = e.target.closest('[data-tick]');
    if (t && !t.disabled) {
      const i = +t.dataset.tick, cur = new Set(ticks[sel] || []);
      if (cur.has(i)) cur.delete(i); else cur.add(i);
      const prev = ticks;
      ticks = { ...ticks, [sel]: [...cur].sort((a, b) => a - b) };
      const notes = $('#subNotes', view)?.value, link = $('#subLink', view)?.value;
      drawNow();
      if (notes != null && $('#subNotes', view)) { $('#subNotes', view).value = notes; $('#subLink', view).value = link; }
      $(`[data-tick="${i}"]`, view)?.focus({ preventScroll: true });
      try { await saveProgress({ ticks }); } catch (err) { ticks = prev; drawNow(); ctx.toast(err.message); }
      return;
    }
    if (e.target.closest('#submitCh')) {
      const btn = e.target.closest('#submitCh');
      const c = chById(sel); if (!c || mySub(c.id)) return;
      const link = $('#subLink', view).value.trim();
      if (link && !safeLink(link)) { ctx.toast('Links need to start with https://'); $('#subLink', view).focus(); return; }
      btn.disabled = true;
      try {
        const r = await api.create('submission', { challenge: c.id, notes: $('#subNotes', view).value.trim(), link, accepted: false });
        subs.unshift({ ...r, author: me() });
        drawAll();
        ctx.toast('Submitted. A mentor reviews it soon.');
      } catch (err) { ctx.toast(err.message); btn.disabled = false; }
      return;
    }
    const un = e.target.closest('[data-unsub]');
    if (un) {
      try { await api.remove('submission', un.dataset.unsub); subs = subs.filter((x) => x.id !== un.dataset.unsub); drawAll(); ctx.toast('Taken back. You can change it and send it again.'); }
      catch (err) { ctx.toast(err.message); }
      return;
    }
    const a = e.target.closest('[data-acc]');
    if (a && mentor) {
      const sub = subs.find((x) => x.id === a.dataset.acc); if (!sub) return;
      const on = !sub.data.accepted, pts = Number(chById(sub.data.challenge)?.data?.points) || 0;
      a.disabled = true;
      try { const r = await api.update('submission', sub.id, { accepted: on, points: on ? pts : 0 }); sub.data = r.data; drawAll(); ctx.toast(on ? `Accepted. ${sub.author} gets ${pts} points.` : 'Accept undone.'); }
      catch (err) { ctx.toast(err.message); a.disabled = false; }
      return;
    }
    const ed = e.target.closest('[data-edit]');
    if (ed && mentor) { form(chById(ed.dataset.edit)); return; }
    const del = e.target.closest('[data-del]');
    if (del && mentor) {
      const c = chById(del.dataset.del); if (!c) return;
      if (!confirm(`Delete "${c.data.title}"? Its submissions stay, but they will not count for points.`)) return;
      try { await api.remove('challenge', c.id); chs = chs.filter((x) => x.id !== c.id); drawAll(); ctx.toast('Challenge deleted.'); }
      catch (err) { ctx.toast(err.message); }
    }
  });
  $('#arenaBonus', view).addEventListener('click', () => { ctx.state.arenaMode = 'field'; ctx.go('code', 'BioBuzz Arena'); });
  return () => { dead = true; };
}

export const CODE = { 'BioBuzz Arena': arena, 'Our code': ourcode, Snippets: snippets, Challenges: challenges };
