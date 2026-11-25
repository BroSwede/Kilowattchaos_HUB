// The trail map: what to do next, the robot jobs that are waiting, the five trails with their missions,
// each trail's team test, its side quests, and the bonus trail. Drawn on Learn, Trails in the hub and on
// the public Robot Lab page, so it only uses the shared sprite icons and the classes in dive.css.
import { DIVES } from './index.js';
import { TRAILS, BONUS, BEATS, MISSION_COUNT, STOP_LABEL, progress, stopState, trailState, nextStop, benchWaiting, benchText, saveStop, saveTest, clearProgress } from './trails.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const chapter = (id) => {
  const [k, ch] = id.split(':'), d = DIVES.find((x) => x.key === k), t = d && d.tabs.find(([c]) => c === ch);
  return { topic: d ? d.name : k, tab: t ? t[1] : ch };
};

/**
 * @param {HTMLElement} host
 * @param {object} opts  { mission(id, beat): open a mission, chapter(id): open a plain chapter }
 * @returns {() => void} call it when the page goes away
 */
export function trailMap(host, opts) {
  const first = nextStop();
  const openTrails = new Set([first ? first.trail.id : TRAILS[0].id]);
  const openTests = new Set(), editTests = new Set();
  let sure = false;

  const stopRow = (trail, stop, i) => {
    const s = stopState(stop.id);
    const act = s.done ? ['Look again', 'ghost', ''] : s.checked ? ['Robot job', 'primary', 'bench'] : s.guessed ? ['Carry on', 'primary', ''] : ['Start', 'soft', ''];
    return `<li class="tr-stop${s.done ? ' is-done' : ''}">
      <span class="n">${s.done ? ICON('check', 'i sm') : i + 1}</span>
      <div class="tt"><b>${esc(stop.name)}</b><small>${esc(stop.ask)}</small></div>
      <span class="tr-marks"><span class="st${s.checked ? ' solid' : ''}">${s.checked ? ICON('check', 'i sm') : ''}Screen</span><span class="st${s.bench ? ' volt' : ''}">${s.bench ? `${ICON('check', 'i sm')}${esc(benchText(stop, s.rec))}` : 'Robot'}</span></span>
      <button class="btn ${act[1]} pill sm" type="button" data-mission="${stop.id}" data-beat="${act[2]}" aria-label="${act[0]}: ${esc(stop.name)}">${act[0]}</button>
    </li>`;
  };
  const testBox = (trail, st) => {
    const t = trail.test, saved = st.test, isOpen = openTests.has(trail.id), edit = editTests.has(trail.id) || !saved;
    const form = !isOpen ? '' : `<div class="tr-testbody">
        <ol class="ms-steps">${t.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p class="ms-safe">${ICON('alert', 'i sm')}<span>${t.safe}</span></p>
        ${edit ? `<form class="tr-form" data-testform="${trail.id}" novalidate>
            <div class="tr-fields">${t.fields.map((f, k) => `<label class="ms-field"><span>${esc(f.label)}</span><span class="ms-in"><input type="text" name="f${k}" ${f.unit ? 'inputmode="decimal" maxlength="8"' : 'maxlength="40"'} autocomplete="off" placeholder="${esc(f.hint || '')}" value="${esc(saved ? saved.v[k] || '' : '')}">${f.unit ? `<i>${esc(f.unit)}</i>` : ''}</span></label>`).join('')}</div>
            <p class="ms-err" role="alert" hidden></p>
            <button class="btn primary pill" type="submit">${ICON('check', 'i sm')}Save the results</button>
          </form>`
          : `<dl class="tr-results">${t.fields.map((f, k) => `<div><dt>${esc(f.label)}</dt><dd>${esc(saved.v[k] || '–')}${f.unit && saved.v[k] ? ` ${esc(f.unit)}` : ''}</dd></div>`).join('')}</dl>
             <button class="btn ghost pill sm" type="button" data-testedit="${trail.id}">Change the results</button>`}
      </div>`;
    return `<div class="tr-test${saved ? ' is-done' : ''}">
      <button class="tr-testhead" type="button" data-test="${trail.id}" aria-expanded="${isOpen}">
        <span class="oc">${ICON('trophy', 'i sm')}</span>
        <span class="tt"><b>Team test: ${esc(t.name)}</b><small>${esc(t.ask)}</small></span>
        <span class="st${saved ? ' volt' : ''}">${saved ? `${ICON('check', 'i sm')}Done` : st.screen === st.all ? 'Ready' : 'After the missions'}</span>
      </button>${form}</div>`;
  };
  const chip = (id) => { const c = chapter(id), seen = stopState(id).seen; return `<button class="tr-chip${seen ? ' is-seen' : ''}" type="button" data-chapter="${id}" title="${esc(c.topic)}">${seen ? ICON('check', 'i sm') : ''}${esc(STOP_LABEL[id] || c.tab)}</button>`; };

  function draw() {
    const next = nextStop(), waiting = benchWaiting();
    const all = TRAILS.map((t) => trailState(t));
    const screen = all.reduce((a, s) => a + s.screen, 0), bench = all.reduce((a, s) => a + s.bench, 0);
    const started = screen > 0 || Object.keys(progress().m).length > 0;
    const hero = next
      ? `<div class="eyebrow">${started ? 'Next up' : 'Start here'} · Trail ${next.ti + 1}, mission ${next.i + 1}</div>
         <h3>${esc(next.stop.name)}</h3>
         <p>${esc(next.stop.ask)}</p>
         <button class="btn pill tr-go" type="button" data-mission="${next.stop.id}">${stopState(next.stop.id).guessed ? 'Carry on' : 'Start the mission'}${ICON('arrow', 'i sm')}</button>`
      : `<div class="eyebrow">All ${MISSION_COUNT} missions done on screen</div>
         <h3>${waiting.length ? 'Now finish the robot jobs' : 'Every trail walked'}</h3>
         <p>${waiting.length ? 'The jobs at the robot are what make it stick.' : 'Go back to any mission, or try the side quests and the bonus trail.'}</p>`;
    host.innerHTML = `<div class="trmap">
      <div class="tr-top">
        <section class="tr-now" aria-label="What to do next">
          ${hero}
          <ol class="tr-beats" aria-label="Every mission has four steps">${BEATS.map(([, n], k) => `<li><b>${k + 1}</b>${n}<small>${['Pick an answer first', 'Try it in 3D', 'Two questions', 'One job at the robot'][k]}</small></li>`).join('')}</ol>
          <div class="tr-meter"><span><b>${screen}</b> of ${MISSION_COUNT} on screen</span><span><b>${bench}</b> of ${MISSION_COUNT} at the robot</span></div>
        </section>
        <section class="tr-wait" aria-label="Robot jobs waiting">
          <div class="tr-h"><h4>Robot jobs waiting</h4><span class="tag">${waiting.length}</span></div>
          ${waiting.length ? `<p class="cap">Bring these to the next meeting. Each takes about ten minutes at the robot.</p>
            <div class="tr-jobs">${waiting.slice(0, 6).map((w) => `<button class="tr-job" type="button" data-mission="${w.stop.id}" data-beat="bench"><span class="oc">${ICON('wrench', 'i sm')}</span><span class="tt"><b>${esc(w.stop.bench.title)}</b><small>${esc(w.stop.name)} · Trail ${w.ti + 1}</small></span>${ICON('arrow', 'i sm')}</button>`).join('')}</div>
            ${waiting.length > 6 ? `<p class="cap">And ${waiting.length - 6} more in the trails below.</p>` : ''}`
            : '<p class="tr-none">Finish a mission on screen and its job at the robot shows up here, ready for the next meeting.</p>'}
          <div class="tr-tests">
            <span class="cap">Team tests · ${all.filter((s) => s.test).length} of ${TRAILS.length} done. One closes each trail, with the whole team at the robot.</span>
            <div class="tr-chips">${TRAILS.map((t, ti) => `<button class="tr-chip${all[ti].test ? ' is-seen' : ''}" type="button" data-gotest="${t.id}">${ICON(all[ti].test ? 'check' : 'trophy', 'i sm')}${esc(t.test.name)}</button>`).join('')}</div>
          </div>
        </section>
      </div>
      <ol class="tr-list">${TRAILS.map((trail, ti) => {
        const st = all[ti], isOpen = openTrails.has(trail.id);
        return `<li class="tr-trail${isOpen ? ' is-open' : ''}${st.done ? ' is-done' : ''}" style="--c:var(--sys-${trail.sys})">
          <button class="tr-head" type="button" data-trail="${trail.id}" aria-expanded="${isOpen}">
            <span class="tr-n">${st.done ? ICON('check') : ti + 1}</span>
            <span class="tt"><b>${esc(trail.name)}</b><small>${esc(trail.ask)}</small></span>
            <span class="tr-pips" role="img" aria-label="${st.screen} of ${st.all} missions done on screen, ${st.bench} at the robot">${trail.stops.map((s) => { const x = stopState(s.id); return `<i class="${x.checked ? 's' : ''}${x.bench ? ' b' : ''}"></i>`; }).join('')}</span>
            <svg class="i sm tr-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          ${isOpen ? `<div class="tr-body">
            <p class="tr-goal"><span>At the end</span>${esc(trail.goal)}</p>
            <ol class="tr-stops">${trail.stops.map((s, i) => stopRow(trail, s, i)).join('')}</ol>
            ${testBox(trail, st)}
            <div class="tr-side"><span class="cap">Side quests: more to open up on this trail</span><div class="tr-chips">${trail.side.map(chip).join('')}</div></div>
          </div>` : ''}
        </li>`;
      }).join('')}</ol>
      <section class="tr-bonus">
        <div class="tr-h"><span class="oc">${ICON('sparkle', 'i sm')}</span><div class="tt"><h4>Bonus trail: ${esc(BONUS.name)}</h4><small>${esc(BONUS.ask)}</small></div></div>
        <div class="tr-chips">${BONUS.stops.map(chip).join('')}</div>
      </section>
      <p class="tr-foot cap">Your trail progress is kept on this device.${started ? ` <button class="tr-clear" type="button" data-clear="${sure ? 'yes' : 'ask'}">${sure ? 'Tap again to wipe it' : 'Start over'}</button>` : ''}</p>
    </div>`;
  }

  const onClick = (e) => {
    const m = e.target.closest('[data-mission]');
    if (m) { opts.mission(m.dataset.mission, m.dataset.beat || undefined); return; }
    const c = e.target.closest('[data-chapter]');
    if (c) { opts.chapter(c.dataset.chapter); if (!stopState(c.dataset.chapter).seen) saveStop(c.dataset.chapter, { seen: 1 }); return; }
    const t = e.target.closest('[data-trail]');
    if (t) { const id = t.dataset.trail; if (openTrails.has(id)) openTrails.delete(id); else openTrails.add(id); draw(); host.querySelector(`[data-trail="${id}"]`).focus({ preventScroll: true }); return; }
    const tt = e.target.closest('[data-test]');
    if (tt) { const id = tt.dataset.test; if (openTests.has(id)) openTests.delete(id); else openTests.add(id); draw(); host.querySelector(`[data-test="${id}"]`).focus({ preventScroll: true }); return; }
    const gt = e.target.closest('[data-gotest]');
    if (gt) {
      const id = gt.dataset.gotest;
      openTrails.add(id); openTests.add(id); draw();
      const head = host.querySelector(`[data-test="${id}"]`);
      head.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      head.focus({ preventScroll: true });
      return;
    }
    const te = e.target.closest('[data-testedit]');
    if (te) { editTests.add(te.dataset.testedit); draw(); return; }
    const cl = e.target.closest('[data-clear]');
    if (cl) { if (cl.dataset.clear === 'yes') { sure = false; clearProgress(); } else { sure = true; draw(); host.querySelector('[data-clear]').focus({ preventScroll: true }); } }
  };
  const onSubmit = (e) => {
    const f = e.target.closest('[data-testform]');
    if (!f) return;
    e.preventDefault();
    const trail = TRAILS.find((t) => t.id === f.dataset.testform), err = f.querySelector('.ms-err');
    const v = trail.test.fields.map((fd, k) => f.elements[`f${k}`].value.trim().slice(0, 40));
    const bad = trail.test.fields.findIndex((fd, k) => !v[k] || (fd.unit && !/^-?\d+([.,]\d+)?$/.test(v[k])));
    if (bad >= 0) { err.textContent = v[bad] ? `"${trail.test.fields[bad].label}" needs a number.` : 'Fill in every box first.'; err.hidden = false; f.elements[`f${bad}`].focus(); return; }
    editTests.delete(trail.id);
    saveTest(trail.id, { v: v.map((x, k) => (trail.test.fields[k].unit ? x.replace(',', '.') : x)), at: Date.now() });
  };
  const onChange = () => draw();
  host.addEventListener('click', onClick);
  host.addEventListener('submit', onSubmit);
  document.addEventListener('trails:change', onChange);
  draw();
  return () => { host.removeEventListener('click', onClick); host.removeEventListener('submit', onSubmit); document.removeEventListener('trails:change', onChange); };
}
