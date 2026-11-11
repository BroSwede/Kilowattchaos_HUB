// Shared helpers and sample data for the zone pages. Everything here is preview-only sample data
// except what comes from data/parts.json (the real StarterBot parts list).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const fmt = (n) => Number(n).toLocaleString('en-US');
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------- People (display names only, robot avatars)
export const KIDS = [
  { n: 'Sparky', c: '#F07A2A', role: 'Driver · Launcher', subs: ['launcher'], skills: ['Driving', 'Onshape', 'Testing'], badges: ['Shop safety', 'Onshape Basics', 'First print', 'Mechanisms 101', 'Driver', 'Helper'], work: "Measuring the flywheel's top speed", stats: [4, 3, 2, 9] },
  { n: 'Pixel', c: '#0E8F9E', role: 'Intake lead · CAD', subs: ['intake'], skills: ['Onshape', 'Prototyping', 'Testing'], badges: ['Shop safety', 'Onshape Basics', 'CAD for FTC', 'First print', 'Mechanisms 101', 'Prototype pro', 'Helper'], work: 'Gecko wheels 6 mm closer', stats: [6, 5, 1, 10] },
  { n: 'Gizmo', c: '#B394FF', role: 'Ball path · Build', subs: ['ballpath', 'structure'], skills: ['Building', 'Wiring', 'Java'], badges: ['Shop safety', 'First print', 'Mechanisms 101', 'Wiring', 'Helper'], work: 'Fixing the servo gate double-feed', stats: [3, 2, 3, 8] },
  { n: 'Byte', c: '#E8F542', role: 'Code lead', subs: ['drivetrain'], skills: ['Java', 'OnBot Java', 'Arena'], badges: ['Shop safety', 'Java OpModes', 'First commit', 'Arena drill', 'Challenge winner', 'Mechanisms 101', 'Helper', 'Driver'], work: 'The drive-forward autonomous', stats: [2, 0, 14, 9] },
  { n: 'Nova', c: '#C42D6B', role: 'Intake · Outreach', subs: ['intake'], skills: ['Outreach', 'Prototyping', 'Video'], badges: ['Shop safety', 'Onshape Basics', 'Outreach', 'Helper'], work: 'Library robot demo in December', stats: [3, 2, 0, 7] },
  { n: 'Rivet', c: '#9A968A', role: 'Frame · Launcher', subs: ['structure', 'launcher'], skills: ['Building', 'Tools', 'Onshape'], badges: ['Shop safety', 'First print', 'Mechanisms 101', 'Builder'], work: 'Stiffening the launcher mount', stats: [2, 4, 0, 8] },
  { n: 'Echo', c: '#8FD3DC', role: 'Portfolio · Power', subs: ['power', 'ballpath'], skills: ['Writing', 'Photos', 'Wiring'], badges: ['Shop safety', 'Portfolio', 'Wiring', 'Battery care', 'Helper', 'Onshape Basics'], work: 'Portfolio: the robot overview page', stats: [2, 1, 1, 10] },
];
export const KID = Object.fromEntries(KIDS.map((k) => [k.n, k]));

// The real team replaces the sample kids at boot (app.js calls this with /api/me's roster).
// Arrays and the KID map are changed in place so every module that imported them sees the team.
export const ME = { n: '', c: '#9A968A', role: 'student' };
export function setRoster(roster, me) {
  const kids = roster.filter((r) => r.role === 'student');
  KIDS.length = 0;
  for (const r of kids) KIDS.push({ n: r.name, c: r.color, role: r.title || 'Team member', subs: r.subs || [], skills: [], badges: [], work: '', stats: [0, 0, 0, 0], here: !!r.here, id: r.id });
  for (const k of Object.keys(KID)) delete KID[k];
  for (const k of KIDS) KID[k.n] = k;
  for (const r of roster.filter((x) => x.role === 'mentor')) MENTORS[r.name] = r;
  if (me) Object.assign(ME, { n: me.name, c: me.color, role: me.role, id: me.id });
}
export const MENTORS = {};
export const MENTOR = { n: 'Coach', c: '#4F5049' };
export const colorOf = (n) => (KID[n] ? KID[n].c : MENTORS[n] ? MENTORS[n].color : n === ME.n ? ME.c : MENTOR.c);

