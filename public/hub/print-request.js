// Print request pop-up: the one form for sending a part to the mentors.
// It opens from the Home print card, the Create menu, search and the Print Shop (any element with data-print-request).
// When a request is saved it fires a `kwc:print-sent` event on document, so Home and the Print Shop refresh their queues.
import { $, esc, fmt, clamp, icon, seg, wireSeg, sw, modal } from './zones/common.js';
import { api, me } from './api.js';

export const MATS = ['PLA', 'PETG', 'TPU'];
export const COLORS = ['Black', 'Gray', 'White', 'Orange', 'Yellow', 'Blue'];
const BED = [220, 220, 250];
const safeUrl = (u) => (/^https?:\/\/[^\s]+$/i.test(String(u || '').trim()) ? String(u).trim() : '');

// Reads a binary or text STL in the browser: size, steep overhangs and volume. Nothing is uploaded.
function parseSTL(buf) {
  const dv = new DataView(buf);
  const tris = [];
  const bin = buf.byteLength >= 84 && 84 + dv.getUint32(80, true) * 50 === buf.byteLength;
  if (bin) {
    const n = dv.getUint32(80, true);
    for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; const t = new Float32Array(9); for (let k = 0; k < 9; k++) t[k] = dv.getFloat32(o + k * 4, true); tris.push(t); }
  } else {
    const txt = new TextDecoder().decode(buf);
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    let m, cur = [];
    while ((m = re.exec(txt))) { cur.push(+m[1], +m[2], +m[3]); if (cur.length === 9) { tris.push(cur); cur = []; } }
  }
  if (!tris.length) throw new Error('No triangles found');
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let k = 0; k < 9; k++) { const a = k % 3; if (t[k] < mn[a]) mn[a] = t[k]; if (t[k] > mx[a]) mx[a] = t[k]; }
  let area = 0, over = 0, vol = 0;
  for (const t of tris) {
    const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2], vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz), a = len / 2;
    area += a;
    const onBed = Math.max(t[2], t[5], t[8]) - mn[2] < 0.2;
    if (len > 0 && nz / len < -0.7071 && !onBed) over += a;
    vol += (t[0] * (t[4] * t[8] - t[5] * t[7]) - t[1] * (t[3] * t[8] - t[5] * t[6]) + t[2] * (t[3] * t[7] - t[4] * t[6])) / 6;
  }
  return { tris: tris.length, size: mx.map((v, i) => v - mn[i]), overPct: area ? (over / area) * 100 : 0, vol: Math.abs(vol) / 1000 };
}

// The four steps a request goes through, shared by the pop-up and the Print Shop.
export const printSteps = (cls = '') => `<div class="steps${cls ? ` ${cls}` : ''}" aria-label="How a print request moves">${[['Request', 'you'], ['Queued', 'waiting for a printer'], ['Printing', 'a mentor starts it'], ['Done', 'you pick it up']].map(([s, w], i) => `<span class="step${i === 0 ? ' now' : ''}"><span class="n">${i + 1}</span>${s}<small>${w}</small></span>`).join('')}</div>`;

// Kept between openings, so closing the pop-up by accident doesn't lose what was typed.
const pre = { mat: 'PLA', color: 'Black', q: 'Standard', s: 'Standard', sup: false, n: 1, name: '', link: '', why: '', sys: '' };
let file = null;

