// Robot zone: 3D Explorer (the Home viewer at full size), Versions, Subsystems, Specs and parts, AR and VR.
// Versions, subsystem stages and part issues are saved in the team database. Parts data is the real StarterBot CAD.
import { $, $$, esc, fmt, icon, tag, strip, av, avStack, dot, seg, wireSeg, drawer, closeDrawer, KIDS } from './common.js';
import { api, isMentor, me } from '../api.js';

export const STAGES = ['Idea', 'Prototype', 'Iterate', 'Competition-ready'];
const SYS_KEYS = ['launcher', 'ballpath', 'intake', 'drivetrain', 'structure', 'power', 'hardware'];
// Code files from the team's starter code (Code zone).
const CODE = { launcher: ['subsystems/Launcher.java'], ballpath: ['subsystems/BallPath.java'], intake: ['subsystems/Intake.java'], drivetrain: ['opmodes/DriveTeleOp.java', 'opmodes/AutoDriveForward.java'] };
// Each subsystem's stage is set by a mentor (saved as one `version` record of type "stage").
// Owners come from the roster: a mentor picks each student's subsystem in the mentor console.
export const SUBSYS = Object.fromEntries(SYS_KEYS.map((k) => [k, {
  status: 1,
  code: CODE[k] || [],
  get owners() { return KIDS.filter((x) => (x.subs || []).includes(k)).map((x) => x.n); },
}]));
let stageRec = null;
async function loadStages() {
  const all = await api.list('version');
  stageRec = all.find((r) => r.data && r.data.type === 'stage') || null;
  const st = (stageRec && stageRec.data.stages) || {};
  for (const k of SYS_KEYS) if (Number.isInteger(st[k])) SUBSYS[k].status = st[k];
  return all;
}
export const stagesReady = loadStages().catch(() => []);

