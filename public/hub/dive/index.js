// "How it's made" deep dives: click a part on the robot, open it up, and learn how it works,
// how it was manufactured and what it does for the rest of the robot.
// This file is the pop-up shell (chapters, sliders, knobs, readouts). Each topic models its own 3D.
import { createStage, THREE, clamp } from './kit.js';

const TOPICS = {
  battery: { load: () => import('./battery.js'), name: 'Battery', sys: 'power', blurb: 'Cells, volts, amps and watts' },
  motor: { load: () => import('./motor.js'), name: 'Motor', sys: 'drivetrain', blurb: 'Magnets, coils and planetary gears' },
  frame: { load: () => import('./frame.js'), name: 'Frame', sys: 'structure', blurb: 'From rock to a drilled channel' },
};
export const DIVES = Object.entries(TOPICS).map(([key, t]) => ({ key, name: t.name, sys: t.sys, blurb: t.blurb }));

// Which deep dive, if any, explains this part of the robot.
export function topicFor(info) {
  if (!info || !info.name) return null;
  if (info.name === '12V Battery') return 'battery';
  if (/Motor$/.test(info.name)) return 'motor';
  if (/U-Channel$/.test(info.name)) return 'frame';
  return null;
}
// A part on the robot to jump to when a dive is opened from the shortcut buttons.
export const PART_FOR = { battery: '12V Battery', motor: 'Drive Motor', frame: '15-Hole U-Channel' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

// Turn the real CAD part (cloned from the robot viewer) so its long side lies along X, centre it,
// and scale it to `length`. With `shaft`, the thin shaft end is pointed toward +X.
export function fitReal(obj, length, { shaft = false } = {}) {
  if (!obj) return null;
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const ax = [['x', size.x], ['y', size.y], ['z', size.z]].sort((p, q) => q[1] - p[1]).map((p) => p[0]);
  const unit = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  // Rows of the rotation: long side to X, short side to Y, the one left over to Z.
  const rot = new THREE.Matrix4().makeBasis(unit[ax[0]], unit[ax[2]], unit[ax[1]]).transpose();
  if (rot.determinant() < 0) rot.premultiply(new THREE.Matrix4().makeScale(1, 1, -1));
  const inner = new THREE.Group();
  obj.position.sub(c);
  inner.add(obj);
  inner.applyMatrix4(rot);
  const out = new THREE.Group();
  out.add(inner);
  const k = length / Math.max(size[ax[0]], 1e-6);
  out.scale.setScalar(k);
  if (shaft) {
    out.updateMatrixWorld(true);
    const far = [0, 0], v = new THREE.Vector3(), half = length / 2;
    out.traverse((o) => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const end = v.x > half * 0.86 ? 1 : v.x < -half * 0.86 ? 0 : -1;
        if (end >= 0) far[end] = Math.max(far[end], Math.hypot(v.y, v.z));
      }
    });
    if (far[0] < far[1]) inner.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
  }
  return out;
}

let open = null;
export function closeDive() { if (open) open.close(); }
export const isDiveOpen = () => !!open;

/**
 * Open a deep dive.
 * @param {string} key      'battery' | 'motor' | 'frame'
 * @param {object} [opts]   { part: {name, sku, sys}, real: () => Object3D|null, startAt: chapter id }
 */