export function botSvg(color) {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="${color}"/><path d="M20 12.5V8.8" stroke="#222624" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="7.6" r="2.2" fill="#222624"/><rect x="9.5" y="12.5" width="21" height="16" rx="6" fill="#222624"/><circle cx="15.6" cy="20.4" r="2.6" fill="#E8F542"/><circle cx="24.4" cy="20.4" r="2.6" fill="#E8F542"/><rect x="16.5" y="24.6" width="7" height="1.8" rx=".9" fill="#E8F542" opacity=".85"/></svg>`;
}
export const av = (name, size = 32) => `<span class="avt" style="--s:${size}px" title="${esc(name)}">${botSvg(colorOf(name))}</span>`;
export const avStack = (names, size = 28) => `<span class="avs">${names.map((n) => av(n, size)).join('')}</span>`;

// ---------------------------------------------------------------- Small building blocks
export const tag = (t, cls = '') => `<span class="tag${cls ? ` ${cls}` : ''}">${t}</span>`;
export const SAMPLE = tag('Sample data');
export const dot = (c, s = 10) => `<span class="sdot" style="--c:${c};width:${s}px;height:${s}px"></span>`;
export const pill = (label, c) => `<span class="st">${c ? dot(c, 8) : ''}${label}</span>`;
export function strip(text, tags = [], actions = '') {
  return `<div class="zv-strip"><p>${text}</p><div class="zv-tags">${tags.join('')}</div>${actions ? `<div class="zv-actions">${actions}</div>` : ''}</div>`;
}
export const bar = (pct, label = '') => `<span class="prog" role="img" aria-label="${esc(label || `${Math.round(pct)}%`)}"><i style="width:${clamp(pct, 0, 100)}%"></i></span>`;
export function ring(pct, inner, size = 52) {
  const r = size / 2 - 4, C = 2 * Math.PI * r;
  return `<span class="ring2" style="--s:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - clamp(pct, 0, 100) / 100)}"/></svg><span>${inner}</span></span>`;
}
export const seg = (name, opts, cur, label) => `<div class="seg" role="radiogroup" aria-label="${esc(label || name)}">${opts.map(([v, t]) => `<button type="button" role="radio" data-${name}="${v}" aria-checked="${v === cur}">${t}</button>`).join('')}</div>`;
export function wireSeg(el, name, onPick) {
  $$(`[data-${name}]`, el).forEach((b) => b.addEventListener('click', () => {
    $$(`[data-${name}]`, el).forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    onPick(b.dataset[name], b);
  }));
}
export const sw = (id, on, label) => `<button class="switch" type="button" role="switch" id="${id}" aria-checked="${on}" aria-label="${esc(label)}"><i></i></button>`;
export const chevron = () => `<svg class="i sm chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
export const acc = (q, a, open = false) => `<details class="acc"${open ? ' open' : ''}><summary><span>${q}</span>${chevron()}</summary><div class="body">${a}</div></details>`;

export async function copyText(text, toast) {
  try { await navigator.clipboard.writeText(text); toast('Copied.'); }
  catch (e) {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    t.remove();
    toast(ok ? 'Copied.' : 'Copying is blocked here. Select the text and copy it yourself.');
  }
}

// ---------------------------------------------------------------- Java highlighting for code views
const JAVA_KW = new Set('abstract boolean break case catch class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true false try void volatile while var'.split(' '));
export function hlJava(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*")|(@[A-Za-z]+)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const t = m[0];
    if (m[1]) out += `<span class="tc">${esc(t)}</span>`;
    else if (m[2]) out += `<span class="ts">${esc(t)}</span>`;
    else if (m[3]) out += `<span class="ta">${t}</span>`;
    else if (m[4]) out += `<span class="tn">${t}</span>`;
    else if (JAVA_KW.has(t)) out += `<span class="tk">${t}</span>`;
    else if (/^[A-Z]/.test(t)) out += `<span class="tt">${t}</span>`;
    else out += t;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
export const codeBlock = (src, lang = 'java') => `<pre class="code" tabindex="0"><code>${lang === 'java' ? hlJava(src) : esc(src)}</code></pre>`;

// ---------------------------------------------------------------- Drawer (side sheet on laptops, bottom sheet on phones)
let openDrawer = null;
export function drawer(html, { label = 'Details', wide = false, onClose } = {}) {
  closeDrawer();
  const back = document.createElement('div');
  back.className = 'drawer-back';
  const el = document.createElement('aside');
  el.className = `drawer${wide ? ' wide' : ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', label);
  el.innerHTML = `<button class="icon-btn sm drawer-x" type="button" aria-label="Close">${icon('x')}</button><div class="drawer-in">${html}</div>`;
  document.body.append(back, el);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => { back.classList.add('is-on'); el.classList.add('is-open'); });
  const prev = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.remove('is-open');
    back.classList.remove('is-on');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { el.remove(); back.remove(); }, 260);
    if (openDrawer && openDrawer.el === el) openDrawer = null;
    if (onClose) onClose();
    if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
  };
  back.addEventListener('click', close);
  $('.drawer-x', el).addEventListener('click', close);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  $('.drawer-x', el).focus({ preventScroll: true });
  openDrawer = { el, close };
  return el;
}
export function closeDrawer() { if (openDrawer) openDrawer.close(); }

// ---------------------------------------------------------------- Pop-up (centered on laptops, bottom sheet on phones)
// `head` sits above the scrolling body and `foot` stays pinned under it, so the main button is always in reach.
let openModal = null;
export function modal({ head = '', body = '', foot = '', label = 'Dialog', cls = '', onClose } = {}) {
  closeModal();
  closeDrawer();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal${cls ? ` ${cls}` : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}">
    <div class="modal-head">${head}<button class="icon-btn sm modal-x" type="button" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const el = $('.modal', back);
  document.body.append(back);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => back.classList.add('is-on'));
  const prev = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove('is-on');
    document.body.classList.remove('no-scroll');
    setTimeout(() => back.remove(), 260);
    if (openModal && openModal.el === el) openModal = null;
    if (onClose) onClose();
    if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
  };
  back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  $('.modal-x', el).addEventListener('click', close);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button:not([disabled]), input, select, textarea, a[href]', el).filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  openModal = { el, close };
  return { el, close };
}
export function closeModal() { if (openModal) openModal.close(); }

// ---------------------------------------------------------------- Glossary (also powers the dotted-underline tooltips)
export const GLOSSARY = [
  ['Torque', 'Mechanical', 'Twisting force. More torque turns heavier things; gearing trades speed for torque.', 'gear'],
  ['Gear ratio', 'Mechanical', 'How many turns the input makes for one turn of the output. 100 to 20 teeth spins the small gear 5 times faster.', 'gear'],
  ['Compliance', 'Mechanical', 'How much a part gives when pushed. Soft gecko wheels are compliant, so they squash and grip a ball.', 'squish'],
  ['Compression', 'Mechanical', 'How much smaller the gap is than the ball. A 3 in. ball through a 2.6 in. gap has 0.4 in. of compression.', 'squish'],
  ['Mecanum wheel', 'Mechanical', 'A wheel with rollers at 45 degrees. Spin four of them in the right directions and the robot slides sideways.', 'wheel'],
  ['Flywheel', 'Mechanical', 'A heavy wheel spun fast. It stores energy and hands some to each ball that touches it.', 'wheel'],
  ['Hex shaft', 'Mechanical', 'A six-sided shaft. Wheels and gears on it cannot slip the way they can on a round one.', 'gear'],
  ['Standoff', 'Mechanical', 'A spacer post that holds two parts a fixed distance apart.', 'bolt'],
  ['Surface speed', 'Mechanical', "How fast the outside of a wheel moves: pi × diameter × RPM. It's what the ball actually feels.", 'wheel'],
  ['OpMode', 'Code', 'One program the robot can run, picked on the Driver Station. TeleOp is driver-controlled, Autonomous runs by itself.', 'code'],
  ['TeleOp', 'Code', 'The driver-controlled part of a match, using gamepads.', 'code'],
  ['Autonomous', 'Code', 'The start of a match, when the robot runs a program with no drivers.', 'code'],
  ['PID', 'Code', 'A controller that looks at the error now (P), over time (I) and how fast it changes (D) to reach a target, like a flywheel speed.', 'wave'],
  ['Odometry', 'Code', 'Working out where the robot is by counting wheel turns and watching its heading.', 'path'],
  ['Encoder', 'Electrical', 'A sensor in a motor that counts how far it has turned.', 'gear'],
  ['Telemetry', 'Code', 'Numbers the robot sends to the Driver Station screen while it runs. Your best debugging tool.', 'wave'],
  ['Servo', 'Electrical', 'A motor that moves to a position you ask for, or spins continuously in speed mode.', 'gear'],
  ['Control Hub', 'Electrical', "The robot's brain: it runs your code and connects motors, servos and sensors.", 'bolt'],
  ['Current draw', 'Electrical', 'How much electricity a motor pulls. Stalling a motor draws a lot and heats it up.', 'wave'],
  ['Gracious Professionalism', 'FIRST', 'Compete hard, and treat everyone with respect and kindness while you do.', 'heart'],
  ['Coopertition', 'FIRST', 'Helping and learning from other teams even while you compete against them.', 'heart'],
  ['Alliance', 'FIRST', 'The two teams that play together in a match.', 'heart'],
  ['Inspection', 'FIRST', 'The check before an event that your robot follows the robot rules and is safe.', 'check'],
  ['Engineering Portfolio', 'FIRST', 'A short document judges read about your team, your design process and your robot.', 'check'],
  ['STL', 'Printing', 'A 3D file made of triangles. The usual way to send a part to a slicer.', 'layers'],
  ['Slicer', 'Printing', 'Software that turns a 3D part into layers and printer moves.', 'layers'],
  ['Infill', 'Printing', 'The pattern printed inside a part. More infill is stronger and heavier.', 'layers'],
  ['Overhang', 'Printing', 'A surface hanging over thin air. Past about 45 degrees it needs supports.', 'layers'],
  ['Heat-set insert', 'Printing', 'A brass thread pressed into a printed hole with a hot iron, so screws bite into metal, not plastic.', 'bolt'],
];
const GL = new Map(GLOSSARY.map(([t, , d]) => [t.toLowerCase(), { t, d }]));
export const gl = (word, term = word) => `<button type="button" class="gl" data-term="${esc(term.toLowerCase())}">${word}</button>`;
export function initGlossaryTips() {
  let tip = null;
  const show = (el) => {
    const g = GL.get(el.dataset.term);
    if (!g) return;
    if (!tip) { tip = document.createElement('div'); tip.className = 'gl-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.innerHTML = `<b>${esc(g.t)}</b> ${esc(g.d)}`;
    const r = el.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    tip.classList.add('is-on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const x = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8);
    const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  const hide = () => tip && tip.classList.remove('is-on');
  document.addEventListener('pointerover', (e) => { const g = e.target.closest('.gl'); if (g) show(g); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('.gl')) hide(); });
  document.addEventListener('focusin', (e) => { const g = e.target.closest('.gl'); if (g) show(g); else hide(); });
  document.addEventListener('click', (e) => { const g = e.target.closest('.gl'); if (g) show(g); });
  addEventListener('scroll', hide, { passive: true });
}

// ---------------------------------------------------------------- A decorative check-in code (not scannable; the real one comes from the Hub)
export function codePattern(seed = 7, n = 21) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const finder = (x, y) => {
    const inF = (fx, fy) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      if (inF(fx, fy)) { const dx = x - fx, dy = y - fy; return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0; }
      if (x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7) return 0;
    }
    return -1;
  };
  let cells = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = finder(x, y);
    if (f === 1 || (f === -1 && rnd() > 0.52)) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" class="qr" aria-hidden="true"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" rx="2" fill="#fff"/><g fill="#222624" shape-rendering="crispEdges">${cells}</g></svg>`;
}

// ---------------------------------------------------------------- Tiny line chart (SVG, labeled points)
export function lineChart({ points, max, labels, w = 560, h = 200, unit = '', ariaLabel, highlight = -1, dashedFrom = -1 }) {
  const padL = 34, padR = 16, padT = 28, padB = 30;
  const X = (i) => padL + (i / Math.max(1, points.length - 1)) * (w - padL - padR);
  const Y = (v) => padT + (1 - v / max) * (h - padT - padB);
  const solid = points.map((v, i) => (dashedFrom >= 0 && i > dashedFrom ? null : `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)).filter(Boolean).join(' ');
  const dashed = dashedFrom >= 0 ? points.slice(dashedFrom).map((v, k) => `${k ? 'L' : 'M'}${X(dashedFrom + k).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ') : '';
  const grid = [0, 0.5, 1].map((f) => `<line x1="${padL}" x2="${w - padR}" y1="${Y(max * f)}" y2="${Y(max * f)}" class="cg"/><text x="${padL - 8}" y="${Y(max * f) + 4}" text-anchor="end" class="ct">${Math.round(max * f)}</text>`).join('');
  const dots = points.map((v, i) => {
    const hi = i === highlight;
    const future = dashedFrom >= 0 && i > dashedFrom;
    return `<circle cx="${X(i)}" cy="${Y(v)}" r="${hi ? 6 : 4}" class="${hi ? 'cd hi' : future ? 'cd fut' : 'cd'}"/>${hi ? `<rect x="${X(i) - 28}" y="${Y(v) - 34}" width="56" height="24" rx="12" class="cb"/><text x="${X(i)}" y="${Y(v) - 18}" text-anchor="middle" class="cbt">${v}${unit}</text>` : ''}<text x="${X(i)}" y="${h - 8}" text-anchor="middle" class="ct">${labels[i]}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(ariaLabel)}">${grid}<path d="${solid}" class="cl"/>${dashed ? `<path d="${dashed}" class="cl dash"/>` : ''}${dots}</svg>`;
}