// ---------------------------------------------------------------- Small shared helpers
const day = (s) => { if (!s) return ''; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00` : s); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40);
const empty = (html) => `<div class="live-empty">${html}</div>`;
const fail = (ctx, err) => ctx.toast(err && err.message ? err.message : 'That did not save. Try again.');

function partsBySys(parts, sys) {
  const by = new Map();
  for (const p of Object.values(parts.parts)) {
    if (sys && p[1] !== sys) continue;
    const e = by.get(p[2]) || { name: p[2], sys: p[1], n: 0, skus: new Map(), size: p.slice(3) };
    e.n++;
    e.skus.set(p[0], (e.skus.get(p[0]) || 0) + 1);
    by.set(p[2], e);
  }
  return [...by.values()].sort((a, b) => b.n - a.n);
}
const loading = (what) => `<div class="card"><p class="lead">${icon('clock', 'i sm')} Loading ${what} from the StarterBot parts list…</p></div>`;

// ---------------------------------------------------------------- Part issues (shared by Subsystems and Specs)
// An `issue` record is { part, sys, text, status: 'open' | 'fixed', fixedBy, fixedAt }. Anyone can report or fix one.
function issueRow(r) {
  const d = r.data, open = d.status !== 'fixed';
  return `<div class="it lb-issue${open ? '' : ' fixed'}" data-iid="${esc(r.id)}"><span class="oc2">${icon(open ? 'alert' : 'check', 'i sm')}</span>
    <div class="grow"><div class="t">${esc(d.text || '')}</div><div class="meta">${esc(d.part || 'Whole subsystem')} · ${av(r.author, 16)} ${esc(r.author)} · ${day(r.created_at)}${open ? '' : ` · fixed${d.fixedBy ? ` by ${esc(d.fixedBy)}` : ''}${d.fixedAt ? ` ${day(d.fixedAt)}` : ''}`}</div></div>
    <button class="btn ${open ? 'soft' : 'ghost'} pill sm" type="button" data-fix="${esc(r.id)}">${open ? `${icon('check', 'i sm')}Mark fixed` : 'Reopen'}</button></div>`;
}
async function toggleFix(ctx, issues, id) {
  const r = issues.find((x) => x.id === id);
  if (!r) return false;
  const fixing = r.data.status !== 'fixed';
  const patch = fixing ? { status: 'fixed', fixedBy: me(), fixedAt: new Date().toISOString() } : { status: 'open', fixedBy: '', fixedAt: '' };
  try { const u = await api.update('issue', id, patch); r.data = u.data; ctx.toast(fixing ? 'Marked fixed. Nice work.' : 'Reopened.'); return true; }
  catch (err) { fail(ctx, err); return false; }
}
// Drawer: the issues on one part (or one subsystem), plus a form to report a new one.
function issueDrawer(ctx, { part, sys, issues, partNames, onChange }) {
  const { SYS } = ctx;
  const mine = () => issues.filter((r) => (part ? r.data.part === part : r.data.sys === sys)).sort((a, b) => (a.data.status === 'fixed') - (b.data.status === 'fixed'));
  const el = drawer(`<div class="row wrap">${dot(SYS[sys] ? SYS[sys].c : 'var(--stone)', 8)}<span class="cap">${esc(SYS[sys] ? SYS[sys].name : 'Robot')}</span></div>
    <h3>${part ? esc(part) : `${esc(SYS[sys].name)} issues`}</h3>
    <p class="lead">Something loose, broken or not working right? Write what you saw. Anyone can mark it fixed once it is.</p>
    <div class="items" id="isList"></div>
    <h4>Report an issue</h4>
    ${part ? '' : `<label class="field"><span>Which part?</span><select class="inp" id="isPart"><option value="">The whole subsystem</option>${(partNames || []).map((n) => `<option>${esc(n)}</option>`).join('')}</select></label>`}
    <label class="field"><span>What is wrong?</span><textarea class="inp" id="isText" maxlength="400" placeholder="It wiggles loose after a few minutes of driving"></textarea></label>
    <div class="row" style="justify-content:flex-end"><button class="btn primary pill" type="button" id="isGo">${icon('flag', 'i sm')}Report it</button></div>`, { label: part || 'Issues', wide: false });
  const draw = () => { const l = mine(); $('#isList', el).innerHTML = l.length ? l.map(issueRow).join('') : empty('No issues reported here. Good news!'); };
  draw();
  $('#isList', el).addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fix]'); if (!b) return;
    b.disabled = true;
    if (await toggleFix(ctx, issues, b.dataset.fix)) { draw(); onChange(); } else b.disabled = false;
  });
  $('#isGo', el).addEventListener('click', async (e) => {
    const text = $('#isText', el).value.trim();
    if (!text) { $('#isText', el).focus(); ctx.toast('Write what is wrong first.'); return; }
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const rec = await api.create('issue', { part: part || ($('#isPart', el) ? $('#isPart', el).value : ''), sys, text, status: 'open' });
      issues.unshift(rec);
      $('#isText', el).value = '';
      draw(); onChange();
      ctx.toast('Reported. The whole team can see it now.');
    } catch (err) { fail(ctx, err); }
    btn.disabled = false;
  });
  return el;
}

// ---------------------------------------------------------------- 3D Explorer
function explorer(view) {
  view.innerHTML = `<div class="robot-note">${icon('bot')}<span><b>3D Explorer preview.</b> This is the Home robot at full size. Phase 3 (January 4 to 22) adds the section cut, a measure tool, pins and live motion.</span></div>`;
}

// ---------------------------------------------------------------- Versions
// v0 is built in: the real StarterBot model in the 3D view. Every later version is a `version` record a mentor adds:
// { name, date, notes, added: [lines], changed: [lines], removed: [lines] }.
const V0 = { id: 'v0', name: 'StarterBot kit', date: '', who: null, notes: "The goBILDA StarterBot straight from goBILDA's STEP file, 418 parts at full CAD detail. This is the robot in the 3D view.", added: [], changed: [], removed: [], real: true };
function versions(view, ctx) {
  let cur = 'v0', list = [V0], alive = true, timer = 0, editing = null;
  const mentor = isMentor();
  view.innerHTML = `<div class="zv">
    ${strip('Every time the robot changes, a mentor adds a version here with a note and what changed. v0 is the StarterBot kit, the robot in the 3D view.', [tag('Team versions', 'volt')], mentor ? `<button class="btn primary pill" type="button" id="vAdd">${icon('plus', 'i sm')}Add a version</button>` : '')}
    <article class="card" id="vForm" hidden></article>
    <article class="card">
      <div class="card-head"><h3 class="card-title">Robot timeline</h3><span class="tag" id="vCount">1 version</span></div>
      <div class="vrail" id="vrail"></div>
      <div id="vEmpty"></div>
    </article>
    <article class="card c7" id="vDetail"></article>
    <article class="card c5">
      <div class="card-head"><h3 class="card-title">Season time-lapse</h3></div>
      <p class="lead">Scrub through the season and watch the robot change, version by version.</p>
      <div class="scrub"><button class="icon-btn" type="button" id="vPlay" aria-label="Play the time-lapse">${icon('play')}</button><input type="range" id="vScrub" min="0" max="0" step="1" value="0" aria-label="Version" style="--fill:0%"></div>
      <div class="row between"><span class="cap">v0 · kit</span><span class="cap" id="vScrubLbl">v0 · StarterBot kit</span><span class="cap" id="vLast">v0</span></div>
      <hr class="hr">
      <h4 class="sub">How a version gets here</h4>
      <ol class="bul"><li>The team changes the robot and tests it.</li><li>A mentor adds a version, like "Gecko wheels closer", with what was added, changed and removed.</li><li>It shows up here for the whole team, and in the portfolio story of the season.</li></ol>
    </article>
  </div>`;
  const vname = (v, i) => `v${i} · ${v.name}`;
  const idx = () => list.findIndex((x) => x.id === cur);
  const rail = () => {
    $('#vCount').textContent = `${list.length} version${list.length === 1 ? '' : 's'}`;
    $('#vrail').innerHTML = list.map((v, i) => `<button class="vnode" type="button" data-v="${esc(v.id)}" aria-pressed="${v.id === cur}">
        <span class="vthumb">${v.real ? '<img src="/hub/assets/poster.webp" alt="" decoding="async">' : icon(['focus', 'layers', 'sliders', 'wrench'][i % 4], 'i lg')}${v.real ? '<span class="vbadge"><span class="st solid">In the 3D view</span></span>' : ''}</span>
        <span class="vn">${esc(vname(v, i))}</span>
        <span class="meta">${v.who ? `${av(v.who, 18)} ${esc(v.who)} · ` : ''}${v.real ? 'The kit' : esc(day(v.date))}</span>
        <span class="chg"><span><i class="c-add"></i>${v.added.length} added</span><span><i class="c-chg"></i>${v.changed.length} changed</span>${v.removed.length ? `<span><i class="c-del"></i>${v.removed.length} removed</span>` : ''}</span>
      </button>`).join('');
    $('#vEmpty').innerHTML = list.length > 1 ? '' : empty(mentor ? 'No team versions yet. When the robot changes, tap <b>Add a version</b> and write what changed.' : 'No team versions yet. When the team changes the robot, a mentor adds the next version here.');
    const sc = $('#vScrub'); sc.max = list.length - 1;
    $('#vLast').textContent = `v${list.length - 1}`;
  };
  const detail = () => {
    const i = idx(), v = list[i], prev = list[i - 1];
    const sec = (k, cls, lbl) => v[k].map((t) => `<div class="it"><span class="oc2"><i class="${cls}" style="width:12px;height:12px;border-radius:50%;display:block"></i></span><div class="grow"><div class="t">${esc(t)}</div></div><span class="st">${lbl}</span></div>`).join('');
    $('#vDetail').innerHTML = `<div class="card-head"><h3 class="card-title">${esc(vname(v, i))}</h3>${v.real ? tag('The real model', 'volt') : `<span class="cap">${esc(day(v.date))}</span>`}</div>
      <p>${esc(v.notes || 'No notes yet.')}</p>
      ${v.real ? `<div class="kpis"><div class="kpi"><div class="lab">Parts</div><div class="val">418</div></div><div class="kpi"><div class="lab">Triangles</div><div class="val">28.1M</div></div><div class="kpi"><div class="lab">On the wire</div><div class="val">143<small>MB</small></div></div></div>
        <div class="row wrap"><button class="btn primary pill" type="button" data-act="open3d">${icon('bot', 'i sm')}Open in 3D</button><span class="cap">The original file from your XR twin replaces this copy as v0 once you share it.</span></div>`
      : `<h4 class="sub">Compared with v${i - 1}${prev ? ` · ${esc(prev.name)}` : ''}</h4>
        ${v.added.length + v.changed.length + v.removed.length ? `<div class="items">${sec('added', 'c-add', 'Added')}${sec('changed', 'c-chg', 'Changed')}${sec('removed', 'c-del', 'Removed')}</div>` : empty('No part changes written down for this version.')}
        <div class="row wrap"><span class="cap">${v.who ? `Added by ${esc(v.who)}` : ''}</span>${mentor ? `<span style="margin-left:auto"></span><button class="btn ghost pill sm" type="button" data-act="edit">${icon('note', 'i sm')}Edit</button><button class="btn ghost pill sm" type="button" data-act="del">${icon('x', 'i sm')}Remove</button>` : ''}</div>`}`;
  };
  const pick = (id) => {
    cur = id;
    $$('.vnode', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cur)));
    const i = Math.max(0, idx()), sc = $('#vScrub');
    sc.value = i; sc.style.setProperty('--fill', `${list.length > 1 ? (i / (list.length - 1)) * 100 : 0}%`);
    $('#vScrubLbl').textContent = vname(list[i], i);
    detail();
  };
  const fromRec = (r) => ({ id: r.id, name: r.data.name || 'Untitled', date: r.data.date || r.created_at.slice(0, 10), who: r.author, notes: r.data.notes || '', added: r.data.added || [], changed: r.data.changed || [], removed: r.data.removed || [], rec: r });
  const setList = (recs) => {
    const vs = recs.filter((r) => r.data && r.data.type !== 'stage').map(fromRec).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.rec.created_at < b.rec.created_at ? -1 : 1));
    list = [V0, ...vs];
    if (!list.some((x) => x.id === cur)) cur = 'v0';
    rail(); pick(cur);
  };
  rail(); pick('v0');
  let allRecs = [];
  api.list('version').then((recs) => { allRecs = recs; if (alive) setList(recs); }).catch((err) => { if (alive) fail(ctx, err); });

  const form = $('#vForm');
  const openForm = (v) => {
    editing = v || null;
    form.hidden = false;
    form.innerHTML = `<div class="card-head"><h3 class="card-title">${v ? 'Edit version' : 'Add a version'}</h3><button class="icon-btn sm" type="button" id="vfX" aria-label="Close">${icon('x')}</button></div>
      <div class="form-grid">
        <label class="field"><span>Name</span><input class="inp" id="vfName" maxlength="60" placeholder="Gecko wheels closer" value="${v ? esc(v.name) : ''}"></label>
        <label class="field"><span>Date</span><input class="inp" type="date" id="vfDate" value="${esc(v ? v.date : today())}"></label>
        <label class="field full"><span>Notes</span><textarea class="inp" id="vfNotes" maxlength="800" placeholder="What changed and why">${v ? esc(v.notes) : ''}</textarea></label>
        <label class="field"><span>Added <small>(one per line)</small></span><textarea class="inp" id="vfAdd" placeholder="Gate arm (printed)">${v ? esc(v.added.join('\n')) : ''}</textarea></label>
        <label class="field"><span>Changed <small>(one per line)</small></span><textarea class="inp" id="vfChg" placeholder="48mm Gecko Wheel ×7, moved 6 mm in">${v ? esc(v.changed.join('\n')) : ''}</textarea></label>
        <label class="field full"><span>Removed <small>(one per line)</small></span><textarea class="inp" id="vfDel" placeholder="Standoff / Spacer">${v ? esc(v.removed.join('\n')) : ''}</textarea></label>
      </div>
      <div class="card-foot"><span class="cap">Everyone on the team can see versions. Only mentors add or change them.</span><button class="btn primary pill" type="button" id="vfGo">${v ? 'Save changes' : 'Add version'}</button></div>`;
    $('#vfX').addEventListener('click', () => { form.hidden = true; });
    $('#vfName').focus();
    $('#vfGo').addEventListener('click', async (e) => {
      const name = $('#vfName').value.trim();
      if (!name) { $('#vfName').focus(); ctx.toast('Give the version a short name.'); return; }
      const data = { name, date: $('#vfDate').value || today(), notes: $('#vfNotes').value.trim(), added: lines($('#vfAdd').value), changed: lines($('#vfChg').value), removed: lines($('#vfDel').value) };
      const btn = e.currentTarget; btn.disabled = true;
      try {
        if (editing) { const u = await api.update('version', editing.id, data); Object.assign(editing.rec, { data: u.data }); cur = editing.id; }
        else { const r = await api.create('version', data); cur = r.id; allRecs.push(r); }
        form.hidden = true;
        setList(allRecs);
        ctx.toast(editing ? 'Saved.' : `Added ${name}. The team can see it now.`);
      } catch (err) { fail(ctx, err); btn.disabled = false; }
    });
  };
  const add = $('#vAdd'); if (add) add.addEventListener('click', () => { if (!form.hidden && !editing) { form.hidden = true; return; } openForm(null); });

  $('#vrail').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) pick(b.dataset.v); });
  $('#vScrub').addEventListener('input', (e) => pick(list[+e.target.value].id));
  $('#vPlay').addEventListener('click', () => {
    clearInterval(timer);
    let i = 0; pick(list[0].id);
    timer = setInterval(() => { i++; if (i >= list.length) { clearInterval(timer); return; } pick(list[i].id); }, ctx.reduced ? 300 : 900);
  });
  view.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const v = list[idx()];
    if (a.dataset.act === 'open3d') ctx.go('robot', '3D Explorer');
    if (a.dataset.act === 'edit') { openForm(v); form.scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' }); }
    if (a.dataset.act === 'del') {
      if (!confirm(`Remove ${v.name}? This can't be undone.`)) return;
      try { await api.remove('version', v.id); allRecs = allRecs.filter((r) => r.id !== v.id); cur = 'v0'; setList(allRecs); ctx.toast('Removed.'); }
      catch (err) { fail(ctx, err); }
    }
  });
  return () => { alive = false; clearInterval(timer); };
}