export async function openDive(key, opts = {}) {
  const T = TOPICS[key];
  if (!T) return;
  closeDive();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const back = document.createElement('div');
  back.className = 'dd-back';
  const el = document.createElement('section');
  el.className = 'dd';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `How it's made: ${T.name}`);
  el.innerHTML = `
    <div class="dd-stage" id="ddStage">
      <canvas id="ddCanvas" tabindex="0" aria-label="3D model for this chapter. Drag to turn it, scroll or pinch to zoom."></canvas>
      <div class="dd-labels" id="ddLabels" aria-hidden="true"></div>
      <div class="dd-hud" id="ddHud" aria-live="off"></div>
      <div class="dd-hint glass">${ICON('reset', 'i sm')}Drag to turn · scroll to zoom</div>
      <div class="dd-loading" id="ddLoading">Building the model</div>
    </div>
    <div class="dd-side">
      <header class="dd-head">
        <div>
          <div class="eyebrow"><span class="dd-dot" style="--c:var(--sys-${T.sys})"></span>How it's made and how it works</div>
          <h2 id="ddTitle">${esc(T.name)}</h2>
        </div>
        <button class="icon-btn sm" type="button" id="ddClose" aria-label="Close">${ICON('x')}</button>
      </header>
      <nav class="dd-tabs" id="ddTabs" role="tablist" aria-label="Chapters"></nav>
      <div class="dd-body" id="ddBody" role="tabpanel"></div>
      <footer class="dd-foot">
        <button class="btn ghost pill" type="button" id="ddPrev">Back</button>
        <span class="cap" id="ddStep"></span>
        <button class="btn primary pill" type="button" id="ddNext">Next</button>
      </footer>
    </div>`;
  document.body.append(back, el);
  document.body.classList.add('no-scroll');
  const prevFocus = document.activeElement;
  requestAnimationFrame(() => { back.classList.add('is-on'); el.classList.add('is-open'); });
  const $ = (s) => el.querySelector(s);

  let stage = null, inst = null, closed = false, chapters = [], at = -1;
  const S = {}; // every control's current value, shared across chapters

  const close = () => {
    if (closed) return;
    closed = true;
    open = null;
    document.removeEventListener('keydown', onKey, true);
    el.classList.remove('is-open');
    back.classList.remove('is-on');
    document.body.classList.remove('no-scroll');
    if (inst && inst.dispose) inst.dispose();
    setTimeout(() => { if (stage) stage.dispose(); el.remove(); back.remove(); }, 260);
    if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    if (opts.onClose) opts.onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  $('#ddClose').addEventListener('click', close);
  back.addEventListener('click', close);
  open = { close };
  $('#ddClose').focus({ preventScroll: true });

  let topic;
  try {
    stage = createStage({ canvas: $('#ddCanvas'), wrap: $('#ddStage'), labels: $('#ddLabels'), reduced });
    const mod = await T.load();
    if (closed) return;
    topic = mod.default({ part: opts.part || null, real: opts.real || (() => null), fitReal });
  } catch (err) {
    console.error(err);
    if (!closed) $('#ddLoading').textContent = `3D couldn't start here (${(err && err.message) || 'unknown error'}).`;
    return;
  }
  $('#ddLoading').remove();
  $('#ddTitle').textContent = topic.title;
  chapters = topic.chapters;

  $('#ddTabs').innerHTML = chapters.map((c, i) => `<button type="button" role="tab" aria-selected="false" data-i="${i}"><span class="n">${i + 1}</span>${esc(c.tab)}</button>`).join('');
  $('#ddTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(Number(b.dataset.i)); });
  $('#ddPrev').addEventListener('click', () => go(at - 1));
  $('#ddNext').addEventListener('click', () => (at === chapters.length - 1 ? close() : go(at + 1)));

  // ---- Controls ----
  const fmtOf = (c) => c.fmt || ((v) => `${v}${c.unit || ''}`);
  function rangeHtml(c) {
    return `<div class="ctrl dd-ctrl"><label for="dd-${c.id}">${esc(c.label)} <output id="dd-${c.id}-o"></output></label>
      <input type="range" id="dd-${c.id}" data-id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step ?? 1}" value="${S[c.id]}"></div>`;
  }
  function knobHtml(c) {
    return `<div class="dd-knob" data-id="${c.id}">
      <div class="dial" id="dd-${c.id}-d"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="tr" d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3"/><path class="fl" id="dd-${c.id}-f" d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3" pathLength="100"/></svg><span class="cap-dot" id="dd-${c.id}-p"></span></div>
      <div class="kt"><label for="dd-${c.id}">${esc(c.label)}</label><output id="dd-${c.id}-o"></output>
      <input type="range" class="sr-range" id="dd-${c.id}" data-id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step ?? 1}" value="${S[c.id]}"></div></div>`;
  }
  function segHtml(c) {
    return `<div class="dd-segwrap"><span class="lbl">${esc(c.label)}</span><div class="seg dd-seg" role="radiogroup" aria-label="${esc(c.label)}" data-id="${c.id}">
      ${c.options.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(S[c.id]) === String(v)}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div></div>`;
  }
  function paint(c) {
    const v = S[c.id];
    if (c.type === 'seg') {
      el.querySelectorAll(`.dd-seg[data-id="${c.id}"] button`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === String(v))));
      return;
    }
    if (c.type === 'button') return;
    const inp = $(`#dd-${c.id}`), out = $(`#dd-${c.id}-o`);
    if (!inp) return;
    if (Number(inp.value) !== v) inp.value = v;
    const k = (v - c.min) / (c.max - c.min);
    out.textContent = fmtOf(c)(v);
    if (c.type === 'knob') {
      $(`#dd-${c.id}-f`).style.strokeDasharray = `${k * 100} 100`;
      $(`#dd-${c.id}-p`).style.transform = `rotate(${-135 + k * 270}deg)`;
    } else inp.style.setProperty('--fill', `${k * 100}%`);
  }
  function setValue(c, v, tell = true) {
    if (c.type !== 'seg') { const st = c.step ?? 1; v = clamp(Math.round(v / st) * st, c.min, c.max); v = Number(v.toFixed(4)); }
    if (S[c.id] === v) return;
    S[c.id] = v;
    paint(c);
    if (tell && inst && inst.change) inst.change(c.id);
  }
  function wire(ch) {
    const body = $('#ddBody');
    for (const c of ch.controls || []) {
      if (c.type === 'seg') {
        body.querySelector(`.dd-seg[data-id="${c.id}"]`).addEventListener('click', (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          const raw = b.dataset.v, opt = c.options.find(([v]) => String(v) === raw);
          setValue(c, opt ? opt[0] : raw);
        });
      } else if (c.type === 'button') {
        body.querySelector(`#dd-${c.id}`).addEventListener('click', () => inst && inst.change && inst.change(c.id));
      } else {
        const inp = body.querySelector(`#dd-${c.id}`);
        inp.addEventListener('input', () => setValue(c, Number(inp.value)));
        if (c.type === 'knob') {
          const dial = body.querySelector(`#dd-${c.id}-d`);
          const turn = (e) => {
            const r = dial.getBoundingClientRect();
            let a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI; // 0 = up
            a = clamp(a, -135, 135);
            setValue(c, c.min + ((a + 135) / 270) * (c.max - c.min));
          };
          dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); turn(e); inp.focus({ preventScroll: true }); e.preventDefault(); });
          dial.addEventListener('pointermove', (e) => { if (dial.hasPointerCapture(e.pointerId)) turn(e); });
        }
      }
      paint(c);
    }
  }

  // What a chapter can do to the page around the 3D stage.
  const ui = {
    out(id, value, sub) {
      const t = el.querySelector(`[data-out="${id}"]`);
      if (!t) return;
      const txt = String(value);
      if (t.firstChild.textContent !== txt) t.firstChild.textContent = txt;
      if (sub !== undefined) { const s = t.parentNode.querySelector('.sub'); if (s && s.textContent !== sub) s.textContent = sub; }
    },
    tone(id, tone) { const t = el.querySelector(`[data-out="${id}"]`); if (t) t.parentNode.dataset.tone = tone || ''; },
    note(html, tone) {
      const n = $('#ddNote');
      if (!n) return;
      if (n.dataset.html !== html) { n.innerHTML = html; n.dataset.html = html; }
      n.hidden = !html;
      n.dataset.tone = tone || '';
    },
    hud(html) { const h = $('#ddHud'); if (h.dataset.html !== html) { h.innerHTML = html; h.dataset.html = html; } },
    set(id, v) { const c = (chapters[at].controls || []).find((x) => x.id === id); if (c) setValue(c, v, false); },
    label(id, text) { const b = $(`#dd-${id}`); if (b && b.tagName === 'BUTTON') b.textContent = text; },
  };

  function go(i) {
    i = clamp(i, 0, chapters.length - 1);
    if (i === at) return;
    at = i;
    const ch = chapters[i];
    if (inst && inst.dispose) inst.dispose();
    inst = null;
    stage.clear();
    ui.hud('');
    for (const c of ch.controls || []) if (S[c.id] === undefined && c.type !== 'button') S[c.id] = c.value;
    el.querySelectorAll('#ddTabs button').forEach((b, n) => { b.setAttribute('aria-selected', String(n === i)); if (n === i) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' }); });
    const ctl = (ch.controls || []).map((c) => (c.type === 'knob' ? knobHtml(c) : c.type === 'seg' ? segHtml(c) : c.type === 'button' ? `<button class="btn soft pill dd-act" type="button" id="dd-${c.id}">${esc(c.label)}</button>` : rangeHtml(c))).join('');
    $('#ddBody').innerHTML = `
      <div class="dd-kicker">Chapter ${i + 1} of ${chapters.length}</div>
      <h3>${esc(ch.title)}</h3>
      <p class="dd-lead">${ch.lead}</p>
      ${ctl ? `<div class="dd-controls">${ctl}</div>` : ''}
      ${(ch.readouts || []).length ? `<div class="dd-outs">${ch.readouts.map(([id, lab, sub]) => `<div class="dd-out"><div class="lab">${esc(lab)}</div><div class="val num" data-out="${id}"><span>–</span></div><div class="sub">${esc(sub || '')}</div></div>`).join('')}</div>` : ''}
      <div class="dd-note" id="ddNote" hidden></div>
      ${(ch.more || []).length ? `<div class="dd-mores"><div class="dd-mh">Dig deeper</div>${ch.more.map(([q, a]) => `<details class="dd-more"><summary>${esc(q)}${ICON('plus', 'i sm')}</summary><div class="a">${a}</div></details>`).join('')}</div>` : ''}`;
    $('#ddBody').scrollTop = 0;
    $('#ddStep').textContent = `${i + 1} / ${chapters.length}`;
    $('#ddPrev').disabled = i === 0;
    $('#ddNext').textContent = i === chapters.length - 1 ? 'Done' : `Next: ${chapters[i + 1].tab}`;
    try {
      inst = ch.build(stage, S, ui) || {};
      const v = inst.view || ch.view;
      if (v) stage.setView(v.pos, v.target, at === i && stage.time > 0.3 ? 700 : 0);
      if (inst.tick) stage.onTick(inst.tick);
    } catch (err) {
      console.error(err);
      ui.note(`This chapter's 3D model hit a snag (${esc((err && err.message) || 'unknown error')}). The text still works.`, 'warn');
    }
    wire(ch);
  }
  const first = Math.max(0, chapters.findIndex((c) => c.id === opts.startAt));
  go(first);
  window.__dive = { go, S, stage, close };
}
