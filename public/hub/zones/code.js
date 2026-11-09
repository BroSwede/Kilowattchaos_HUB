// Code zone: BioBuzz Arena (a drivable practice field), Our code, Snippets, Challenges.
// The Arena is a practice drill on a plain 12 ft field, not the real BIOBUZZ field. Code and commits are samples.
import { $, $$, esc, clamp, icon, tag, SAMPLE, strip, av, avStack, sw, seg, wireSeg, copyText, codeBlock } from './common.js';

// ================================================================= BioBuzz Arena
const FIELD = 3.6576, TILE = FIELD / 6, H = 0.226, BALL = 0.045;
const VMAX = 1.7, STRAFE = 0.85, WMAX = 4.4;
const START = { x: TILE / 2, y: TILE / 2, th: Math.PI / 2 };
const POLLEN = [[1.2, 0.9], [2.1, 0.5], [3.1, 1.0], [0.7, 1.9], [1.8, 1.8], [2.9, 2.2], [0.5, 3.0], [1.5, 2.8], [2.4, 3.0], [3.2, 3.0]];
const BOARD = [['Byte', 18.6], ['Pixel', 21.2], ['Gizmo', 24.9], ['Nova', 27.5], ['Rivet', 29.8]];
const SNIP_NOTE = {
  field: ['Field-centric drive', 'Push up on the stick and the robot goes up the field, whichever way it faces.'],
  slow: ['Slow mode toggle', 'Slow mode is on. Press Space or RB once to switch it; holding it down does nothing extra.'],
  telemetry: ['Telemetry you can read', 'Watch the wheel powers in the Telemetry card change as you drive.'],
  auto: ['Go to the nearest pollen', 'The robot turns toward the closest ball, drives to it, and repeats.'],
  robot: ['Robot-centric mecanum drive', 'Up on the stick always means "the way the robot is facing".'],
};
let optIn = false;
const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR']);
const turnSvg = (cw) => `<svg class="i lg" viewBox="0 0 24 24" aria-hidden="true"${cw ? ' style="transform:scaleX(-1)"' : ''}><path d="M9 4H4v5"/><path d="M4.6 9A8 8 0 1 1 4 13"/></svg>`;