// ---------------------------------------------------------------- Subsystems
function subsystems(view, ctx) {
  const parts = ctx.parts();
  if (!parts) { view.innerHTML = loading('subsystems'); return ctx.whenParts(() => ctx.rerender()); }
  const { SYS, SYS_ORDER } = ctx;
  const mentor = isMentor();
  let cur = ctx.state.sys || 'intake', issues = [], prints = [], alive = true;
  const counts = {};
  for (const p of Object.values(parts.parts)) counts[p[1]] = (counts[p[1]] || 0) + 1;
  const blurb = (k) => (parts.systems.find((s) => s.id === k) || {}).blurb || '';
  const openN = (k) => issues.filter((r) => r.data.sys === k && r.data.status !== 'fixed').length;
  const printN = (k) => prints.filter((r) => r.data.sys === k && r.data.status !== 'failed').length;
  view.innerHTML = `<div class="zv">
    ${strip('One page per subsystem: who owns it, how far along it is, its parts, open issues, prints and code. Part counts and descriptions come from the real CAD. Owners come from the team roster.', [tag('Team data', 'volt')])}
    <div class="c5 stack-v" style="gap:16px">
      <article class="card">
        <div class="card-head"><h3 class="card-title">Status board</h3>${mentor ? '<span class="cap">Set each stage on its page</span>' : ''}</div>
        <div class="board" id="sysBoard"></div>
      </article>
      <article class="card"><div class="items" id="sysList"></div></article>
    </div>
    <article class="card c7" id="sysDetail"></article>
  </div>`;
  const side = () => {
    $('#sysBoard').innerHTML = STAGES.map((s, i) => `<div class="col"><h5>${s}</h5>${SYS_ORDER.filter((k) => SUBSYS[k].status === i).map((k) => `<button class="sbtn" type="button" data-pick="${k}" aria-pressed="${k === cur}">${dot(SYS[k].c, 8)}${SYS[k].name}</button>`).join('')}</div>`).join('');
    $('#sysList').innerHTML = SYS_ORDER.map((k) => { const o = SUBSYS[k].owners, n = openN(k); return `<button class="it" type="button" data-pick="${k}" aria-pressed="${k === cur}"><span class="oc2">${dot(SYS[k].c, 12)}</span><div class="grow"><div class="t">${SYS[k].name}</div><div class="meta">${STAGES[SUBSYS[k].status]} · ${counts[k] || 0} parts${n ? ` · ${n} open issue${n === 1 ? '' : 's'}` : ''}</div></div><span class="end">${o.length ? avStack(o, 24) : ''}</span></button>`; }).join('');
  };
  const draw = () => {
    const k = cur, s = SUBSYS[k], top = partsBySys(parts, k).slice(0, 6), owners = s.owners;
    const mine = issues.filter((r) => r.data.sys === k).sort((a, b) => (a.data.status === 'fixed') - (b.data.status === 'fixed'));
    const open = mine.filter((r) => r.data.status !== 'fixed'), fixed = mine.filter((r) => r.data.status === 'fixed').slice(0, 3);
    $('#sysDetail').innerHTML = `<div class="sys-head"><span class="big-dot" style="--c:${SYS[k].c}"></span><h3>${SYS[k].name}</h3><span class="st solid">${STAGES[s.status]}</span></div>
      <p>${esc(blurb(k))}</p>
      <div class="stages" aria-label="Stage: ${STAGES[s.status]}">${STAGES.map((st, i) => `<span class="${i < s.status ? 'on' : i === s.status ? 'on cur' : ''}">${st}</span>`).join('')}</div>
      ${mentor ? `<label class="row wrap lb-stage"><span class="cap">Set the stage</span><select class="inp" id="sysStage">${STAGES.map((st, i) => `<option value="${i}"${i === s.status ? ' selected' : ''}>${st}</option>`).join('')}</select></label>` : ''}
      <div class="kpis"><div class="kpi"><div class="lab">Parts</div><div class="val">${counts[k] || 0}</div></div><div class="kpi"><div class="lab">Open issues</div><div class="val">${open.length}</div></div><div class="kpi"><div class="lab">Prints</div><div class="val">${printN(k)}</div></div><div class="kpi"><div class="lab">Code files</div><div class="val">${s.code.length}</div></div></div>
      <div class="row wrap"><span class="cap">Owners</span>${owners.length ? owners.map((n) => `<span class="st">${av(n, 18)}${esc(n)}</span>`).join('') : `<span class="cap" style="font-weight:400">No owner yet.${mentor ? ' Pick a subsystem for each student in the <a href="/mentor">mentor console</a>.' : ' A mentor picks owners.'}</span>`}</div>
      <h4 class="sub">Open issues</h4>
      <div class="items" id="sysIssues">${open.length ? open.map(issueRow).join('') : empty('No open issues. If something breaks or wiggles loose, report it so the team can fix it.')}${fixed.map(issueRow).join('')}</div>
      <div class="row wrap"><button class="btn soft pill sm" type="button" data-report="1">${icon('flag', 'i sm')}Report an issue</button></div>
      <h4 class="sub">Main parts <span class="muted" style="font-weight:400">· from the CAD</span></h4>
      <div class="items">${top.map((p) => `<div class="it"><div class="grow"><div class="t">${esc(p.name)} <span class="muted">×${p.n}</span></div><div class="meta">${esc((parts.notes || {})[p.name] || '')}</div></div><button class="btn ghost pill sm" type="button" data-part="${esc(p.name)}">Show</button></div>`).join('')}</div>
      ${s.code.length ? `<h4 class="sub">Code</h4><div class="row wrap">${s.code.map((c) => `<button class="btn soft pill sm" type="button" data-code="${c}">${icon('code', 'i sm')}<span class="mono" style="font-size:12px">${c}</span></button>`).join('')}</div>` : ''}
      <div class="row wrap" style="margin-top:4px"><button class="btn primary pill" type="button" data-see="${k}">${icon('focus', 'i sm')}See it in 3D</button><button class="btn ghost pill" type="button" data-ideas="1">${icon('bulb', 'i sm')}Ideas for ${SYS[k].name.toLowerCase()}</button></div>`;
    const sel = $('#sysStage');
    if (sel) sel.addEventListener('change', async () => {
      const prev = s.status, v = +sel.value;
      s.status = v; side(); draw();
      const stages = Object.fromEntries(SYS_KEYS.map((x) => [x, SUBSYS[x].status]));
      try {
        if (stageRec) stageRec = { ...stageRec, data: (await api.update('version', stageRec.id, { stages })).data };
        else stageRec = await api.create('version', { type: 'stage', stages });
        ctx.toast(`${SYS[k].name} is now at ${STAGES[v]}.`);
      } catch (err) { s.status = prev; side(); draw(); fail(ctx, err); }
    });
  };
  side(); draw();
  Promise.all([loadStages(), api.list('issue'), api.list('print')]).then(([, is, ps]) => { if (!alive) return; issues = is; prints = ps; side(); draw(); }).catch((err) => { if (alive) fail(ctx, err); });
  view.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-pick]');
    if (p) {
      cur = p.dataset.pick; ctx.state.sys = cur;
      $$('[data-pick]', view).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pick === cur)));
      draw();
      if (matchMedia('(max-width: 1099px)').matches) $('#sysDetail').scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const fx = e.target.closest('[data-fix]');
    if (fx) { fx.disabled = true; if (await toggleFix(ctx, issues, fx.dataset.fix)) { side(); draw(); } else fx.disabled = false; return; }
    if (e.target.closest('[data-report]')) { issueDrawer(ctx, { sys: cur, issues, partNames: partsBySys(parts, cur).map((x) => x.name), onChange: () => { side(); draw(); } }); return; }
    const see = e.target.closest('[data-see]'); if (see) { ctx.focusSystem(see.dataset.see); return; }
    const part = e.target.closest('[data-part]'); if (part) { ctx.focusPart(part.dataset.part); return; }
    const code = e.target.closest('[data-code]'); if (code) { ctx.state.file = code.dataset.code; ctx.go('code', 'Our code'); return; }
    if (e.target.closest('[data-ideas]')) { ctx.state.ideaSys = cur; ctx.go('build', 'Ideas'); }
  });
  return () => { alive = false; closeDrawer(); };
}

