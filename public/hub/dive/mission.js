// A mission: one explainer chapter walked through in four beats inside the same pop-up.
//   Guess  pick an answer before touching anything (the model sits behind frosted glass)
//   Play   the chapter exactly as it is everywhere else, with the guess pinned on top
//   Check  what the guess should have been, then two questions
//   Bench  one job on the real robot, one thing to write down, and someone who watched
// index.js builds the pop-up and the 3D chapter, then hands the side panel to runMission().
import { BEATS, progress, saveStop } from './trails.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const ABC = 'ABC';
const day = (t) => { try { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };

/**
 * @param {object} d  { el, $, hit: findStop() result, playHtml, close, reopen(id), people: [names], beat }
 */
export function runMission({ el, $, hit, playHtml, close, reopen, people = [], beat: wanted }) {
  const { trail, ti, i, stop, next } = hit;
  const id = stop.id;
  const rec = () => progress().m[id] || {};
  const solved = [false, false], missed = [false, false];
  let beat = '', editing = false;

  el.classList.add('is-mission');
  el.setAttribute('aria-label', `Mission: ${stop.name}`);
  el.querySelector('.dd-head .eyebrow').innerHTML = `<span class="dd-dot" style="--c:var(--sys-${trail.sys})"></span>Trail ${ti + 1} · ${esc(trail.name)}`;
  $('#ddTitle').textContent = stop.name;
  const veil = document.createElement('div');
  veil.className = 'ms-veil';
  veil.innerHTML = `<span>${ICON('help', 'i sm')}Guess first. Then the controls are yours.</span>`;
  $('#ddStage').append(veil);

  const tabs = $('#ddTabs');
  tabs.setAttribute('aria-label', 'Mission steps');
  tabs.innerHTML = BEATS.map(([b, n], k) => `<button type="button" role="tab" data-beat="${b}"><span class="n">${k + 1}</span>${n}</button>`).join('');
  // Guess comes first: Play and Check stay shut until there is a guess. The bench job can always be read.
  const open = (b) => b === 'guess' || b === 'bench' || rec().g != null;
  const done = (b) => (b === 'guess' ? rec().g != null : b === 'play' || b === 'check' ? !!rec().c : !!rec().b);

  const opts = (list, attr, pick) => `<div class="ms-opts">${list.map((t, k) => `<button type="button" class="ms-opt" ${attr}="${k}"${pick === k ? ' data-on="1"' : ''}><span class="k">${ABC[k]}</span><span>${t}</span></button>`).join('')}</div>`;

  function guessHtml() {
    const r = rec(), locked = !!r.c;
    return `<div class="dd-kicker">Mission ${i + 1} of ${trail.stops.length} · Guess first</div>
      <h3>${stop.guess.q}</h3>
      ${opts(stop.guess.a, 'data-g', r.g)}
      <p class="ms-hint">${locked ? 'Your guess is locked in now that you have finished the check.' : 'No marks for this one. A wrong guess you go and test teaches you more than a right answer somebody told you.'}</p>`;
  }
  function playBody() {
    const r = rec();
    return playHtml(`<p class="ms-pin"><span>Your guess</span>${stop.guess.a[r.g] ?? ''}</p>`);
  }
  function checkHtml() {
    const r = rec(), right = r.g === stop.guess.right;
    if (r.c) solved[0] = solved[1] = true;
    return `<div class="dd-kicker">Check · two quick questions</div>
      <h3>What did you find?</h3>
      <p class="ms-reveal${right ? ' good' : ''}"><span>${right ? 'Your guess was right' : 'Not what you guessed'}</span>${stop.reveal}</p>
      ${stop.checks.map((c, q) => `<div class="ms-q" data-q="${q}"><h4>${q + 1}. ${c.q}</h4>${opts(c.a, 'data-a')}<p class="ms-why" hidden></p></div>`).join('')}
      <p class="ms-done" id="msScreen" hidden>${ICON('check', 'i sm')}<span>Screen part done. The last step happens at the real robot.</span></p>`;
  }
  function paintChecks() {
    stop.checks.forEach((c, q) => {
      const box = el.querySelector(`.ms-q[data-q="${q}"]`);
      if (!box || !solved[q]) return;
      box.querySelectorAll('.ms-opt').forEach((b, k) => { b.disabled = true; if (k === c.right) b.dataset.res = 'right'; });
      const why = box.querySelector('.ms-why');
      why.hidden = false; why.dataset.tone = 'good'; why.textContent = c.why;
    });
    const all = solved[0] && solved[1], note = $('#msScreen');
    if (note) note.hidden = !all;
  }
  function benchHtml() {
    const r = rec(), b = stop.bench, f = b.record, saved = r.b && !editing;
    const who = people.length
      ? `<label class="ms-field"><span>Who watched you do it?</span><select id="msBy"><option value="">Pick a teammate or a mentor</option>${people.map((n) => `<option${r.b && r.b.by === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}<option${r.b && r.b.by === 'A mentor' ? ' selected' : ''}>A mentor</option></select></label>`
      : `<label class="ms-tick"><input type="checkbox" id="msBy"${r.b ? ' checked' : ''}><span>A teammate or a mentor watched me do it</span></label>`;
    const input = f.pick
      ? `<div class="ms-field"><span>${f.label}</span><div class="ms-picks" id="msPick">${f.pick.map((p) => `<button type="button" class="ms-opt" data-p="${esc(p)}"${r.b && r.b.v === p ? ' data-on="1"' : ''}><span>${esc(p)}</span></button>`).join('')}</div></div>`
      : `<label class="ms-field"><span>${f.label}</span><span class="ms-in"><input id="msVal" type="text" ${f.unit ? 'inputmode="decimal" maxlength="8"' : 'maxlength="40"'} autocomplete="off" placeholder="${esc(f.hint || '')}" value="${esc(r.b ? r.b.v : '')}">${f.unit ? `<i>${esc(f.unit)}</i>` : ''}</span></label>`;
    return `<div class="dd-kicker">Bench · at the real robot</div>
      <h3>${b.title}</h3>
      <p class="dd-big"><span>You need</span>${b.need}</p>
      <ol class="ms-steps">${b.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="ms-safe">${ICON('alert', 'i sm')}<span>${b.safe}</span></p>
      ${saved
        ? `<div class="ms-saved">${ICON('check')}<div><b>${esc(f.label)}: ${esc(r.b.v)}${f.unit ? ` ${esc(f.unit)}` : ''}</b><span>${r.b.by ? `Watched by ${esc(r.b.by)} · ` : ''}${day(r.b.at)}</span></div><button class="btn ghost pill sm" type="button" id="msEdit">Change</button></div>`
        : `<form class="ms-rec" id="msRec" novalidate>${input}${who}<p class="ms-err" id="msErr" role="alert" hidden></p><button class="btn primary pill" type="submit">${ICON('check', 'i sm')}Save it</button></form>
           <p class="ms-hint">Not at the robot right now? Leave this for the next meeting. It waits for you on the Trails page.</p>`}`;
  }

  function foot() {
    const k = BEATS.findIndex(([b]) => b === beat), r = rec();
    const prev = $('#ddPrev'), nx = $('#ddNext');
    prev.disabled = k === 0;
    $('#ddStep').textContent = `${k + 1} / ${BEATS.length}`;
    const label = beat === 'guess' ? 'Play: find out' : beat === 'play' ? 'Check what you found' : beat === 'check' ? 'To the bench' : next ? `Next: ${esc(next.name)}` : 'Back to the trail';
    nx.innerHTML = `<span>${label}</span>${beat === 'bench' && !next ? '' : ICON('arrow', 'i sm')}`;
    nx.disabled = (beat === 'guess' && r.g == null) || (beat === 'check' && !r.c);
    tabs.querySelectorAll('button').forEach((b) => {
      const name = b.dataset.beat;
      b.setAttribute('aria-selected', String(name === beat));
      b.disabled = !open(name);
      b.classList.toggle('is-done', done(name));
    });
  }
  function show(b) {
    if (!open(b)) b = 'guess';
    beat = b;
    editing = false;
    el.dataset.beat = b;
    const body = $('#ddBody');
    body.innerHTML = b === 'guess' ? guessHtml() : b === 'play' ? playBody() : b === 'check' ? checkHtml() : benchHtml();
    body.scrollTop = 0;
    el.scrollTop = 0; // on a phone the whole pop-up scrolls, not the panel
    if (b === 'check') paintChecks();
    foot();
    const sel = tabs.querySelector('[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-beat]'); if (b && !b.disabled) show(b.dataset.beat); });
  $('#ddPrev').addEventListener('click', () => { const k = BEATS.findIndex(([b]) => b === beat); if (k > 0) show(BEATS[k - 1][0]); });
  $('#ddNext').addEventListener('click', () => {
    const k = BEATS.findIndex(([b]) => b === beat);
    if (k < BEATS.length - 1) show(BEATS[k + 1][0]);
    else if (next) reopen(next.id);
    else close();
  });
  $('#ddBody').addEventListener('click', (e) => {
    const g = e.target.closest('[data-g]');
    if (g && beat === 'guess') {
      if (rec().c) return;
      saveStop(id, { g: Number(g.dataset.g) });
      $('#ddBody').querySelectorAll('[data-g]').forEach((b) => { if (b === g) b.dataset.on = '1'; else delete b.dataset.on; });
      foot();
      return;
    }
    const a = e.target.closest('[data-a]');
    if (a && beat === 'check') {
      const box = a.closest('.ms-q'), q = Number(box.dataset.q), c = stop.checks[q];
      if (solved[q]) return;
      if (Number(a.dataset.a) === c.right) {
        solved[q] = true;
        if (solved[0] && solved[1]) saveStop(id, { c: 1, ok: missed.filter((m) => !m).length });
        paintChecks();
        foot();
      } else {
        missed[q] = true;
        a.dataset.res = 'wrong'; a.disabled = true;
        const why = box.querySelector('.ms-why');
        why.hidden = false; why.dataset.tone = ''; why.textContent = 'Not quite. Have another look in Play, then pick again.';
      }
      return;
    }
    const p = e.target.closest('[data-p]');
    if (p) { $('#msPick').querySelectorAll('[data-p]').forEach((b) => { if (b === p) b.dataset.on = '1'; else delete b.dataset.on; }); return; }
    if (e.target.closest('#msEdit')) { editing = true; $('#ddBody').innerHTML = benchHtml(); }
  });
  $('#ddBody').addEventListener('submit', (e) => {
    if (e.target.id !== 'msRec') return;
    e.preventDefault();
    const f = stop.bench.record, err = $('#msErr');
    const picked = f.pick ? $('#msPick').querySelector('[data-on]') : null;
    const v = (f.pick ? (picked ? picked.dataset.p : '') : $('#msVal').value).trim().slice(0, 40);
    const byEl = $('#msBy'), by = people.length ? byEl.value : (byEl.checked ? 'Someone watched' : '');
    const fail = (msg, focus) => { err.textContent = msg; err.hidden = false; if (focus) focus.focus(); };
    if (!v) return fail('Write down what you found first.', f.pick ? null : $('#msVal'));
    if (f.unit && !/^-?\d+([.,]\d+)?$/.test(v)) return fail('That one needs a number.', $('#msVal'));
    if (!by) return fail(people.length ? 'Ask a teammate or a mentor to watch, then pick who it was.' : 'Ask a teammate or a mentor to watch, then tick the box.', byEl);
    saveStop(id, { b: { v: f.unit ? v.replace(',', '.') : v, by, at: Date.now() } });
    editing = false;
    $('#ddBody').innerHTML = benchHtml();
    foot();
  });

  const r = rec();
  show(wanted && BEATS.some(([b]) => b === wanted) ? wanted : r.g == null ? 'guess' : !r.c ? 'play' : !r.b ? 'bench' : 'check');
}