function arena(view, ctx) {
  const mode0 = ctx.state.arenaMode || '';
  ctx.state.arenaMode = '';
  let fieldCentric = mode0 === 'field';
  let slow = mode0 === 'slow';
  const best = () => { const v = parseFloat(ctx.local.get('kwc-arena-best')); return Number.isFinite(v) ? v : null; };
  const note = SNIP_NOTE[mode0];
  view.innerHTML = `<div class="zv">
    ${strip('Drive a twin of the StarterBot with a keyboard, a gamepad or touch, and practice before you touch the real robot. This is a practice drill on a plain 12 ft field, not the real BIOBUZZ field.', [tag('Arena v0 · opens Dec 1'), tag('Practice drill, not the real field', 'line')])}
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
          <div class="row between"><span class="cap">Show my best time</span>${sw('optIn', optIn, 'Show my best time on the team board')}</div>
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
    const b = best();
    const rows = BOARD.map(([n, t]) => [n, t, false]);
    if (optIn && b !== null) rows.push(['Sparky', b, true]);
    rows.sort((a, c) => a[1] - c[1]);
    $('#lb').innerHTML = rows.map(([n, t, me], i) => `<li class="${me ? 'me' : ''}"><span class="r">${i + 1}</span>${av(n, 28)}<span>${n}${me ? ' (you)' : ''}</span><span class="sc">${t.toFixed(1)} s</span></li>`).join('');
    $('#lbNote').textContent = optIn ? (b === null ? 'Finish the drill once and your time shows up here.' : 'Your best time shows with your display name only.')
      : b === null ? 'Only teammates who switch this on show up. Times are samples.' : `Your best: ${b.toFixed(1)} s. Only you can see it until you switch this on.`;
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
    const isBest = b === null || t < b;
    if (isBest) ctx.local.set('kwc-arena-best', t.toFixed(2));
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
  $('#optIn').addEventListener('click', (e) => { optIn = !optIn; e.currentTarget.setAttribute('aria-checked', String(optIn)); board(); });
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
  if (mode0 === 'auto') begin(true);
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    removeEventListener('gamepadconnected', onPad);
    removeEventListener('gamepaddisconnected', onPad);
  };
}

// ================================================================= Our code (sample until the team repo is connected)
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
    // Mecanum wheels strafe a little slower than they drive. 1.1 came from our strafe test.
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
    about: 'The first autonomous: drive forward 24 inches using the wheel encoders, then stop. Byte is tuning it.',
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

/** The intake. Pixel and Nova own the hardware; this file just spins it. */
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
    public static double PAUSE = 0.35;       // Gizmo: longer pause so two balls don't go together

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
const COMMITS = [
  ['Gizmo', 'Launcher: wait until at speed before feeding', 'Nov 5', '9b41e07', 'opmodes/DriveTeleOp.java', 3, 1, true],
  ['Gizmo', 'BallPath: longer pause between balls (0.25 to 0.35 s)', 'Nov 5', '3f9c2a1', 'subsystems/BallPath.java', 2, 2, false],
  ['Byte', 'Auto: drive forward 24 inches with the encoders', 'Nov 3', 'c07d5e4', 'opmodes/AutoDriveForward.java', 46, 0, false],
  ['Sparky', 'Launcher: hold speed with setVelocity', 'Oct 29', '51aa9f0', 'subsystems/Launcher.java', 12, 6, false],
  ['Pixel', 'Intake: spit balls out with the left trigger', 'Oct 29', 'e2b8c13', 'opmodes/DriveTeleOp.java', 1, 1, false],
  ['Byte', 'Drive: strafe fix of 1.1 after the strafe test', 'Oct 20', '7d3f0b8', 'opmodes/DriveTeleOp.java', 2, 1, false],
  ['Nova', 'Intake: add a stop() method', 'Oct 20', 'a4c61d2', 'subsystems/Intake.java', 2, 0, false],
  ['Coach', 'Start from the FTC SDK and add the README', 'Oct 13', '0f1e2d3', 'README.md', 21, 0, false],
];
const TREE = [['dir', 'TeamCode', 0], ['dir', 'opmodes', 1], ['file', 'opmodes/DriveTeleOp.java', 2], ['file', 'opmodes/AutoDriveForward.java', 2], ['dir', 'subsystems', 1], ['file', 'subsystems/BallPath.java', 2], ['file', 'subsystems/Intake.java', 2], ['file', 'subsystems/Launcher.java', 2], ['file', 'README.md', 1]];
const folder = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
function ourcode(view, ctx) {
  let cur = FILES[ctx.state.file] ? ctx.state.file : 'opmodes/DriveTeleOp.java';
  view.innerHTML = `<div class="zv">
    ${strip("The robot's code, read-only here and copied from the team's code repository after every change. Write code in OnBot Java or Android Studio; read it, and see who changed what, here.", [tag('Phase 4 · Jan 25–Feb 12'), tag('Sample until the team repo is connected')])}
    <article class="card">
      <div class="repo">
        <ul class="tree" id="tree" aria-label="Files">${TREE.map(([k, p, d]) => (k === 'dir' ? `<li class="dir" style="padding-left:${8 + d * 14}px">${folder}${p}/</li>` : `<li style="padding:0;padding-left:${d * 14}px"><button type="button" data-file="${p}" aria-current="${p === cur}">${icon(p.endsWith('.md') ? 'note' : 'code', 'i')}${p.split('/').pop()}</button></li>`)).join('')}</ul>
        <div class="stack-v" style="gap:12px;min-width:0" id="fileView"></div>
      </div>
    </article>
    <article class="card c7">
      <div class="card-head"><h3 class="card-title">Recent changes</h3>${SAMPLE}</div>
      <div class="commits" id="commits">${COMMITS.map(([who, m, d, h, f, add, del, ai]) => `<div class="commit">${av(who, 32)}<div style="min-width:0"><div class="m">${esc(m)}${ai ? ' <span class="tag line" style="margin-left:4px">AI-assisted</span>' : ''}</div><div class="h">${who} · ${d} · ${h} · <button class="btn ghost pill sm" type="button" data-file="${f}" style="height:26px;padding:0 9px;font:500 12px/16px Inter,sans-serif">${f.split('/').pop()}</button></div></div><span class="cap num" style="white-space:nowrap"><span style="color:var(--ok)">+${add}</span> <span style="color:var(--negative)">−${del}</span></span></div>`).join('')}</div>
    </article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">Who changed this file</h3></div>
      <div id="who"></div>
      <hr class="hr">
      <h4 class="sub">How code gets here</h4>
      <ol class="bul"><li>You change code in OnBot Java or Android Studio.</li><li>A mentor helps you commit it to the team repository with a clear message.</li><li>The Hub's GitHub app hears about the change and shows it here within a minute.</li></ol>
    </article>
  </div>`;
  const draw = () => {
    const f = FILES[cur];
    const last = COMMITS.find((c) => c[4] === cur);
    $('#fileView').innerHTML = `<div class="code-head"><span class="path">${cur}</span>${last ? `<span class="cap row" style="gap:6px">${av(last[0], 18)}${last[0]} · ${last[2]}</span>` : ''}<span class="row" style="margin-left:auto;gap:6px"><button class="btn ghost pill sm" type="button" id="copyFile">Copy</button><button class="btn soft pill sm" type="button" data-toast="On the robot's Wi-Fi, OnBot Java has this same file in its TeamCode folder.">${icon('arrow', 'i sm')}OnBot Java</button></span></div>
      <div class="callout" style="background:var(--raised);color:var(--text)">${icon('book')}<div><b>What this file does:</b> ${f.about}</div></div>
      ${codeBlock(f.src, f.lang || 'java')}`;
    const by = {};
    COMMITS.filter((c) => c[4] === cur).forEach((c) => { by[c[0]] = (by[c[0]] || 0) + 1; });
    const names = Object.keys(by);
    $('#who').innerHTML = `<div class="items">${names.map((n) => `<div class="it">${av(n, 28)}<div class="grow"><div class="t">${n}</div><div class="meta cap">${by[n]} change${by[n] === 1 ? '' : 's'}</div></div></div>`).join('')}</div>${last ? `<p class="cap" style="font-weight:400">Last change: "${esc(last[1])}"</p>` : ''}`;
    $$('#tree [data-file]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.file === cur)));
    $('#copyFile').addEventListener('click', () => copyText(f.src, ctx.toast));
  };
  draw();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-file]');
    if (!b) return;
    cur = b.dataset.file; ctx.state.file = cur; draw();
    if (b.closest('#commits')) $('#fileView').scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
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
    ${strip('Small pieces of robot code you can copy into OnBot Java. "Run in Arena" shows what each one does on the practice field first.', [tag('Phase 4 · Jan 25–Feb 12'), tag(`${SNIPS.length} snippets`)])}
    <div class="snips">${SNIPS.map((s, i) => `<article class="snip">
      <div class="row between"><h4>${s.t}</h4><span class="tag${s.lvl === 'Challenge' ? ' dark' : ''}">${s.lvl}</span></div>
      <p class="lead" style="font-size:13px;line-height:19px">${s.d}</p>
      ${codeBlock(s.src)}
      <div class="row wrap"><button class="btn primary pill sm" type="button" data-run="${i}">${icon('play', 'i sm')}Run in Arena</button><button class="btn ghost pill sm" type="button" data-copy="${i}">Copy</button></div>
    </article>`).join('')}</div>
    <article class="card">
      <div class="row wrap"><span class="oc2 volt">${icon('plus', 'i sm')}</span><div class="grow"><div style="font:500 15px/20px Inter,sans-serif">Made something useful?</div><div class="cap" style="font-weight:400">Students add snippets in Student Dev Mode. A mentor checks each one before it shows up here.</div></div><button class="btn soft pill" type="button" data-toast="Student Dev Mode opens in Phase 7. New snippets go to a mentor first.">Add a snippet</button></div>
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
const CHECKS = ['Press A once to start the intake, and again to stop it', 'Holding A down does not make it flicker (use a lastA variable)', 'Telemetry shows "Intake: on" or "Intake: off"', 'The intake stops when the OpMode ends', 'You tested it on the robot or a spare motor'];
const POINTS = [['Byte', 34], ['Pixel', 22], ['Sparky', 19], ['Gizmo', 15], ['Nova', 12], ['Rivet', 7]];
const PAST = [
  ['Make the robot say hello', 'Oct 19–25', 6, 'Byte', '"telemetry.update() or nothing shows"'],
  ['Drive a motor with a stick', 'Oct 26–Nov 1', 5, 'Pixel', 'Up on the stick is negative'],
  ['Write the drive-forward auto', 'Nov 2–8', 4, 'Byte', 'Ticks per inch, from the wheel size'],
];
const ticked = new Set();
let submitted = false;
function challenges(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip('A small coding challenge every week, sized for one meeting. Finishing earns points; helping someone else finish earns more.', [tag('Phase 4 · Jan 25–Feb 12'), SAMPLE])}
    <article class="card c7 stretch">
      <div class="card-head"><span class="oc2 volt">${icon('trophy', 'i sm')}</span><h3 class="card-title">This week: toggle the intake</h3><span class="tag">Nov 9–15</span></div>
      <p>Right now the intake only runs while you hold the trigger. Make <b>A</b> a toggle: press once to start, press again to stop.</p>
      <div class="row wrap"><span class="st">${icon('clock', 'i sm')}About 30 minutes</span><span class="st">5 points</span><span class="st">${avStack(['Byte', 'Pixel', 'Gizmo'], 20)}3 finished</span></div>
      <h4 class="sub">Check your work</h4>
      <div class="pack" id="checks">${CHECKS.map((c, i) => `<button class="tick" type="button" role="checkbox" data-tick="${i}" aria-checked="${ticked.has(i)}"><span class="bx">${icon('check')}</span><span>${c}</span></button>`).join('')}</div>
      <div class="card-foot" style="flex-wrap:wrap"><button class="btn ghost pill" type="button" data-goto="code|Snippets">${icon('bulb', 'i sm')}Hint: see the slow mode snippet</button><button class="btn primary pill" type="button" id="submitCh"></button></div>
    </article>
    <article class="card c5 stretch">
      <div class="card-head"><h3 class="card-title">Season points</h3><span class="tag">Opt-in</span></div>
      <ol class="lb">${POINTS.map(([n, p], i) => `<li class="${n === 'Sparky' ? 'me' : ''}"><span class="r">${i + 1}</span>${av(n, 28)}<span>${n}${n === 'Sparky' ? ' (you)' : ''}</span><span class="sc">${p}</span></li>`).join('')}</ol>
      <p class="cap" style="font-weight:400">5 points for finishing, 3 more for the clearest code (the team votes), and 2 for helping a teammate finish. Echo has the board switched off, which is fine.</p>
    </article>
    <article class="card c6">
      <div class="card-head"><span class="oc2">${icon('gamepad', 'i sm')}</span><h3 class="card-title">Arena bonus</h3><span class="tag">Any time</span></div>
      <p>Collect all 10 pollen in under 25 seconds using <b>field-centric</b> drive. It feels strange at first, then much easier.</p>
      <button class="btn soft pill" type="button" id="arenaBonus">${icon('play', 'i sm')}Try it in the Arena</button>
    </article>
    <article class="card c6">
      <div class="card-head"><h3 class="card-title">Past challenges</h3></div>
      <div class="items">${PAST.map(([t, d, n, w, l]) => `<div class="it"><span class="oc2">${icon('flag', 'i sm')}</span><div class="grow"><div class="t">${t}</div><div class="meta cap" style="font-weight:400">${d} · ${n} of 7 finished · learned: ${l}</div></div><span class="end">${av(w, 24)}</span></div>`).join('')}</div>
    </article>
  </div>`;
  const btn = () => {
    const all = ticked.size === CHECKS.length, b = $('#submitCh');
    b.disabled = !all && !submitted;
    b.innerHTML = submitted ? `${icon('check', 'i sm')}Submitted` : all ? 'Submit for review' : `${ticked.size} of ${CHECKS.length} checked`;
  };
  btn();
  $('#checks').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tick]');
    if (!t) return;
    const i = +t.dataset.tick;
    if (ticked.has(i)) ticked.delete(i); else ticked.add(i);
    t.setAttribute('aria-checked', String(ticked.has(i)));
    btn();
  });
  $('#submitCh').addEventListener('click', () => {
    if (submitted || ticked.size < CHECKS.length) return;
    submitted = true; btn();
    ctx.toast('Submitted. Byte or a mentor reviews it at the next meeting.');
  });
  $('#arenaBonus').addEventListener('click', () => { ctx.state.arenaMode = 'field'; ctx.go('code', 'BioBuzz Arena'); });
}

export const CODE = { 'BioBuzz Arena': arena, 'Our code': ourcode, Snippets: snippets, Challenges: challenges };