export function openPrintRequest(ctx) {
  const { SYS, SYS_ORDER } = ctx;
  const m = modal({
    label: 'Request a print',
    cls: 'pq',
    head: `<span class="pq-ic" aria-hidden="true">${icon('printer', 'i lg')}</span>
      <div class="pq-title"><h3>Request a print</h3><p>Send a part with a note. A mentor puts it on a printer, and you can follow it in the Print Shop.</p></div>`,
    body: '<div id="pqBody"></div>',
    foot: '<span class="cap" id="pqEst"></span><button class="btn primary pill" type="button" id="pqGo">' + icon('printer', 'i sm') + 'Send to mentors</button>',
  });
  const el = m.el;
  const est = () => {
    const base = file && file.vol ? file.vol * 1.24 * ({ Light: 0.32, Standard: 0.45, Strong: 0.65 }[pre.s]) : 9 * ({ Light: 0.8, Standard: 1, Strong: 1.35 }[pre.s]);
    const grams = base * (pre.sup ? 1.12 : 1) * pre.n;
    const mins = (grams / ({ Draft: 18, Standard: 12, Fine: 7 }[pre.q])) * 60;
    return { grams: Math.max(1, Math.round(grams)), time: mins >= 60 ? `${Math.floor(mins / 60)} h ${Math.round(mins % 60)} min` : `${Math.max(5, Math.round(mins))} min` };
  };
  const checks = () => {
    if (!file || !file.tris) return '';
    const fits = file.size.every((v, i) => v <= BED[i]);
    const sz = file.size.map((v) => (Math.round(v * 10) / 10).toFixed(1)).join(' × ');
    return `<ul class="checks">
      <li><span class="ci ${fits ? 'ok' : 'bad'}">${icon(fits ? 'check' : 'x')}</span><span>${fits ? 'Fits the bed' : 'Too big for the bed'}: ${sz} mm${fits ? '' : ` (bed is ${BED.join(' × ')} mm)`}</span></li>
      <li><span class="ci ${file.overPct > 5 ? 'warn' : 'ok'}">${icon(file.overPct > 5 ? 'alert' : 'check')}</span><span>${file.overPct > 5 ? `${file.overPct.toFixed(0)}% of the surface hangs steeper than 45°. Supports are on.` : 'No steep overhangs'}</span></li>
      <li><span class="ci ok">${icon('check')}</span><span>${fmt(file.tris)} triangles${file.vol ? ` · ${file.vol.toFixed(1)} cm³ of plastic if solid` : ''}</span></li></ul>`;
  };
  const keep = () => {
    if (!$('#psName', el)) return;
    pre.name = $('#psName', el).value; pre.link = $('#psLink', el).value; pre.why = $('#psWhy', el).value; pre.sys = $('#psSys', el).value;
  };
  const foot = () => { const e = est(); $('#pqEst', el).innerHTML = `About <b>${e.time}</b> and <b>${e.grams} g</b> of filament. A rough guess: mentors set the printer, so you never touch temperatures.`; };
  const section = (n, title, html) => `<section class="pq-sec"><h4><span class="n">${n}</span>${title}</h4>${html}</section>`;
  const form = () => {
    $('#pqBody', el).innerHTML = `
      ${section(1, 'What do you need?', `<div class="form-grid">
        <label class="field full"><span>What is the part?</span><input class="inp" id="psName" maxlength="80" placeholder="Intake roller hub" value="${esc(pre.name)}"></label>
        <label class="field full"><span>File link <small>(Onshape, Google Drive or another link a mentor can open)</small></span><input class="inp" id="psLink" type="url" maxlength="400" placeholder="https://" value="${esc(pre.link)}"></label>
      </div>
      <label class="drop" id="drop">${icon('printer', 'i lg')}<b>${file ? esc(file.name) : 'Check an STL here first (optional)'}</b><span class="cap" style="font-weight:400">${file ? 'Checked right here in your browser. The file is not uploaded, so add a link above too.' : 'Drop an STL or choose one. It is checked in your browser: size, overhangs and a filament guess.'}</span><input type="file" id="psFile" accept=".stl"></label>
      ${checks()}`)}
      ${section(2, 'How should it print?', `<div class="form-grid">
        <label class="field"><span>Material</span><select class="inp" id="psMat">${MATS.map((x) => `<option${x === pre.mat ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Color</span><select class="inp" id="psColor">${COLORS.map((x) => `<option${x === pre.color ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <div class="field"><span>Quality</span>${seg('q', [['Draft', 'Draft'], ['Standard', 'Standard'], ['Fine', 'Fine']], pre.q, 'Quality')}</div>
        <div class="field"><span>Strength</span>${seg('s', [['Light', 'Light'], ['Standard', 'Standard'], ['Strong', 'Strong']], pre.s, 'Strength')}</div>
        <div class="field"><span>How many</span><span class="stepper"><button type="button" id="nMinus" aria-label="One fewer">${icon('min', 'i sm')}</button><output id="nOut">${pre.n}</output><button type="button" id="nPlus" aria-label="One more">${icon('plus', 'i sm')}</button></span></div>
        <div class="field"><span>Supports</span><span class="row">${sw('psSup', pre.sup, 'Supports')}<span class="cap">${pre.sup ? 'On' : 'Off'}</span></span></div>
      </div>`)}
      ${section(3, 'Why do you need it?', `<div class="form-grid">
        <label class="field full"><span>Which subsystem is it for?</span><select class="inp" id="psSys"><option value="">Not for the robot</option>${SYS_ORDER.map((k) => `<option value="${k}"${k === pre.sys ? ' selected' : ''}>${SYS[k].name}</option>`).join('')}</select></label>
        <label class="field full"><span>A note for the mentors</span><textarea class="inp" id="psWhy" maxlength="400" placeholder="For the intake test on Tuesday">${esc(pre.why)}</textarea></label>
      </div>`)}`;
    foot();
    const f = $('#pqBody', el);
    wireSeg(f, 'q', (v) => { keep(); pre.q = v; form(); });
    wireSeg(f, 's', (v) => { keep(); pre.s = v; form(); });
    $('#psMat', f).addEventListener('change', (ev) => { pre.mat = ev.target.value; });
    $('#psColor', f).addEventListener('change', (ev) => { pre.color = ev.target.value; });
    $('#psSup', f).addEventListener('click', () => { keep(); pre.sup = !pre.sup; form(); $('#psSup', el).focus(); });
    $('#nMinus', f).addEventListener('click', () => { keep(); pre.n = clamp(pre.n - 1, 1, 12); form(); $('#nMinus', el).focus(); });
    $('#nPlus', f).addEventListener('click', () => { keep(); pre.n = clamp(pre.n + 1, 1, 12); form(); $('#nPlus', el).focus(); });
    const drop = $('#drop', f), inp = $('#psFile', f);
    const take = async (fl) => {
      if (!fl) return;
      keep();
      const ext = fl.name.split('.').pop().toLowerCase();
      if (ext !== 'stl') { ctx.toast('Only STL files can be checked here. Add a link to the file above instead.'); return; }
      if (fl.size > 80e6) { ctx.toast('That file is over 80 MB. Try exporting it with fewer details from Onshape.'); return; }
      try { const r = parseSTL(await fl.arrayBuffer()); file = { name: fl.name, ...r }; pre.sup = r.overPct > 5; if (!pre.name) pre.name = fl.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '); form(); }
      catch (err) { ctx.toast("That STL couldn't be read. Try exporting it again from Onshape."); }
    };
    inp.addEventListener('change', () => take(inp.files[0]));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (ev) => take(ev.dataTransfer && ev.dataTransfer.files[0]));
  };
  const sent = (rec) => {
    $('#pqBody', el).innerHTML = `<div class="pq-done">
      <span class="pq-ic" aria-hidden="true">${icon('check', 'i lg')}</span>
      <h3>Sent to the mentors</h3>
      <p><b>${esc(rec.data.name)}</b> is in the queue. You'll get an alert when it's done.</p>
      ${printSteps('pq-steps is-queued')}
    </div>`;
    $('.modal-foot', el).innerHTML = `<button class="btn ghost pill" type="button" id="pqMore">${icon('plus', 'i sm')}Send another</button><button class="btn primary pill" type="button" data-goto="build|Print Shop">${icon('printer', 'i sm')}See the queue</button>`;
    $('#pqMore', el).addEventListener('click', () => { m.close(); setTimeout(() => openPrintRequest(ctx), 280); });
    $('[data-goto]', el).addEventListener('click', () => m.close());
    $('#pqMore', el).focus({ preventScroll: true });
  };
  form();
  $('#pqGo', el).addEventListener('click', async (ev) => {
    keep();
    const name = pre.name.trim(), link = pre.link.trim(), why = pre.why.trim();
    if (!name) { $('#psName', el).focus(); ctx.toast('Give the part a name first.'); return; }
    if (!link) { $('#psLink', el).focus(); ctx.toast('Add a link to the file, so a mentor can open it.'); return; }
    if (!safeUrl(link)) { $('#psLink', el).focus(); ctx.toast('Links start with https://'); return; }
    if (!why) { $('#psWhy', el).focus(); ctx.toast('Tell the mentors why you need it. It helps them decide what prints first.'); return; }
    const e2 = est(), btn = ev.currentTarget;
    btn.disabled = true;
    try {
      const rec = await api.create('print', { name, file: link, material: pre.mat, color: pre.color, qty: pre.n, notes: why, sys: pre.sys || '', quality: pre.q, strength: pre.s, supports: pre.sup, grams: e2.grams, time: e2.time, status: 'queued', who: me(), printer: '', pct: 0 });
      file = null;
      Object.assign(pre, { n: 1, sup: false, name: '', link: '', why: '' });
      document.dispatchEvent(new CustomEvent('kwc:print-sent', { detail: rec }));
      sent(rec);
    } catch (err) { ctx.toast(err && err.message ? err.message : 'That did not save. Try again.'); btn.disabled = false; }
  });
  setTimeout(() => { const n = $('#psName', el); if (n) n.focus({ preventScroll: true }); }, 60);
  return m;
}

// Home's print card: a big volt "Need a part printed?" button on top of the queue, so asking for a print is one tap.
export function enhanceHomePrintCard() {
  const card = $('.w-print');
  if (!card || $('.pq-cta', card)) return;
  const head = $('.card-head', card);
  if (head && !$('.pq-head-ic', head)) head.insertAdjacentHTML('afterbegin', `<span class="pq-head-ic" aria-hidden="true">${icon('printer', 'i sm')}</span>`);
  const cta = `<button class="pq-cta" type="button" data-print-request>
    <span class="pq-cta-ic" aria-hidden="true">${icon('printer', 'i lg')}</span>
    <span class="pq-cta-txt"><b>Need a part printed?</b><span>Send a file link and a note. A mentor prints it.</span></span>
    <span class="pq-cta-go">Request a print${icon('arrow', 'i sm')}</span>
  </button>`;
  if (head) head.insertAdjacentHTML('afterend', cta); else card.insertAdjacentHTML('afterbegin', cta);
  const old = $('.card-foot .btn[data-goto="build|Print Shop"]', card);
  if (old) {
    old.className = 'btn ghost pill';
    old.innerHTML = `Open the Print Shop${icon('arrow', 'i sm')}`;
  }
}