// ---------------------------------------------------------------- Specs and parts (real bill of materials)
// Spares come from the team's `inventory` records (Build > Parts and inventory), matched by part name.
function specs(view, ctx) {
  const parts = ctx.parts();
  if (!parts) { view.innerHTML = loading('the bill of materials'); return ctx.whenParts(() => ctx.rerender()); }
  const { SYS, SYS_ORDER } = ctx;
  const rows = partsBySys(parts).sort((a, b) => SYS_ORDER.indexOf(a.sys) - SYS_ORDER.indexOf(b.sys) || b.n - a.n);
  const skus = new Set(Object.values(parts.parts).map((p) => p[0]));
  let filt = '', q = '', issues = [], spares = null, alive = true;
  view.innerHTML = `<div class="zv">
    ${strip('The bill of materials, straight from the StarterBot CAD: every part, its goBILDA part number, how many are on the robot and where. Spares come from the team stock in Build, and anyone can report an issue on a part.', [tag('Real parts list', 'volt')])}
    <article class="card">
      <div class="kpis"><div class="kpi"><div class="lab">Parts</div><div class="val">${fmt(Object.keys(parts.parts).length)}</div></div><div class="kpi"><div class="lab">Kinds of part</div><div class="val">${rows.length}</div></div><div class="kpi"><div class="lab">Part numbers</div><div class="val">${skus.size}</div></div><div class="kpi"><div class="lab">Size</div><div class="val">45.2 × 45.2 × 30.9<small>cm</small></div></div><div class="kpi"><div class="lab">Open issues</div><div class="val" id="bomIss">0</div></div></div>
      <p class="cap" style="font-weight:400">Weight and cost fill in from goBILDA's catalog once each part number is matched. The CAD export doesn't carry them.</p>
    </article>
    <article class="card">
      <div class="tools"><div class="chips" id="bomF"><button class="chip" type="button" data-f="" aria-pressed="true">All</button>${SYS_ORDER.map((k) => `<button class="chip" type="button" data-f="${k}" aria-pressed="false">${dot(SYS[k].c, 8)}${SYS[k].name}</button>`).join('')}<button class="chip" type="button" data-f="issues" aria-pressed="false">${icon('alert', 'i sm')}Has issues</button></div><input class="inp" type="search" id="bomQ" placeholder="Search parts or part numbers" aria-label="Search parts"></div>
      <div class="tbl" id="bom"></div>
    </article>
  </div>`;
  const openOn = (name) => issues.filter((r) => r.data.part === name && r.data.status !== 'fixed').length;
  const draw = () => {
    const ql = q.trim().toLowerCase();
    $('#bomIss').textContent = issues.filter((r) => r.data.status !== 'fixed').length;
    const list = rows.filter((r) => (!filt || (filt === 'issues' ? openOn(r.name) > 0 : r.sys === filt)) && (!ql || r.name.toLowerCase().includes(ql) || [...r.skus.keys()].some((s) => s.includes(ql))));
    const total = list.reduce((a, r) => a + r.n, 0);
    $('#bom').innerHTML = `<div class="tr th"><span>Part</span><span>Part number</span><span style="text-align:right">On robot</span><span>Subsystem</span><span>Spares</span><span></span></div>`
      + list.map((r) => {
        const sk = [...r.skus.entries()].sort((a, b) => b[1] - a[1]);
        const sp = spares ? spares.get(r.name.toLowerCase()) : undefined, n = openOn(r.name);
        return `<div class="tr"><span><span class="nm">${esc(r.name)}</span><span class="nt">${esc((parts.notes || {})[r.name] || '')}</span></span>
          <span class="sku">${sk.length > 1 ? `<details><summary>${sk[0][0]} <span class="muted">+${sk.length - 1} more</span></summary><span class="skulist">${sk.map(([s, c]) => `<span>${s} ×${c}</span>`).join('')}</span></details>` : sk[0][0]}</span>
          <span class="q">${r.n}</span>
          <span class="sy row" style="gap:6px">${dot(SYS[r.sys].c, 8)}${SYS[r.sys].name}</span>
          <span class="sp${sp === 0 ? ' low' : ''}">${sp === undefined ? '<span class="muted">Not counted</span>' : sp === 0 ? 'None left' : `${sp} spare${sp === 1 ? '' : 's'}`}</span>
          <span class="go lb-go"><button class="btn ghost pill sm" type="button" data-part="${esc(r.name)}">${icon('focus', 'i sm')}Show</button><button class="btn ${n ? 'soft lb-hot' : 'ghost'} pill sm" type="button" data-iss="${esc(r.name)}" data-sys="${r.sys}" aria-label="${n ? `${n} open issue${n === 1 ? '' : 's'} on ${esc(r.name)}` : `Report an issue on ${esc(r.name)}`}">${icon(n ? 'alert' : 'flag', 'i sm')}${n ? `${n} open` : 'Issue'}</button></span></div>`;
      }).join('')
      + (list.length ? `<div class="tr" style="font-weight:500"><span>${list.length} kinds shown</span><span></span><span class="q">${total}</span><span></span><span></span><span></span></div>` : `<p class="lead" style="padding:14px 4px">${filt === 'issues' ? 'No parts have open issues right now.' : 'Nothing matches. Try "gecko" or a part number like 3613.'}</p>`);
  };
  draw();
  Promise.all([api.list('issue'), api.list('inventory')]).then(([is, inv]) => {
    if (!alive) return;
    issues = is;
    spares = new Map();
    for (const r of inv) { if (r.data.type === 'request' || !r.data.name) continue; const k = String(r.data.name).toLowerCase(); spares.set(k, (spares.get(k) || 0) + Math.max(0, +r.data.count || 0)); }
    draw();
  }).catch((err) => { if (alive) fail(ctx, err); });
  $('#bomF').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filt = b.dataset.f; $$('#bomF .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); draw(); });
  $('#bomQ').addEventListener('input', (e) => { q = e.target.value; draw(); });
  $('#bom').addEventListener('click', (e) => {
    const b = e.target.closest('[data-part]'); if (b) { ctx.focusPart(b.dataset.part); return; }
    const i = e.target.closest('[data-iss]'); if (i) issueDrawer(ctx, { part: i.dataset.iss, sys: i.dataset.sys, issues, onChange: draw });
  });
  return () => { alive = false; closeDrawer(); };
}

// ---------------------------------------------------------------- AR and VR
function arvr(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip('See the robot at real size in your room on a phone, or step inside your BioBuzz XR twin on a Quest 3.', [tag('Planned · tested on your phones first')])}
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2 volt">${icon('camera', 'i sm')}</span><h3 class="card-title">View in your room</h3></div>
      <p>Place the StarterBot on the floor at its real size, 45 cm across, and walk around it. Great for checking how big a new part will be.</p>
      <ol class="bul"><li>Open the Robot zone on your phone or tablet.</li><li>Tap <b>View in your room</b> and point the camera at the floor.</li><li>Drag to move it, pinch to turn it. It stays at real size.</li></ol>
      <div class="callout" style="background:var(--raised);color:var(--text)">${icon('alert')}<div>A 28-million-triangle model is heavy for phone AR. The full model gets tested on your phones first; if it struggles, AR uses a separate copy labeled "AR copy", or AR stays off if you'd rather have no simplified copy anywhere.</div></div>
      <div class="card-foot"><span class="cap" id="arResult">Checks what this device supports.</span><button class="btn primary pill" type="button" id="arCheck">${icon('camera', 'i sm')}Try on this device</button></div>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2 solid">${icon('gamepad', 'i sm')}</span><h3 class="card-title">Quest 3 XR twin</h3><span class="tag">Needs the twin's link</span></div>
      <p>Your BioBuzz digital twin runs in the Quest browser for headset sessions: drive the robot on the field at full scale and watch your code run.</p>
      <ul class="checks">
        <li><span class="ci ok">${icon('check')}</span>Same full-fidelity robot as the Hub</li>
        <li><span class="ci ok">${icon('check')}</span>Gamepads and Quest controllers both drive it</li>
        <li><span class="ci todo"></span>Waiting on where the twin's code lives, so the Hub can link it</li>
      </ul>
      <h4 class="sub">Headset rules</h4>
      <ul class="bul"><li>Clear floor space and a mentor in the room.</li><li>Turns of 15 minutes, then pass it on.</li><li>Feel dizzy? Take it off and sit down. That's always OK.</li></ul>
      <div class="card-foot"><span class="cap">The headset opens the twin; no account on the headset needed.</span><button class="btn ghost pill" type="button" id="questBtn">${icon('arrow', 'i sm')}Open on Quest</button></div>
    </article>
  </div>`;
  $('#arCheck').addEventListener('click', async () => {
    const out = $('#arResult');
    out.textContent = 'Checking…';
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let xr = false;
    try { xr = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { xr = false; }
    out.textContent = xr ? 'This device supports WebXR AR, so "View in your room" can run here.'
      : ios ? 'iPhones and iPads use AR Quick Look, which needs a USDZ copy of the robot. That copy gets tested first.'
        : 'No AR on this device. Open the Hub on a phone or tablet to place the robot in your room.';
  });
  $('#questBtn').addEventListener('click', () => ctx.toast('Once the twin is linked, this opens it in the Quest browser. Tell us where its code lives.'));
}

export const ROBOT = { '3D Explorer': explorer, Versions: versions, Subsystems: subsystems, 'Specs and parts': specs, 'AR and VR': arvr };
